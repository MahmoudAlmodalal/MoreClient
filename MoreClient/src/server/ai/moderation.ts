import { requireOpenAI } from "@/server/core/ai/openai";
import { prisma } from "@/server/core/db";
import { logger } from "@/server/core/logger";
import { loadPrompt, interpolate } from "./prompts/index";
import { generateId } from "@/server/core/ids";
import type { ModerationStatus } from "@prisma/client";

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
    await prisma.report.create({
      data: {
        id: generateId(),
        reporterType: "system",
        reporterId: "ai-moderation",
        targetType: "message",
        targetMessageId: messageId,
        category: "inappropriate",
        description: `Auto-flagged by AI moderation: ${decision.reason}`,
        status: "open",
      },
    });
  }

  logger.info({ messageId, decision: decision.decision, confidence: decision.confidence }, "moderation complete");
  return decision;
}
