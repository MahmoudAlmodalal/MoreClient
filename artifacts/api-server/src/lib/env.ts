import { randomBytes } from "node:crypto";

// Centralized env access for the API server.
// JWT_SECRET and ADMIN_API_KEY: use env vars in production.
// In development (NODE_ENV=development), fall back to per-process random bytes
// so secrets are never predictable but the server still starts without config.
function requireSecret(name: string, devFallback: string): string {
  const val = process.env[name];
  if (val) return val;
  if (process.env["NODE_ENV"] !== "production") return devFallback;
  // Production: emit a loud warning but continue with a random ephemeral secret
  // rather than crashing. Operators should always set these via env.
  const fallback = randomBytes(32).toString("hex");
  console.warn(
    `[WARN] ${name} is not set in production. Using a random ephemeral value — ` +
      `all existing tokens will be invalidated on restart. Set ${name} in your environment.`,
  );
  return fallback;
}

// Per-process random values used only when env vars are absent (dev only).
const _jwtDevDefault = randomBytes(32).toString("hex");
const _adminDevDefault = randomBytes(16).toString("hex");

export const JWT_SECRET = requireSecret("JWT_SECRET", _jwtDevDefault);
export const ADMIN_API_KEY = requireSecret("ADMIN_API_KEY", _adminDevDefault);
export const JWT_TTL_SECONDS = 60 * 60 * 24; // 24h
export const PORT = Number(process.env["PORT"] || 5000);

// Optional AI integration credentials. Keyless mode is supported throughout.
export const OPENAI_API_KEY = process.env["OPENAI_API_KEY"] || "";
export const OPENAI_BASE_URL =
  process.env["OPENAI_BASE_URL"] || "https://api.openai.com/v1";
export const GEMINI_API_KEY = process.env["GEMINI_API_KEY"] || "";
export const GEMINI_BASE_URL =
  process.env["GEMINI_BASE_URL"] ||
  "https://generativelanguage.googleapis.com/v1beta";

export function hasLlm(): boolean {
  return Boolean(OPENAI_API_KEY || GEMINI_API_KEY);
}
