/**
 * Client-side fetch helpers for the Python FastAPI backend (cross-origin on
 * :8000). Errors come back as RFC 7807 problem+json; we surface `detail`
 * (or `title`) as the thrown Error message. Mirrors the shape of the admin
 * api.ts but prefixes every request with NEXT_PUBLIC_API_URL.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseError(res: Response): Promise<never> {
  let message = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    message = body?.detail || body?.title || message;
  } catch {
    /* non-json body */
  }
  throw new ApiError(message, res.status);
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) return parseError(res);
  return res.json() as Promise<T>;
}

export async function apiSend<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE" | "PATCH",
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) return parseError(res);
  return res.json() as Promise<T>;
}

/** Multipart upload. Do NOT set Content-Type — the browser sets the boundary. */
export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE}${path}`, { method: "POST", body: fd });
  if (!res.ok) return parseError(res);
  return res.json() as Promise<T>;
}

// ─── Response types (mirror backend/schemas/*) ──────────────────────────────

export type ChatResponse = {
  reply: string;
  sender: "bot" | "human";
  escalate: boolean;
  confidence: number;
  language: "en" | "ar";
};

export type UploadResponse = { file: string; chunks: number; status: string };

export type FileOut = {
  id: number;
  name: string;
  size: string;
  type: string;
  chunks: number;
  date: string;
  status: string;
};

export type AnalyticsResponse = {
  kpis: {
    total_questions: number;
    deflection_rate: number;
    cost_savings: number;
    feedback_score: number;
  };
  top_questions: { name: string; count: number }[];
  channel_distribution: { name: string; value: number }[];
  unanswered: {
    id: number;
    question: string;
    channel: string;
    language: string;
    confidence: number;
    timeAgo: string;
  }[];
};

export type HandoffMessage = { id: string; role: string; content: string; time: string };

export type HandoffOut = {
  id: number;
  user: string;
  channel: string;
  reason: string;
  language: string;
  timeAgo: string;
  unreplied: boolean;
  messages: HandoffMessage[];
  metadata: Record<string, unknown>;
};

export type SettingsOut = {
  companyName: string;
  botName: string;
  companyLogo: string;
  botTone: string;
  systemPromptExtra: string;
  telegramToken: string | null;
  isTelegramActive: boolean;
  twilioSid: string | null;
  twilioToken: string | null;
  twilioNumber: string | null;
  isWhatsappActive: boolean;
  subscriptionPlan: string;
  usedMessages: number;
  confidenceThreshold: number;
};
