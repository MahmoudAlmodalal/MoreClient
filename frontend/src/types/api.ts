// API response types. NOTE the casing split:
//   /api/analytics returns snake_case (mapped 1:1 to the Python schema).
//   Every other endpoint returns camelCase.
// Do NOT normalize analytics — type it as-is.

// ─── Analytics (snake_case) ───
export interface Kpis {
  total_questions: number;
  deflection_rate: number; // 0..1
  cost_savings: number; // USD
  feedback_score: number; // 0..5
}

export interface TopQuestion {
  name: string;
  count: number;
}

export interface ChannelSlice {
  name: string;
  value: number;
}

export interface UnansweredItem {
  id: number;
  question: string;
  channel: string;
  language: string;
  confidence: number;
  timeAgo: string;
}

export interface AnalyticsResponse {
  kpis: Kpis;
  top_questions: TopQuestion[];
  channel_distribution: ChannelSlice[];
  unanswered: UnansweredItem[];
}

// ─── Files (camelCase / flat) ───
export interface UploadResponse {
  file: string;
  chunks: number;
  status: string;
}

export interface FileOut {
  id: number;
  name: string;
  size: string;
  type: string;
  chunks: number;
  date: string;
  status: string; // "Completed" | "Processing" | "Failed"
}

// ─── Handoffs (camelCase) ───
export interface HandoffMessage {
  id: string;
  role: string; // "user" | "assistant" | "agent"
  content: string;
  time: string; // HH:MM
}

export interface HandoffOut {
  id: number;
  user: string;
  channel: string;
  reason: string; // "low_confidence" | "user_requested" | "keyword_triggered"
  language: string;
  timeAgo: string;
  unreplied: boolean;
  messages: HandoffMessage[];
  metadata: Record<string, unknown>;
}

// ─── Settings (camelCase) ───
export interface SettingsOut {
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
}

export type SettingsUpdate = Partial<SettingsOut>;

export interface OkResponse {
  ok: boolean;
}
