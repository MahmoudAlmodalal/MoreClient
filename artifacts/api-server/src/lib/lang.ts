// Lightweight language + intent detection. No external LLM required.

const ARABIC_RE = /[\u0600-\u06ff]/;

export function detectLanguage(text: string): "ar" | "en" {
  return ARABIC_RE.test(text) ? "ar" : "en";
}

// English + Arabic triggers for explicit human-handoff requests.
const HUMAN_TRIGGERS_EN = [
  "talk to human",
  "talk to a human",
  "speak to human",
  "speak to a human",
  "human agent",
  "real person",
  "live agent",
  "speak to someone",
  "agent please",
];
const HUMAN_TRIGGERS_AR = [
  "تحدث مع إنسان",
  "موظف حقيقي",
  "موظف بشري",
  "أريد التحدث مع شخص",
  "تحدث مع موظف",
  "وكيل بشري",
  "ممثل خدمة",
];
const COMPLAINT_TRIGGERS_EN = [
  "complain",
  "complaint",
  "terrible",
  "awful",
  "refund",
  "angry",
  "unacceptable",
  "horrible",
  "scam",
];
const COMPLAINT_TRIGGERS_AR = ["شكوى", "غاضب", "سيئ", "استرداد", "غير مقبول"];

export type Intent = "human_request" | "complaint" | "general";

export function classifyIntent(text: string): Intent {
  const lower = text.toLowerCase();
  if (HUMAN_TRIGGERS_EN.some((t) => lower.includes(t))) return "human_request";
  if (HUMAN_TRIGGERS_AR.some((t) => text.includes(t))) return "human_request";
  if (COMPLAINT_TRIGGERS_EN.some((t) => lower.includes(t))) return "complaint";
  if (COMPLAINT_TRIGGERS_AR.some((t) => text.includes(t))) return "complaint";
  return "general";
}
