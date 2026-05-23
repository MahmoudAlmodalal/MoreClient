import Anthropic from "@anthropic-ai/sdk";

function createAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export const anthropicClient = createAnthropicClient();

export function requireAnthropic(): Anthropic {
  if (!anthropicClient) throw new Error("ANTHROPIC_API_KEY is not configured");
  return anthropicClient;
}
