/**
 * Client-side fetch helpers for the Python FastAPI backend (cross-origin on
 * :8000). Errors come back as RFC 7807 problem+json; we surface `detail`
 * (or `title`) as the thrown Error message. Mirrors the shape of the admin
 * api.ts but prefixes every request with NEXT_PUBLIC_API_URL.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function joinBasePath(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

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

/** sessionStorage key holding the admin API key (set on the /admin gate). */
export const ADMIN_KEY_STORAGE = "adminKey";

/** JWT storage key */
export const JWT_TOKEN_STORAGE = "authToken";

/** Header carrying the admin key, when present. Sent only on admin requests. */
export function adminKeyHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const key = window.sessionStorage.getItem(ADMIN_KEY_STORAGE);
  return key ? { "X-Admin-Key": key } : {};
}

/** Header carrying the JWT token, when present. */
export function authHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.sessionStorage.getItem(JWT_TOKEN_STORAGE);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(joinBasePath(BASE, path), {
    headers: { Accept: "application/json", ...authHeader(), ...headers },
  });
  if (!res.ok) return parseError(res);
  return res.json() as Promise<T>;
}

export async function apiSend<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE" | "PATCH",
  body?: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  const res = await fetch(joinBasePath(BASE, path), {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeader(),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) return parseError(res);
  return res.json() as Promise<T>;
}

/** Multipart upload. Do NOT set Content-Type — the browser sets the boundary. */
export async function apiUpload<T>(path: string, file: File, headers?: Record<string, string>): Promise<T> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(joinBasePath(BASE, path), {
    method: "POST",
    headers: { ...authHeader(), ...headers },
    body: fd,
  });
  if (!res.ok) return parseError(res);
  return res.json() as Promise<T>;
}

// ─── Response types (mirror backend/schemas/*) ──────────────────────────────

export type AuthSessionOut = {
  token: string;
  userId: number;
  email: string;
  name: string | null;
  role: "admin" | "company";
  redirectTo: string;
  tenantKey: string | null;
};

export type ChatResponse = {
  reply: string;
  sender: "bot" | "human";
  escalate: boolean;
  confidence: number;
  language: "en" | "ar";
};

export type ChatMessageOut = {
  id: number;
  role: "user" | "assistant" | "agent";
  content: string;
  time: string;
};

export type UploadResponse = { file: string; chunks: number; status: string };

export type FileOut = {
  id: number;
  tenant_key: string;
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

export type AnalyticsSocketMessage = {
  type: "analytics.snapshot";
  reason: string;
  data: AnalyticsResponse;
};

export function createWebSocketUrl(path: string): string {
  const configured = process.env.NEXT_PUBLIC_WS_URL;
  if (configured) return joinBasePath(configured, path);

  try {
    const url = new URL(BASE);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return joinBasePath(url.toString(), path);
  } catch {
    if (typeof window !== "undefined") {
      const url = new URL(path, window.location.origin);
      url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      return url.toString();
    }
    return path;
  }
}

export function createAuthenticatedWebSocketUrl(path: string): string {
  const wsUrl = createWebSocketUrl(path);
  if (typeof window === "undefined") return wsUrl;
  const token = window.sessionStorage.getItem(JWT_TOKEN_STORAGE);
  if (!token) return wsUrl;
  const separator = wsUrl.includes("?") ? "&" : "?";
  return `${wsUrl}${separator}token=${token}`;
}

export type HandoffMessage = { id: string; role: string; content: string; time: string };

export type HandoffOrderMetadata = {
  id: number;
  productName: string | null;
  quantity: number | null;
  deliveryAddress: string | null;
  status: string;
  state: string;
  orderData: Record<string, unknown>;
};

export type HandoffOut = {
  id: number;
  user: string;
  channel: string;
  reason: string;
  language: string;
  timeAgo: string;
  unreplied: boolean;
  messages: HandoffMessage[];
  metadata: {
    customerRef?: string;
    order?: HandoffOrderMetadata;
    [key: string]: unknown;
  };
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
  purchaseFlowEnabled: boolean;
  purchaseCollectAddress: boolean;
  purchaseCollectQuantity: boolean;
  purchaseAutoForwardToSupport: boolean;
  purchaseConfirmationRequired: boolean;
  purchaseSessionMinutes: number;
  purchaseCurrencyLabel: string;
  intentLlmEnabled: boolean;
  intentConfidenceThreshold: number;
  autoHandoffOnComplaint: boolean;
};

export type PurchaseOrderOut = {
  id: number;
  conversationId: number;
  customerRef: string | null;
  productName: string | null;
  quantity: number | null;
  deliveryAddress: string | null;
  status: string;
  state: string;
  orderData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

// ─── Admin / Tenant types ───────────────────────────────────────────────────

export type TenantOut = {
  id: number;
  tenantKey: string;
  name: string;
  email: string;
  plan: "pro" | "ultra" | "custom";
  status: "active" | "inactive";
  usedMessages: number;
  limitMessages: number;
  createdDate: string;
};

export type TenantCreate = {
  name: string;
  email: string;
  plan: string;
  limitMessages: number;
  tenantKey?: string;
};

export type TenantUpdate = {
  name?: string;
  email?: string;
  plan?: string;
  limitMessages?: number;
};

export type AdminKpis = {
  activeTenants: number;
  totalTenants: number;
  totalMrr: number;
  globalMessages: number;
};

export type AdminHealth = {
  dbLatencyMs: number;
  chromaStatus: string;
  memoryUsagePercent: number;
  cpuUsagePercent: number;
  llmProviderStatus: string;
};

// ─── Auth functions ─────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<AuthSessionOut> {
  const session = await apiSend<AuthSessionOut>("/api/auth/login", "POST", { email, password });
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(JWT_TOKEN_STORAGE, session.token);
    window.sessionStorage.setItem("userRole", session.role);
  }
  return session;
}

export async function register(
  name: string,
  email: string,
  password: string,
  companyName: string,
): Promise<AuthSessionOut> {
  const session = await apiSend<AuthSessionOut>("/api/auth/register", "POST", {
    name,
    email,
    password,
    companyName,
  });
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(JWT_TOKEN_STORAGE, session.token);
    window.sessionStorage.setItem("userRole", session.role);
  }
  return session;
}

export function logout(): void {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(JWT_TOKEN_STORAGE);
    window.sessionStorage.removeItem("userRole");
    window.sessionStorage.removeItem(ADMIN_KEY_STORAGE);
  }
}

// ─── Admin API functions ────────────────────────────────────────────────────

export function fetchTenants(params?: {
  search?: string;
  plan?: string;
  status?: string;
}): Promise<TenantOut[]> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.plan && params.plan !== "all") qs.set("plan", params.plan);
  if (params?.status && params.status !== "all") qs.set("status", params.status);
  const query = qs.toString();
  return apiGet<TenantOut[]>(`/api/admin/tenants${query ? `?${query}` : ""}`, adminKeyHeader());
}

export function createTenant(data: TenantCreate): Promise<TenantOut> {
  return apiSend<TenantOut>("/api/admin/tenants", "POST", data, adminKeyHeader());
}

export function updateTenant(id: number, data: TenantUpdate): Promise<TenantOut> {
  return apiSend<TenantOut>(`/api/admin/tenants/${id}`, "PUT", data, adminKeyHeader());
}

export function deleteTenant(id: number): Promise<{ ok: boolean }> {
  return apiSend<{ ok: boolean }>(`/api/admin/tenants/${id}`, "DELETE", undefined, adminKeyHeader());
}

export function toggleTenantStatus(id: number): Promise<TenantOut> {
  return apiSend<TenantOut>(`/api/admin/tenants/${id}/toggle`, "POST", undefined, adminKeyHeader());
}

export function fetchAdminKpis(): Promise<AdminKpis> {
  return apiGet<AdminKpis>("/api/admin/kpis", adminKeyHeader());
}

export function fetchAdminHealth(): Promise<AdminHealth> {
  return apiGet<AdminHealth>("/api/admin/health", adminKeyHeader());
}
