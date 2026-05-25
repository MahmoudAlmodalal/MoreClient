import AsyncStorage from "@react-native-async-storage/async-storage";

export const JWT_TOKEN_KEY = "authToken";
export const USER_ROLE_KEY = "userRole";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

function joinPath(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem(JWT_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(
  path: string,
  method: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const auth = await getAuthHeader();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...auth,
    ...extraHeaders,
  };
  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(joinPath(BASE_URL, path), {
    method,
    headers,
    body:
      body instanceof FormData
        ? body
        : body !== undefined
        ? JSON.stringify(body)
        : undefined,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data.detail ?? data.message ?? msg;
    } catch {}
    throw new Error(msg);
  }
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, "GET");
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, "POST", body);
}

export async function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, "DELETE");
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, "PATCH", body);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type AuthSessionOut = {
  token: string;
  role: "admin" | "company";
  tenantKey: string;
  displayName?: string;
};

export async function login(
  email: string,
  password: string
): Promise<AuthSessionOut> {
  const res = await apiFetch<AuthSessionOut>("/api/auth/login", "POST", {
    email,
    password,
  });
  await AsyncStorage.setItem(JWT_TOKEN_KEY, res.token);
  await AsyncStorage.setItem(USER_ROLE_KEY, res.role);
  return res;
}

export async function register(
  name: string,
  email: string,
  password: string,
  companyName: string
): Promise<AuthSessionOut> {
  const res = await apiFetch<AuthSessionOut>("/api/auth/register", "POST", {
    name,
    email,
    password,
    companyName,
  });
  await AsyncStorage.setItem(JWT_TOKEN_KEY, res.token);
  await AsyncStorage.setItem(USER_ROLE_KEY, res.role);
  return res;
}

export async function logout(): Promise<void> {
  await AsyncStorage.multiRemove([JWT_TOKEN_KEY, USER_ROLE_KEY]);
}

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(JWT_TOKEN_KEY);
}

// ─── Types ────────────────────────────────────────────────────────────────────

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

export type HandoffMessage = {
  id: string;
  role: string;
  content: string;
  time: string;
};

export type HandoffOut = {
  id: number;
  user: string;
  channel: string;
  reason: string;
  language: string;
  timeAgo: string;
  createdAt: string | null;
  unreplied: boolean;
  messages: HandoffMessage[];
  metadata: {
    customerRef?: string;
    [key: string]: unknown;
  };
};

export type SettingsOut = {
  companyName: string;
  botName: string;
  companyLogo: string;
  botTone: string;
  telegramToken: string | null;
  isTelegramActive: boolean;
  twilioSid: string | null;
  isWhatsappActive: boolean;
  subscriptionPlan: string;
  usedMessages: number;
  confidenceThreshold: number;
  purchaseFlowEnabled: boolean;
};

// ─── API functions ─────────────────────────────────────────────────────────────

export function fetchAnalytics(): Promise<AnalyticsResponse> {
  return apiGet("/api/analytics/dashboard");
}

export function fetchFiles(): Promise<FileOut[]> {
  return apiGet("/api/files");
}

export function deleteFile(id: number): Promise<void> {
  return apiDelete(`/api/files/${id}`);
}

export function fetchHandoffs(status?: string): Promise<HandoffOut[]> {
  const q = status ? `?status=${status}` : "";
  return apiGet(`/api/handoffs${q}`);
}

export function resolveHandoff(id: number): Promise<void> {
  return apiPost(`/api/handoffs/${id}/resolve`, {});
}

export function replyToHandoff(id: number, message: string): Promise<void> {
  return apiPost(`/api/handoffs/${id}/reply`, { message });
}

export function fetchSettings(): Promise<SettingsOut> {
  return apiGet("/api/settings");
}

export function saveSettings(data: Partial<SettingsOut>): Promise<SettingsOut> {
  return apiPost("/api/settings", data);
}
