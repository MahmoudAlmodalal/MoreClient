import OpenAI from "openai";
import { createOpenAI } from "@ai-sdk/openai";

function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export const openaiClient = createOpenAIClient();

/** Vercel AI SDK provider — for streamText / generateObject */
export const openaiProvider = process.env.OPENAI_API_KEY
  ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/** Require OpenAI client or throw a clear error. */
export function requireOpenAI(): OpenAI {
  if (!openaiClient) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return openaiClient;
}
