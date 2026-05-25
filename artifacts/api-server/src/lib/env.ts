import { randomBytes } from "node:crypto";

// Centralized env access for the API server.
// JWT_SECRET and ADMIN_API_KEY: use env vars in production.
// In development (NODE_ENV=development), fall back to per-process random bytes
// so secrets are never predictable but the server still starts without config.
function requireSecret(name: string, devFallback: string): string {
  const val = process.env[name];
  if (val) return val;
  if (process.env["NODE_ENV"] === "production") {
    throw new Error(
      `${name} is required in production. Set ${name} in your environment before starting the server.`,
    );
  }
  console.warn(
    `[WARN] ${name} is not set. Using an ephemeral dev value — all tokens will be invalidated on restart.`,
  );
  return devFallback;
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

// Public-facing API URL for building absolute callback URLs (e.g. Telegram
// setWebhook).  In production set this to your deployed domain, e.g.
// "https://my-app.replit.app/api".  Omit the trailing slash.
// If unset, auto-registration of the Telegram webhook is skipped.
export const PUBLIC_API_URL = (process.env["PUBLIC_API_URL"] || "").replace(/\/$/, "");

export function hasLlm(): boolean {
  return Boolean(OPENAI_API_KEY || GEMINI_API_KEY);
}
