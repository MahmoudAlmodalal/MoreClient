import type { Tenant, Settings, Document, Handoff, Conversation, Message } from "./db";

export function tenantOut(t: Tenant) {
  return {
    id: t.id,
    tenantKey: t.tenantKey,
    name: t.name,
    email: t.email,
    plan: t.plan,
    status: t.status,
    usedMessages: t.usedMessages,
    limitMessages: t.limitMessages,
    createdDate: t.createdAt.toISOString(),
  };
}

const DEFAULT_SETTINGS = {
  companyName: "",
  botName: "Aida",
  companyLogo: "",
  botTone: "friendly",
  systemPromptExtra: "",
  telegramToken: null as string | null,
  isTelegramActive: false,
  twilioSid: null as string | null,
  twilioToken: null as string | null,
  twilioNumber: null as string | null,
  isWhatsappActive: false,
  subscriptionPlan: "pro",
  usedMessages: 0,
  confidenceThreshold: 0.55,
  purchaseFlowEnabled: false,
  purchaseCollectAddress: true,
  purchaseCollectQuantity: true,
  purchaseAutoForwardToSupport: true,
  purchaseConfirmationRequired: true,
  purchaseSessionMinutes: 30,
  purchaseCurrencyLabel: "USD",
  intentLlmEnabled: true,
  intentConfidenceThreshold: 0.6,
  autoHandoffOnComplaint: true,
  telegramLastDeliveryStatus: null as string | null,
  telegramLastDeliveryDetail: null as string | null,
  telegramLastDeliveryAt: null as string | null,
};

export function settingsOut(s: Settings | undefined, usedMessages = 0) {
  if (!s) return { ...DEFAULT_SETTINGS, usedMessages };
  return {
    companyName: s.companyName,
    botName: s.botName,
    companyLogo: s.companyLogo,
    botTone: s.botTone,
    systemPromptExtra: s.systemPromptExtra,
    telegramToken: s.telegramToken,
    isTelegramActive: s.isTelegramActive,
    twilioSid: s.twilioSid,
    twilioToken: s.twilioToken,
    twilioNumber: s.twilioNumber,
    isWhatsappActive: s.isWhatsappActive,
    subscriptionPlan: s.subscriptionPlan,
    usedMessages,
    confidenceThreshold: s.confidenceThreshold,
    purchaseFlowEnabled: s.purchaseFlowEnabled,
    purchaseCollectAddress: s.purchaseCollectAddress,
    purchaseCollectQuantity: s.purchaseCollectQuantity,
    purchaseAutoForwardToSupport: s.purchaseAutoForwardToSupport,
    purchaseConfirmationRequired: s.purchaseConfirmationRequired,
    purchaseSessionMinutes: s.purchaseSessionMinutes,
    purchaseCurrencyLabel: s.purchaseCurrencyLabel,
    intentLlmEnabled: s.intentLlmEnabled,
    intentConfidenceThreshold: s.intentConfidenceThreshold,
    autoHandoffOnComplaint: s.autoHandoffOnComplaint,
    telegramLastDeliveryStatus: s.telegramLastDeliveryStatus ?? null,
    telegramLastDeliveryDetail: s.telegramLastDeliveryDetail ?? null,
    telegramLastDeliveryAt: s.telegramLastDeliveryAt ? s.telegramLastDeliveryAt.toISOString() : null,
  };
}

export function fileOut(doc: Document, tenantKey: string, chunkCount: number) {
  return {
    id: doc.id,
    tenant_key: tenantKey,
    name: doc.name,
    size: humanSize(doc.sizeBytes),
    type: doc.type,
    chunks: chunkCount,
    date: doc.createdAt.toISOString(),
    status: doc.status,
  };
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function timeAgo(d: Date | null): string {
  if (!d) return "";
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function handoffOut(
  handoff: Handoff,
  conv: Conversation | undefined,
  messages: Message[],
) {
  return {
    id: handoff.id,
    user: conv?.customerRef || "anonymous",
    channel: handoff.channel,
    reason: handoff.reason,
    language: handoff.language,
    timeAgo: timeAgo(handoff.createdAt),
    createdAt: handoff.createdAt.toISOString(),
    unreplied: handoff.unreplied,
    messages: messages.map((m) => ({
      id: String(m.id),
      role: m.role,
      content: m.content,
      time: m.createdAt.toISOString(),
    })),
    metadata: {
      customerRef: conv?.customerRef,
      isTest: handoff.reason === "test",
      delivery: {
        status: handoff.deliveryStatus,
        attempts: handoff.deliveryAttempts,
        detail: handoff.deliveryDetail,
        ok: handoff.deliveryStatus === "delivered",
      },
    },
  };
}
