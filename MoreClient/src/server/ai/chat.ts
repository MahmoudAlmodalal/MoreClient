import { streamText } from "ai";
import { openaiProvider, requireOpenAI } from "@/server/core/ai/openai";
import { embedQuery } from "./embedding";
import { getPineconeIndex, PINECONE_NAMESPACES as PN } from "@/server/core/ai/pinecone";
import { requireCohere, COHERE_RERANK_MODEL } from "@/server/core/ai/cohere";
import { prisma } from "@/server/core/db";
import { loadPrompt, interpolate } from "./prompts/index";
import { logger } from "@/server/core/logger";
import { AppError } from "@/server/core/errors";
import { scanUserInput, wrapUserContent, filterAiOutput } from "./guards";
import type { PrincipalContext } from "@/server/core/auth";
import { z } from "zod";

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  locale: z.enum(["en", "ar"]).default("en"),
  sessionId: z.string().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

const KB_TOP_K = 5;

async function retrieveKBContext(query: string, locale: "en" | "ar"): Promise<string> {
  try {
    const index = getPineconeIndex();
    const namespace = locale === "ar" ? PN.kbAr : PN.kbEn;
    const ns = index.namespace(namespace);

    const queryVector = await embedQuery(query);
    const result = await ns.query({ vector: queryVector, topK: KB_TOP_K, includeMetadata: true });

    if (!result.matches?.length) return "No relevant knowledge base content found.";

    const documents = result.matches.map((m) => m.id);
    const cohere = requireCohere();
    const reranked = await cohere.rerank({
      model: COHERE_RERANK_MODEL,
      query,
      documents,
      topN: 3,
      returnDocuments: false,
    });

    const topDocs = reranked.results.map((r) => {
      const match = result.matches[r.index];
      const title = (match?.metadata?.title as string) ?? "Knowledge Base";
      const content = (match?.metadata?.content as string) ?? "";
      return `[source: ${title}]\n${content}`;
    });

    return topDocs.join("\n\n---\n\n");
  } catch {
    return "Knowledge base unavailable.";
  }
}

async function moderateInput(text: string): Promise<void> {
  const openai = requireOpenAI();
  try {
    const result = await openai.moderations.create({ model: "omni-moderation-latest", input: text });
    if (result.results[0]?.flagged) {
      throw new AppError("UNPROCESSABLE", "Your message was flagged by content moderation", 422);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    // Moderation API unavailable — allow the message through
  }
}

export async function createChatStream(
  ctx: PrincipalContext,
  request: ChatRequest,
): Promise<Response> {
  if (!openaiProvider) {
    throw new AppError("SERVICE_UNAVAILABLE", "AI chat is not configured", 503);
  }

  // Layer 1: Prompt injection pre-scan
  scanUserInput(request.message);

  // Layer 2: OpenAI moderation
  await moderateInput(request.message);

  // RAG context retrieval
  const kbContext = await retrieveKBContext(request.message, request.locale);

  const { content: systemTemplate } = loadPrompt("chat-system");
  const systemContent = interpolate(systemTemplate, { kbContext });

  // Usage tracking
  const principalId = ctx.type === "company" ? ctx.company.id : ctx.type === "talent" ? ctx.talent.id : null;
  const principalType = ctx.type === "company" ? "company" : ctx.type === "talent" ? "talent" : null;

  logger.info({ principalType, principalId, locale: request.locale }, "chat stream started");

  // Layer 2 (context wrap): isolate user message inside role boundaries
  const wrappedMessage = wrapUserContent(request.message, "message");

  const { textStream } = await streamText({
    model: openaiProvider("gpt-4o-mini"),
    system: systemContent,
    messages: [{ role: "user", content: wrappedMessage }],
    maxTokens: 800,
    temperature: 0.3,
  });

  // Update AI token counters (best-effort, async)
  if (principalId && principalType) {
    const periodStart = new Date();
    periodStart.setUTCDate(1);
    periodStart.setUTCHours(0, 0, 0, 0);

    prisma.usageCounter
      .upsert({
        where: {
          principalType_principalId_periodStart: {
            principalType: principalType as "company" | "talent",
            principalId,
            periodStart,
          },
        },
        create: {
          principalType: principalType as "company" | "talent",
          principalId,
          periodStart,
          aiChatTokensInput: 1,
        },
        update: { aiChatTokensInput: { increment: 1 } },
      })
      .catch(() => {});
  }

  // Layer 4: filter each streamed chunk server-side for reverse injection patterns.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const outputFilterStream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const text = decoder.decode(chunk, { stream: true });
      const filtered = filterAiOutput(text);
      controller.enqueue(encoder.encode(filtered));
    },
    flush(controller) {
      const remaining = decoder.decode();
      if (remaining) {
        controller.enqueue(encoder.encode(filterAiOutput(remaining)));
      }
    },
  });

  const rawStream = textStream as unknown as ReadableStream<Uint8Array>;
  const filteredStream = rawStream.pipeThrough(outputFilterStream);

  return new Response(filteredStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
