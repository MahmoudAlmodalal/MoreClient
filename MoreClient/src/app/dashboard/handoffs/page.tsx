"use client";

import React, { useState, useCallback } from "react";
import { useLanguage } from "@/components/language-provider";
import { apiGet, apiSend, type HandoffOut } from "@/lib/api";
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
  MapPin
} from "lucide-react";

type HandoffTicket = HandoffOut;

type DeliveryMetadata = {
  ok?: boolean;
  detail?: string;
};

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || selectedTicketId === null) return;

    const content = replyText;
    setReplyText("");

    try {
      const updated = await apiSend<HandoffOut>(
        "/api/handoffs/" + selectedTicketId + "/reply",
        "POST",
        { content }
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
      setReplyText(content);
    }
  };

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
    <div className="space-y-6 pb-12 text-foreground">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{t("handoffsTitle")}</h2>
        <p className="mt-1 text-sm text-text-muted">{t("handoffsSub")}</p>
      </div>

      {/* Control Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-custom pb-4">
        <div className="flex items-center gap-2">
          {(["all", "WhatsApp", "Telegram", "Widget"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95 border ${
                activeTab === tab
                  ? "bg-accent text-white border-transparent shadow-sm"
                  : "bg-card text-text-muted border-border-custom hover:bg-foreground/5"
              }`}
            >
              {tab === "all" ? t("all") : t(tab === "WhatsApp" ? "channelWhatsapp" : tab === "Telegram" ? "channelTelegram" : "channelWidget")}
            </button>
          ))}
        </div>

        {/* Filter Unreplied */}
        <label className="flex items-center gap-2 text-xs font-semibold text-foreground/80 cursor-pointer">
          <input
            type="checkbox"
            checked={unrepliedOnly}
            onChange={(e) => setUnrepliedOnly(e.target.checked)}
            className="rounded border-border-custom bg-card text-brand-600 focus:ring-brand-500"
          />
          {t("unrepliedOnly")}
        </label>
      </div>

      {/* Inline error banner */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Success toast */}
      {toast && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {toast}
        </div>
      )}

      {/* Workspace Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-border-custom bg-card text-text-muted">
          <MessageSquare className="h-12 w-12 mb-2 animate-pulse text-brand-600 dark:text-brand-400" />
          <p className="text-sm font-semibold">{t("loading")}</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-border-custom bg-card text-text-muted">
          <MessageSquare className="h-12 w-12 mb-2" />
          <p className="text-sm font-semibold">{t("noHandoffs")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: active handoff tickets list */}
          <div className="space-y-3 lg:col-span-1">
            {filteredTickets.map((ticket) => {
              const lastMsg = ticket.messages[ticket.messages.length - 1];
              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                    selectedTicketId === ticket.id
                      ? "border-brand-500 bg-brand-500/5 shadow-sm"
                      : "border-border-custom bg-card hover:bg-foreground/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground flex items-center gap-2">
                      {channelKey(ticket.channel) === "WhatsApp" && <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                      {channelKey(ticket.channel) === "Telegram" && <SendHorizontal className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                      {channelKey(ticket.channel) === "Widget" && <Globe className="h-4 w-4 text-brand-600 dark:text-brand-400" />}
                      {ticket.user}
                    </span>
                    <span className="text-[10px] text-text-muted">{ticket.timeAgo}</span>
                  </div>

                  <p className="mt-2 text-xs text-text-muted truncate max-w-full text-right rtl:text-right">
                    {lastMsg ? lastMsg.content : "No messages."}
                  </p>

                  <div className="mt-3 flex items-center justify-between border-t border-border-custom/50 pt-2.5">
                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${
                      ticket.reason === "low_confidence"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        : ticket.reason === "keyword_triggered"
                        ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                        : "bg-brand-500/10 text-brand-600 dark:text-brand-300 border-brand-500/20"
                    }`}>
                      {reasonText(ticket.reason)}
                    </span>

                    {ticket.unreplied && (
                      <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" title="Needs Agent Response" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right panel: Active chat window */}
          {activeTicket ? (
            <div className="lg:col-span-2 flex flex-col rounded-xl border border-border-custom bg-card overflow-hidden min-h-[500px]">
              {/* Active Ticket Header */}
              <div className="border-b border-border-custom bg-background px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    {t("activeChat", { name: activeTicket.user })}
                  </h3>
                  <p className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1.5 font-medium">
                    <ShieldAlert className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
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
                        className="inline-flex items-center gap-1.5 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-bold text-white transition-colors active:scale-95 cursor-pointer"
                      >
                        <BookPlus className="h-3.5 w-3.5" />
                        {t("addToKb")}
                      </button>
                    );
                  })()}
                  <button
                    onClick={() => handleResolve(activeTicket.id)}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition-colors active:scale-95 cursor-pointer"
                  >
                    {t("resolveHandoff")}
                  </button>
                </div>
              </div>

              {activeOrder && (
                <div className="border-b border-border-custom bg-emerald-500/5 px-6 py-4">
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    <PackageCheck className="h-4 w-4" />
                    {t("purchaseDetails")}
                  </h4>
                  <div className="grid grid-cols-1 gap-3 text-xs text-foreground/80 md:grid-cols-2">
                    <div className="flex items-start gap-2">
                      <PackageCheck className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        <span className="font-bold text-text-muted">{t("productName")}: </span>
                        {activeOrder.productName || "-"}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Hash className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        <span className="font-bold text-text-muted">{t("quantity")}: </span>
                        {activeOrder.quantity ?? "-"}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 md:col-span-2">
                      <MapPin className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        <span className="font-bold text-text-muted">{t("deliveryAddress")}: </span>
                        {activeOrder.deliveryAddress || "-"}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        <span className="font-bold text-text-muted">{t("orderStatus")}: </span>
                        {activeOrder.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Messages Log */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[350px] bg-background/30">
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
                        ? "bg-background text-foreground border border-border-custom"
                        : msg.role === "assistant"
                        ? "bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/20"
                        : "bg-accent text-white"
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-text-muted font-bold justify-between">
                        <span className="flex items-center gap-1">
                          {msg.role === "user" && <User className="h-3 w-3" />}
                          {msg.role === "assistant" && <Bot className="h-3 w-3 text-brand-600 dark:text-brand-400" />}
                          {msg.role === "agent" && <CheckCheck className="h-3 w-3 text-emerald-400" />}
                          {msg.role === "user" ? "Client" : msg.role === "assistant" ? t("botBadge") : t("humanBadge")}
                        </span>
                        <span>{msg.time}</span>
                      </div>
                      <p className="leading-relaxed text-right rtl:text-right font-medium">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Box Form */}
              <form onSubmit={handleSendMessage} className="border-t border-border-custom bg-background p-4 flex gap-3">
                <input
                  required
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={t("replyPlaceholder")}
                  className="flex-1 rounded-xl border border-border-custom bg-card px-4 py-2.5 text-sm text-foreground placeholder-text-muted/50 focus:border-brand-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-accent p-2.5 text-white hover:bg-accent-hover transition-colors active:scale-95 cursor-pointer"
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
