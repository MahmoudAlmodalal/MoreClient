import { Router, type IRouter } from "express";
import { and, eq, gt, asc } from "drizzle-orm";
import { db, conversations, messages, handoffs } from "../lib/db";
import { findTenantByKey } from "../lib/tenant";
import { hybridSearch, confidenceFrom } from "../lib/retrieval";
import { classifyIntent, detectLanguage } from "../lib/lang";
import { llmComplete } from "../lib/llm";
import { broadcastDashboard } from "../lib/ws";
import { buildAnalytics } from "./analytics";
import { getSettings } from "../lib/tenant";

const router: IRouter = Router();

// Public chat endpoint — anonymous. Identifies tenant via tenantKey in body.
router.post("/chat", async (req, res) => {
  const sessionId = (req.body?.session_id || req.body?.sessionId || "").toString();
  const message = (req.body?.message || "").toString().trim();
  const channel = (req.body?.channel || "web").toString();
  const tenantKey = (req.body?.tenantKey || req.body?.tenant_key || "").toString().trim();
  if (!sessionId || !message) {
    return res.status(400).json({ detail: "session_id and message required" });
  }
  if (!tenantKey) {
    return res.status(400).json({ detail: "tenantKey is required" });
  }

  const tenant = await findTenantByKey(tenantKey);
  if (!tenant) return res.status(400).json({ detail: `Unknown tenantKey: ${tenantKey}` });

  // get-or-create conversation
  let [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.tenantId, tenant.id),
        eq(conversations.customerRef, sessionId),
        eq(conversations.channel, channel),
      ),
    )
    .limit(1);
  const language = detectLanguage(message);
  if (!conv) {
    const [created] = await db
      .insert(conversations)
      .values({
        tenantId: tenant.id,
        customerRef: sessionId,
        channel,
        language,
      })
      .returning();
    conv = created;
  } else if (!conv.language) {
    await db.update(conversations).set({ language }).where(eq(conversations.id, conv.id));
    conv.language = language;
  }

  await db.insert(messages).values({
    conversationId: conv.id,
    role: "user",
    content: message,
  });

  const settingsRow = await getSettings(tenant.id);
  const threshold = settingsRow?.confidenceThreshold ?? 0.55;

  const intent = classifyIntent(message);
  const retrieved = await hybridSearch(tenant.id, message, 5);
  const confidence = confidenceFrom(retrieved);

  let answer: string;
  let usedLlm = false;
  let fallback: string | null = null;
  if (retrieved.length === 0) {
    answer =
      conv.language === "ar"
        ? "لا توجد لدي معلومات كافية حالياً. سأقوم بتحويلك إلى موظف بشري."
        : "I don't have enough information yet. Let me connect you to a human agent.";
    fallback = "no_context";
  } else {
    const context = retrieved.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n");
    const sysPrompt = `You are ${settingsRow?.botName || "a helpful assistant"} for ${
      settingsRow?.companyName || tenant.name
    }. Tone: ${settingsRow?.botTone || "friendly"}. ${settingsRow?.systemPromptExtra || ""}
Answer concisely using only the provided context. If the context is insufficient, say so.
Respond in ${conv.language === "ar" ? "Arabic" : "English"}.`;
    const llmAnswer = await llmComplete([
      { role: "system", content: sysPrompt },
      { role: "user", content: `Context:\n${context}\n\nQuestion: ${message}` },
    ]);
    if (llmAnswer) {
      answer = llmAnswer;
      usedLlm = true;
    } else {
      answer = buildFallbackAnswer(retrieved[0].content, conv.language || language);
      fallback = "llm_unavailable";
    }
  }

  const lowConfidence = confidence < threshold;
  const shouldEscalate =
    intent === "human_request" ||
    (intent === "complaint" && (settingsRow?.autoHandoffOnComplaint ?? true)) ||
    lowConfidence;

  let createdHandoff: { id: number } | null = null;
  if (shouldEscalate) {
    const reason =
      intent === "human_request"
        ? "user_requested"
        : intent === "complaint"
          ? "complaint"
          : "low_confidence";
    const [h] = await db
      .insert(handoffs)
      .values({
        tenantId: tenant.id,
        conversationId: conv.id,
        channel,
        reason,
        question: message,
        language: conv.language || language,
      })
      .returning();
    createdHandoff = { id: h.id };
    broadcastDashboard(tenant.id, {
      type: "handoff.created",
      data: {
        id: h.id,
        conversationId: conv.id,
        channel,
        reason,
        question: message,
        createdAt: h.createdAt.toISOString(),
      },
    });
    // Push a fresh analytics snapshot so the dashboard updates live.
    buildAnalytics(tenant.id)
      .then((data) =>
        broadcastDashboard(tenant.id, {
          type: "analytics.snapshot",
          reason: "handoff.created",
          data,
        }),
      )
      .catch(() => {});
  }

  await db.insert(messages).values({
    conversationId: conv.id,
    role: "assistant",
    content: answer,
    confidence,
  });

  return res.json({
    // Primary shape per task spec.
    answer,
    confidence,
    handoff: createdHandoff,
    // `reply` is a backward-compat alias consumed by the existing web widget
    // (artifacts/clientmore/src/app/widget/page.tsx uses resp.reply).
    reply: answer,
    language: conv.language || language,
    escalate: shouldEscalate,
    sender: shouldEscalate ? "human" : "bot",
    usedLlm,
    fallback,
  });
});

// Build a coherent answer from the top retrieved chunk when the LLM is
// unavailable: take the first 1-2 sentences (so we don't dump mid-paragraph
// garbage) and wrap with a clear "from your knowledge base" preamble.
function buildFallbackAnswer(chunk: string, lang: string | null): string {
  const clean = chunk.replace(/\s+/g, " ").trim();
  const sentences = clean.match(/[^.!?؟]+[.!?؟]+\s?/g) || [clean];
  const excerpt = sentences.slice(0, 2).join(" ").trim().slice(0, 500);
  if (lang === "ar") {
    return `من قاعدة المعرفة: ${excerpt}`;
  }
  return `From your knowledge base: ${excerpt}`;
}

// Polled by the widget once escalated, to pick up agent replies streamed
// over /ws/chat/:sessionId for clients without a live socket.
router.get("/chat/:sessionId/agent-messages", async (req, res) => {
  const sessionId = req.params.sessionId;
  const tenantKey = (req.query["tenant_key"] as string | undefined)?.trim() || "";
  const afterId = Number(req.query["after_id"] || 0);
  if (!tenantKey) return res.status(400).json({ detail: "tenant_key is required" });
  const tenant = await findTenantByKey(tenantKey);
  if (!tenant) return res.status(400).json({ detail: `Unknown tenantKey: ${tenantKey}` });
  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.tenantId, tenant.id), eq(conversations.customerRef, sessionId)))
    .limit(1);
  if (!conv) return res.json([]);
  const rows = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conv.id),
        eq(messages.role, "agent"),
        gt(messages.id, afterId),
      ),
    )
    .orderBy(asc(messages.id));
  return res.json(
    rows.map((r) => ({
      id: r.id,
      role: r.role,
      content: r.content,
      time: r.createdAt.toISOString(),
    })),
  );
});

export default router;
