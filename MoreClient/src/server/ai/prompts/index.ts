import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

const promptsDir = join(process.cwd(), "src/server/ai/prompts");

const cache = new Map<string, { content: string; version: string }>();

/**
 * Load a versioned prompt from the prompts directory.
 * Returns the content and a 12-char sha256 version for tracing.
 */
export function loadPrompt(name: string): { content: string; version: string } {
  if (cache.has(name)) return cache.get(name)!;

  let content: string;
  try {
    content = readFileSync(join(promptsDir, `${name}.txt`), "utf-8").trim();
  } catch {
    throw new Error(`Prompt "${name}" not found in ${promptsDir}`);
  }

  const version = createHash("sha256").update(content).digest("hex").slice(0, 12);
  const entry = { content, version };
  cache.set(name, entry);
  return entry;
}

/** Interpolate {{variables}} in a prompt string. */
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}
