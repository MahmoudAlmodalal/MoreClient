import { AppError } from "@/server/core/errors";
import { z } from "zod";

// ─── Prompt injection pattern list ───────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /forget\s+your\s+(system\s+)?prompt/i,
  /disregard\s+(the\s+)?(above|previous|prior)/i,
  /act\s+as\s+(if\s+you\s+are\s+)?a?n?\s*(different|evil|unrestricted|uncensored|DAN|jailbreak)/i,
  /you\s+are\s+now\s+(in\s+)?developer\s+mode/i,
  /\[INST\]|\[\/INST\]|<<SYS>>|<\/s>/i,
  /do\s+anything\s+now\s+mode/i,
  /bypass\s+(your\s+)?(safety|filter|restriction|content\s+policy)/i,
  /print\s+(the\s+)?(system\s+)?prompt/i,
  /reveal\s+(your\s+)?(instructions|system\s+prompt)/i,
];

const MAX_INPUT_TOKENS_ESTIMATE = 4000; // ~16000 chars conservative estimate

/**
 * Layer 1: Pre-scan user input before sending to any AI model.
 * Throws if prompt injection is detected.
 */
export function scanUserInput(input: string): void {
  if (input.length > MAX_INPUT_TOKENS_ESTIMATE * 4) {
    throw new AppError("UNPROCESSABLE", "Input is too long", 422);
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      throw new AppError("UNPROCESSABLE", "Your message contains content that cannot be processed", 422);
    }
  }
}

/**
 * Layer 2: Context wrapping — inject role boundary markers
 * so models clearly distinguish system prompt from user data.
 */
export function wrapUserContent(content: string, role: "profile" | "message" | "job"): string {
  const boundary = `--- BEGIN USER ${role.toUpperCase()} CONTENT ---`;
  const endBoundary = `--- END USER ${role.toUpperCase()} CONTENT ---`;
  return `${boundary}\n${content}\n${endBoundary}`;
}

/**
 * Layer 3: Output filter — scan AI response for dangerous patterns
 * (data exfiltration attempts, reversed injection).
 */
const OUTPUT_DANGER_PATTERNS = [
  /my\s+system\s+prompt\s+is/i,
  /i\s+was\s+(told|instructed|asked)\s+to/i,
  /<script[\s>]/i,
  /javascript:/i,
  /on\w+\s*=\s*["']/i,
];

export function filterAiOutput(output: string): string {
  for (const pattern of OUTPUT_DANGER_PATTERNS) {
    if (pattern.test(output)) {
      return "[Response filtered due to content policy]";
    }
  }
  return output;
}

/**
 * Layer 4: Zod-validated structured output — use when asking AI for JSON.
 * Pass the expected schema and the raw AI output string.
 */
export function parseAiJsonOutput<T>(
  rawOutput: string,
  schema: z.ZodSchema<T>,
): T {
  // Strip markdown code fences if present
  const cleaned = rawOutput
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AppError("INTERNAL", "AI returned malformed JSON output", 500);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new AppError("INTERNAL", "AI output failed validation", 500);
  }

  return result.data;
}
