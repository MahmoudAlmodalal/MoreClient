"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useLanguage } from "@/components/language-provider";
import { apiGet, apiSend, type HandoffOut, type HandoffDeliveryMetadata } from "@/lib/api";
import { useAsyncOnMount } from "@/lib/use-async-effect";
import {
  MessageSquare,
  Send,
  SendHorizontal,
  Smartphone,
  Globe,
  CheckCheck,
  User,
  ShieldAlert,
  Bot,
  BookPlus,
  PackageCheck,
  Hash,
  MapPin,
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle
} from "lucide-react";

// Format milliseconds as a compact "1h 4m" / "23m" / "12s" SLA string.
function formatSlaAge(ms: number): string {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m - h * 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

// SLA breaches at one hour: that's when the agent should see red.
const SLA_BREACH_MS = 60 * 60 * 1000;

// The backend HandoffOut shape (from @/lib/api) is the source of truth for a
// ticket. `id` is a number, `channel` is the raw conversation channel
// (e.g. "whatsapp" | "telegram" | "web"), and `metadata` is a free-form dict.
type HandoffTicket = HandoffOut;

type DeliveryMetadata = HandoffDeliveryMetadata;

// Channel filter chips use display-cased names; map a raw backend channel to
// one of those buckets so filtering and the channel icon keep working.
function channelKey(channel: string): "Telegram" | "WhatsApp" | "Widget" {
  const c = (channel || "").toLowerCase();
  if (c.includes("whatsapp")) return "WhatsApp";
  if (c.includes("telegram")) return "Telegram";
  return "Widget";
}

export default function HandoffsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"all" | "Telegram" | "WhatsApp" | "Widget">("all");
  const [unrepliedOnly, setUnrepliedOnly] = useState(false);

  const [tickets, setTickets] = useState<HandoffTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  // Ticking clock so the SLA badge re-renders even when no data changes.
  const [, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const fetchTickets = () => apiGet<HandoffOut[]>("/api/handoffs");

  const loadTickets = useCallback(async () => {
    try {
      const data = await fetchTickets();
      setTickets(data);
      setSelectedTicketId(prev => {
        if (prev !== null && data.some(t => t.id === prev)) return prev;
        return data[0]?.id ?? null;
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load handoffs");
    } finally {
      setLoading(false);
    }
  }, []);

  useAsyncOnMount(loadTickets, [loadTickets]);

  const activeTicket = tickets.find(t => t.id === selectedTicketId);
  const activeOrder = activeTicket?.metadata.order;
  const reasonText = (reason: string) => {
    if (reason === "low_confidence") return t("lowConfidence");
    if (reason === "keyword_triggered") return t("keywordTriggered");
    if (reason === "purchase_complete") return t("purchaseComplete");
    if (reason === "complaint") return t("complaintReason");
    if (reason === "support_request") return t("supportRequestReason");
    return t("userRequested");
  };

  // Filters
  const filteredTickets = tickets.filter(ticket => {
    const matchesTab = activeTab === "all" || channelKey(ticket.channel) === activeTab;
    const matchesUnreplied = !unrepliedOnly || ticket.unreplied;
    return matchesTab && matchesUnreplied;
  });

  // Per-tab counts so the agent can see at a glance where the queue lives.
  const channelCounts = tickets.reduce(
    (acc, t) => {
      if (unrepliedOnly && !t.unreplied) return acc;
      const k = channelKey(t.channel);
      acc.all += 1;
      acc[k] += 1;
      return acc;
    },
    { all: 0, Telegram: 0, WhatsApp: 0, Widget: 0 } as Record<
      "all" | "Telegram" | "WhatsApp" | "Widget",
      number
    >,
  );

  const handleRetryDelivery = async (id: number) => {
    setRetryingId(id);
    try {
      const result = await apiSend<{ delivery: DeliveryMetadata }>(
        `/api/handoffs/${id}/retry-delivery`,
        "POST",
      );
      setTickets(prev =>
        prev.map(t =>
          t.id === id
            ? { ...t, metadata: { ...t.metadata, delivery: result.delivery } }
            : t,
        ),
      );
      if (result.delivery?.ok) {
        setToast(t("addedToKb") /* fallback string handled visually */);
        setError(null);
      } else {
        setError(`Retry failed: ${result.delivery?.detail || "check channel settings"}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetryingId(null);
      setTimeout(() => setToast(null), 2500);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || selectedTicketId === null) return;

    const content = replyText;
    setReplyText("");

    try {
      const updated = await apiSend<HandoffOut>(
        "/api/handoffs/" + selectedTicketId + "/reply",
        "POST",
        { message: content }
      );
      setTickets(prev => prev.map(t => (t.id === updated.id ? updated : t)));
      const delivery = updated.metadata.delivery as DeliveryMetadata | undefined;
      if (delivery?.ok === false) {
        setError(`Reply saved, but delivery failed: ${delivery.detail || "check channel settings"}`);
      } else {
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reply");
      // Restore the unsent text so the agent can retry.
      setReplyText(content);
    }
  };

  // Teach the bot from this handoff: take the customer's last question and the
  // agent's last reply and persist+embed them via /api/learn (with the handoff id
  // as provenance). Next time the same question is asked, RAG retrieves this Q&A.
  const handleAddToKb = async (ticket: HandoffTicket) => {
    const question = [...ticket.messages].reverse().find(m => m.role === "user")?.content;
    const answer = [...ticket.messages].reverse().find(m => m.role === "agent")?.content;
    if (!question || !answer) return;
    try {
      setError(null);
      await apiSend("/api/learn", "POST", {
        question,
        answer,
        source_handoff_id: ticket.id,
      });
      setToast(t("addedToKb"));
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to knowledge base");
    }
  };

  const handleResolve = async (id: number) => {
    try {
      await apiSend("/api/handoffs/" + id + "/resolve", "POST");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve handoff");
      return;
    }
    const remaining = tickets.filter(t => t.id !== id);
    setTickets(remaining);
    if (selectedTicketId === id) {
      setSelectedTicketId(remaining[0]?.id ?? null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">{t("handoffsTitle")}</h2>
        <p className="mt-1 text-sm text-gray-400">{t("handoffsSub")}</p>
      </div>

      {/* Control Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1f1f2e] pb-4">
        <div className="flex items-center gap-2">
          {(["all", "WhatsApp", "Telegram", "Widget"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === tab
                  ? "bg-purple-600 text-white"
                  : "bg-[#0d0d15] text-gray-400 border border-[#1f1f2e] hover:bg-[#1a1a26]"
              }`}
            >
              <span>{tab === "all" ? t("all") : t(tab === "WhatsApp" ? "channelWhatsapp" : tab === "Telegram" ? "channelTelegram" : "channelWidget")}</span>
              <span
                className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                  activeTab === tab
                    ? "bg-white/20 text-white"
                    : "bg-[#1f1f2e] text-gray-300"
                }`}
              >
                {channelCounts[tab]}
              </span>
            </button>
          ))}
        </div>

        {/* Filter Unreplied */}
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={unrepliedOnly}
            onChange={(e) => setUnrepliedOnly(e.target.checked)}
            className="rounded border-[#1f1f2e] bg-[#07070b] text-purple-600 focus:ring-purple-500"
          />
          {t("unrepliedOnly")}
        </label>
      </div>

      {/* Inline error banner (non-blocking) */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-400">
          {error}
        </div>
      )}

      {/* Success toast (e.g. "added to knowledge base") */}
      {toast && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-400">
          {toast}
        </div>
      )}

      {/* Conversation Workspace Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-[#1f1f2e] bg-[#0d0d15]">
          <MessageSquare className="h-12 w-12 text-gray-500 mb-2 animate-pulse" />
          <p className="text-sm font-semibold text-gray-400">{t("loading")}</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-[#1f1f2e] bg-[#0d0d15]">
          <MessageSquare className="h-12 w-12 text-gray-500 mb-2" />
          <p className="text-sm font-semibold text-gray-400">{t("noHandoffs")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: active handoff tickets list */}
          <div className="space-y-3 lg:col-span-1">
            {filteredTickets.map((ticket) => {
              const lastMsg = ticket.messages[ticket.messages.length - 1];
              const ageMs = ticket.createdAt
                ? Date.now() - new Date(ticket.createdAt).getTime()
                : 0;
              const slaBreached = ticket.unreplied && ageMs > SLA_BREACH_MS;
              const delivery = ticket.metadata.delivery as DeliveryMetadata | undefined;
              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    selectedTicketId === ticket.id
                      ? "border-purple-500 bg-purple-500/5 glow-purple"
                      : "border-[#1f1f2e] bg-[#0d0d15] hover:bg-[#151520]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      {channelKey(ticket.channel) === "WhatsApp" && <Smartphone className="h-4 w-4 text-emerald-400" />}
                      {channelKey(ticket.channel) === "Telegram" && <SendHorizontal className="h-4 w-4 text-blue-400" />}
                      {channelKey(ticket.channel) === "Widget" && <Globe className="h-4 w-4 text-purple-400" />}
                      {ticket.user}
                    </span>
                    <span
                      title={ticket.createdAt ?? undefined}
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                        slaBreached ? "text-red-400" : "text-gray-500"
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {ticket.createdAt ? formatSlaAge(ageMs) : ticket.timeAgo}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-gray-400 truncate max-w-full text-right rtl:text-right">
                    {lastMsg ? lastMsg.content : "No messages."}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#1f1f2e]/50 pt-2.5">
                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                      ticket.reason === "low_confidence"
                        ? "bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20"
                        : ticket.reason === "keyword_triggered"
                        ? "bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20"
                        : "bg-purple-500/10 text-purple-400 ring-1 ring-inset ring-purple-500/20"
                    }`}>
                      {reasonText(ticket.reason)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {delivery && delivery.status && delivery.status !== "pending" && (
                        <span
                          title={delivery.detail ?? undefined}
                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                            delivery.ok
                              ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20"
                              : "bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20"
                          }`}
                        >
                          {delivery.ok ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {delivery.ok ? "sent" : `failed${delivery.attempts ? ` (${delivery.attempts})` : ""}`}
                        </span>
                      )}
                      {delivery && !delivery.ok && delivery.status && delivery.status !== "pending" && (
                        <button
                          type="button"
                          disabled={retryingId === ticket.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleRetryDelivery(ticket.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300 hover:bg-purple-500/20 disabled:opacity-50"
                          title="Retry delivery to channel"
                        >
                          <RefreshCw className={`h-3 w-3 ${retryingId === ticket.id ? "animate-spin" : ""}`} />
                          Retry
                        </button>
                      )}
                      {ticket.unreplied && (
                        <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" title="Needs Agent Response" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right panel: Active chat window */}
          {activeTicket ? (
            <div className="lg:col-span-2 flex flex-col rounded-xl border border-[#1f1f2e] bg-[#0d0d15] overflow-hidden min-h-[500px]">
              {/* Active Ticket Header */}
              <div className="border-b border-[#1f1f2e] bg-[#07070b] px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {t("activeChat", { name: activeTicket.user })}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-purple-400" />
                    {t("reason")}: {reasonText(activeTicket.reason)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {(() => {
                    const hasAgentReply = activeTicket.messages.some(m => m.role === "agent");
                    return (
                      <button
                        onClick={() => handleAddToKb(activeTicket)}
                        disabled={!hasAgentReply}
                        title={hasAgentReply ? undefined : "Reply as an agent first, then teach the bot."}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-bold text-white transition-colors"
                      >
                        <BookPlus className="h-3.5 w-3.5" />
                        {t("addToKb")}
                      </button>
                    );
                  })()}
                  <button
                    onClick={() => handleResolve(activeTicket.id)}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition-colors"
                  >
                    {t("resolveHandoff")}
                  </button>
                </div>
              </div>

              {activeOrder && (
                <div className="border-b border-[#1f1f2e] bg-emerald-500/5 px-6 py-4">
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-300">
                    <PackageCheck className="h-4 w-4" />
                    {t("purchaseDetails")}
                  </h4>
                  <div className="grid grid-cols-1 gap-3 text-xs text-gray-300 md:grid-cols-2">
                    <div className="flex items-start gap-2">
                      <PackageCheck className="mt-0.5 h-4 w-4 text-emerald-400" />
                      <span>
                        <span className="font-bold text-gray-500">{t("productName")}: </span>
                        {activeOrder.productName || "-"}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Hash className="mt-0.5 h-4 w-4 text-emerald-400" />
                      <span>
                        <span className="font-bold text-gray-500">{t("quantity")}: </span>
                        {activeOrder.quantity ?? "-"}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 md:col-span-2">
                      <MapPin className="mt-0.5 h-4 w-4 text-emerald-400" />
                      <span>
                        <span className="font-bold text-gray-500">{t("deliveryAddress")}: </span>
                        {activeOrder.deliveryAddress || "-"}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="mt-0.5 h-4 w-4 text-emerald-400" />
                      <span>
                        <span className="font-bold text-gray-500">{t("orderStatus")}: </span>
                        {activeOrder.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Messages Log */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[350px]">
                {activeTicket.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[70%] ${
                      msg.role === "user"
                        ? `mr-auto text-left`
                        : `ml-auto text-right`
                    }`}
                  >
                    <div className={`rounded-xl px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-[#1f1f2e] text-white"
                        : msg.role === "assistant"
                        ? "bg-purple-900/40 text-purple-200 border border-purple-800/30"
                        : "bg-purple-600 text-white"
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-gray-400 font-bold justify-between">
                        <span className="flex items-center gap-1">
                          {msg.role === "user" && <User className="h-3 w-3" />}
                          {msg.role === "assistant" && <Bot className="h-3 w-3 text-purple-400" />}
                          {msg.role === "agent" && <CheckCheck className="h-3 w-3 text-emerald-400" />}
                          {msg.role === "user" ? "Client" : msg.role === "assistant" ? t("botBadge") : t("humanBadge")}
                        </span>
                        <span>{msg.time}</span>
                      </div>
                      <p className="leading-relaxed text-right rtl:text-right">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Box Form */}
              <form onSubmit={handleSendMessage} className="border-t border-[#1f1f2e] bg-[#07070b] p-4 flex gap-3">
                <input
                  required
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={t("replyPlaceholder")}
                  className="flex-1 rounded-xl border border-[#1f1f2e] bg-[#0d0d15] px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 p-2.5 text-white hover:bg-purple-500 transition-colors"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
