import { requireOpenAI } from "@/server/core/ai/openai";
import { prisma } from "@/server/core/db";
import { logger } from "@/server/core/logger";
import { loadPrompt, interpolate } from "./prompts/index";
import { generateId } from "@/server/core/ids";
import { getKeywordBlocklist } from "@/server/core/feature-flags";
import type { ModerationStatus } from "@prisma/client";

/** Create the system auto-report opened when moderation blocks a message. */
async function openAutoReport(messageId: string, reason: string): Promise<void> {
  await prisma.report.create({
    data: {
      id: generateId(),
      reporterType: "system",
      reporterId: "ai-moderation",
      targetType: "message",
      targetMessageId: messageId,
      category: "inappropriate",
      description: `Auto-flagged by AI moderation: ${reason}`,
      status: "open",
    },
  });
}

/** Find the first configured blocklist term present in the message body. */
function matchBlocklistTerm(body: string, terms: string[]): string | null {
  const lower = body.toLowerCase();
  return terms.find((term) => lower.includes(term)) ?? null;
}

interface ModerationDecision {
  decision: "approved" | "flagged" | "blocked";
  confidence: number;
  reason: string;
  categories: string[];
}

export async function moderateMessage(messageId: string): Promise<ModerationDecision | null> {
  const openai = requireOpenAI();

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, body: true, threadId: true, senderId: true, senderType: true },
  });

  if (!message) {
    logger.warn({ messageId }, "message not found for moderation");
    return null;
  }

  // Step 0: admin-configured keyword blocklist (cheap, deterministic, runs first).
  try {
    const blocklist = await getKeywordBlocklist();
    if (blocklist) {
      const hit = matchBlocklistTerm(message.body, blocklist.terms);
      if (hit) {
        const blocked = blocklist.action === "block";
        const status: ModerationStatus = blocked ? "blocked" : "flagged";
        const reason = `Matched blocked keyword "${hit}"`;
        await prisma.message.update({
          where: { id: messageId },
          data: { moderationStatus: status, moderationReason: reason },
        });
        if (blocked) await openAutoReport(messageId, reason);
        logger.info({ messageId, hit, action: blocklist.action }, "keyword blocklist matched");
        return { decision: status, confidence: 1, reason, categories: ["keyword_blocklist"] };
      }
    }
  } catch (err) {
    logger.warn({ messageId, err }, "keyword blocklist check failed");
  }

  // Step 1: OpenAI omni-moderation
  let flagged = false;
  let moderationFlags: Record<string, boolean> = {};

  try {
    const modResult = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: message.body,
    });
    const result = modResult.results[0];
    if (result) {
      flagged = result.flagged;
      moderationFlags = result.categories as unknown as Record<string, boolean>;
    }
  } catch (err) {
    logger.warn({ messageId, err }, "omni-moderation failed, defaulting to approved");
    await prisma.message.update({
      where: { id: messageId },
      data: { moderationStatus: "approved" },
    });
    return { decision: "approved", confidence: 0.5, reason: "moderation service unavailable", categories: ["safe"] };
  }

  if (!flagged) {
    await prisma.message.update({
      where: { id: messageId },
      data: { moderationStatus: "approved" },
    });
    return { decision: "approved", confidence: 0.99, reason: "passed automated moderation", categories: ["safe"] };
  }

  // Step 2: LLM judge for flagged messages
  const { content, version } = loadPrompt("moderation-judge");
  const activeFlags = Object.entries(moderationFlags)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const systemPrompt = interpolate(content, {
    message: message.body,
    moderationFlags: activeFlags.join(", ") || "none",
  });

  logger.info({ messageId, flags: activeFlags, promptVersion: version }, "running LLM moderation judge");

  let decision: ModerationDecision;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Make the final moderation decision." },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 300,
    });

    const raw = response.choices[0]?.message.content;
    decision = raw ? JSON.parse(raw) : { decision: "flagged", confidence: 0.5, reason: "parse error", categories: [] };
  } catch {
    decision = { decision: "flagged", confidence: 0.5, reason: "LLM judge failed", categories: [] };
  }

  const moderationStatus: ModerationStatus =
    decision.decision === "approved" ? "approved" : decision.decision === "blocked" ? "blocked" : "flagged";

  await prisma.message.update({
    where: { id: messageId },
    data: {
      moderationStatus,
      moderationReason: decision.reason,
    },
  });

  // Auto-open a Report if the message is blocked
  if (decision.decision === "blocked") {
    await openAutoReport(messageId, decision.reason);
  }

  logger.info({ messageId, decision: decision.decision, confidence: decision.confidence }, "moderation complete");
  return decision;
}
