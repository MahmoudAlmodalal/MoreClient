import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db, conversations, messages, handoffs, tenants, settings } from "../lib/db";
import { hybridSearch, confidenceFrom } from "../lib/retrieval";
import { detectLanguage, classifyIntent } from "../lib/lang";
import { llmComplete } from "../lib/llm";
import { broadcastDashboard } from "../lib/ws";

const router: IRouter = Router();

// ── Signature helpers ────────────────────────────────────────────────────────

/**
 * Validate Telegram webhook secret token.
 * When a webhook is registered with `secret_token`, Telegram sends it as the
 * X-Telegram-Bot-Api-Secret-Token header.  We only enforce it when configured.
 */
function verifyTelegramSignature(req: import("express").Request, secret: string | null): boolean {
  if (!secret) return true; // not configured — allow (dev / uncredentialed env)
  const header = (req.headers["x-telegram-bot-api-secret-token"] as string | undefined) || "";
  const maxLen = Math.max(Buffer.byteLength(header), Buffer.byteLength(secret));
  const a = Buffer.alloc(maxLen);
  const b = Buffer.alloc(maxLen);
  a.write(header);
  b.write(secret);
  return timingSafeEqual(a, b);
}

/**
 * Validate Twilio webhook signature.
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 * Signature = base64( HMAC-SHA1( authToken, url + sorted params ) )
 * Only enforced when the authToken is set in tenant settings.
 */
function verifyTwilioSignature(
  req: import("express").Request,
  authToken: string | null,
): boolean {
  if (!authToken) return true;
  const sig = (req.headers["x-twilio-signature"] as string | undefined) || "";
  if (!sig) return false;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["host"] || "localhost";
  const url = `${proto}://${host}${req.originalUrl}`;
  const body = (req.body ?? {}) as Record<string, string>;
  const sorted = Object.keys(body)
    .sort()
    .reduce((acc, k) => acc + k + body[k], "");
  const expected = createHmac("sha1", authToken)
    .update(url + sorted)
    .digest("base64");
  const maxLen = Math.max(Buffer.byteLength(sig), Buffer.byteLength(expected));
  const a = Buffer.alloc(maxLen);
  const b = Buffer.alloc(maxLen);
  a.write(sig);
  b.write(expected);
  return timingSafeEqual(a, b);
}

// ── Shared ingest pipeline ───────────────────────────────────────────────────

// Shared ingest pipeline — matches the /api/chat escalation logic exactly
// (language detect, intent classify, hybrid RAG, LLM, handoff on human_request
// / complaint / low_confidence) so channel behaviour is consistent.
async function ingest(opts: {
  tenantKey: string;
  channel: "telegram" | "whatsapp";
  customerRef: string;
  message: string;
}) {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantKey, opts.tenantKey)).limit(1);
  if (!tenant) return null;
  const [settingsRow] = await db.select().from(settings).where(eq(settings.tenantId, tenant.id)).limit(1);

  let [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.tenantId, tenant.id),
        eq(conversations.customerRef, opts.customerRef),
        eq(conversations.channel, opts.channel),
      ),
    )
    .limit(1);
  const language = detectLanguage(opts.message);
  if (!conv) {
    const [created] = await db
      .insert(conversations)
      .values({
        tenantId: tenant.id,
        customerRef: opts.customerRef,
        channel: opts.channel,
        language,
      })
      .returning();
    conv = created;
  } else if (!conv.language) {
    await db.update(conversations).set({ language }).where(eq(conversations.id, conv.id));
    conv.language = language;
  }
  await db.insert(messages).values({ conversationId: conv.id, role: "user", content: opts.message });

  const threshold = settingsRow?.confidenceThreshold ?? 0.55;
  const intent = classifyIntent(opts.message);
  const retrieved = await hybridSearch(tenant.id, opts.message, 5);
  const confidence = confidenceFrom(retrieved);

  let answer: string;
  if (retrieved.length === 0) {
    answer =
      language === "ar"
        ? "لا توجد لدي معلومات كافية حالياً. سأقوم بتحويلك إلى موظف بشري."
        : "Thanks — a human agent will get back to you shortly.";
  } else {
    const context = retrieved.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n");
    const sysPrompt = `You are ${settingsRow?.botName || "a helpful assistant"} for ${
      settingsRow?.companyName || tenant.name
    }. Tone: ${settingsRow?.botTone || "friendly"}.
Answer concisely using only the provided context. Respond in ${language === "ar" ? "Arabic" : "English"}.`;
    const llm = await llmComplete([
      { role: "system", content: sysPrompt },
      { role: "user", content: `Context:\n${context}\n\nQuestion: ${opts.message}` },
    ]);
    if (llm) {
      answer = llm;
    } else {
      // Build a coherent fallback (first 1-2 sentences from the top chunk)
      // instead of dumping mid-paragraph content to the channel.
      const clean = retrieved[0].content.replace(/\s+/g, " ").trim();
      const sentences = clean.match(/[^.!?؟]+[.!?؟]+\s?/g) || [clean];
      const excerpt = sentences.slice(0, 2).join(" ").trim().slice(0, 500);
      answer = language === "ar" ? `من قاعدة المعرفة: ${excerpt}` : `From your knowledge base: ${excerpt}`;
    }
  }

  const shouldEscalate =
    intent === "human_request" ||
    (intent === "complaint" && (settingsRow?.autoHandoffOnComplaint ?? true)) ||
    confidence < threshold;

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
        channel: opts.channel,
        reason,
        question: opts.message,
        language: conv.language || language,
      })
      .returning();
    broadcastDashboard(tenant.id, {
      type: "handoff.created",
      data: {
        id: h.id,
        conversationId: conv.id,
        channel: opts.channel,
        reason,
        question: opts.message,
        createdAt: h.createdAt.toISOString(),
      },
    });
  }

  await db.insert(messages).values({
    conversationId: conv.id,
    role: "assistant",
    content: answer,
    confidence,
  });
  return { answer, confidence, escalate: shouldEscalate };
}

// ── Route handlers ───────────────────────────────────────────────────────────

router.post("/telegram/webhook", async (req, res) => {
  const tenantKey = (req.query["tenantKey"] as string | undefined)?.trim() || "";
  if (!tenantKey) {
    return res.status(400).json({ ok: false, detail: "tenantKey query param is required" });
  }

  // Load tenant settings to check for a configured webhook secret.
  const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantKey, tenantKey)).limit(1);
  if (!tenant) {
    return res.status(400).json({ ok: false, detail: `Unknown tenantKey: ${tenantKey}` });
  }
  {
    const [settingsRow] = await db
      .select()
      .from(settings)
      .where(eq(settings.tenantId, tenant.id))
      .limit(1);
    // telegramWebhookSecret is the per-tenant secret registered with Telegram.
    const secret = (settingsRow as unknown as Record<string, string | null>)["telegramWebhookSecret"] ?? null;
    if (!verifyTelegramSignature(req, secret)) {
      return res.status(403).json({ ok: false, detail: "Invalid signature" });
    }
  }

  const update = req.body ?? {};
  const msg = update.message;
  if (!msg?.text || !msg?.chat?.id) return res.json({ ok: true });

  // Re-load settings so we have the token handy for the reply (ingest loads
  // them internally too, but we need the token after ingest returns).
  const [settingsForReply] = await db
    .select()
    .from(settings)
    .where(eq(settings.tenantId, tenant.id))
    .limit(1);

  const result = await ingest({
    tenantKey,
    channel: "telegram",
    customerRef: String(msg.chat.id),
    message: String(msg.text),
  });

  // Send the AI-generated reply back to the user in the same Telegram chat.
  if (result && settingsForReply?.telegramToken && settingsForReply?.isTelegramActive) {
    let deliveryStatus: "delivered" | "failed" = "failed";
    let deliveryDetail: string | null = null;
    try {
      const tgRes = await fetch(
        `https://api.telegram.org/bot${settingsForReply.telegramToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: msg.chat.id, text: result.answer }),
        },
      );
      if (tgRes.ok) {
        deliveryStatus = "delivered";
      } else {
        deliveryDetail = await tgRes.text().catch(() => String(tgRes.status));
        console.warn(`[telegram] sendMessage failed: ${deliveryDetail}`);
      }
    } catch (err) {
      // Log but do not rethrow — Telegram must receive { ok: true } or it will
      // keep retrying the webhook indefinitely.
      deliveryDetail = (err as Error).message;
      console.warn("[telegram] sendMessage error:", deliveryDetail);
    }
    // Persist delivery status so operators can see it in Settings.
    await db
      .update(settings)
      .set({
        telegramLastDeliveryStatus: deliveryStatus,
        telegramLastDeliveryDetail: deliveryDetail,
        telegramLastDeliveryAt: new Date(),
      })
      .where(eq(settings.tenantId, tenant.id));
  }

  return res.json({ ok: true });
});

router.post("/whatsapp/webhook", async (req, res) => {
  const tenantKey = (req.query["tenantKey"] as string | undefined)?.trim() || "";
  if (!tenantKey) {
    return res.status(400).type("text/xml").send("<Response></Response>");
  }

  // Load Twilio auth token to validate signature when configured.
  const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantKey, tenantKey)).limit(1);
  if (!tenant) {
    return res.status(400).type("text/xml").send("<Response></Response>");
  }
  {
    const [settingsRow] = await db
      .select()
      .from(settings)
      .where(eq(settings.tenantId, tenant.id))
      .limit(1);
    const authToken = settingsRow?.twilioToken ?? null;
    if (!verifyTwilioSignature(req, authToken)) {
      return res.status(403).type("text/xml").send("<Response></Response>");
    }
  }

  // Twilio sends form-urlencoded fields.
  const from = (req.body?.From || "").toString().replace(/^whatsapp:/, "");
  const body = (req.body?.Body || "").toString();
  if (!from || !body) return res.json({ ok: true });
  await ingest({ tenantKey, channel: "whatsapp", customerRef: from, message: body });
  return res.status(200).type("text/xml").send("<Response></Response>");
});

export default router;
