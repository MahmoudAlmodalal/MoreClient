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
  XCircle,
  FlaskConical,
  X,
  Trash2,
  CheckSquare,
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

  // Bulk-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Simulate dialog state
  const [showSimDialog, setShowSimDialog] = useState(false);
  const [simChannel, setSimChannel] = useState<"telegram" | "web">("telegram");
  const [simMessage, setSimMessage] = useState("Hi, I need help with my order");
  const [simLoading, setSimLoading] = useState(false);

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

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimLoading(true);
    try {
      const newHandoff = await apiSend<HandoffOut>("/api/handoffs/simulate", "POST", {
        channel: simChannel,
        message: simMessage,
      });
      setTickets(prev => [newHandoff, ...prev]);
      setSelectedTicketId(newHandoff.id);
      setShowSimDialog(false);
      setSimMessage("Hi, I need help with my order");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to simulate message");
    } finally {
      setSimLoading(false);
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

  const toggleSelectMode = () => {
    setSelectMode(prev => !prev);
    setSelectedIds(new Set());
  };

  const toggleTicketSelection = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await apiSend<{ deleted: number }>("/api/handoffs", "DELETE", { ids });
      setTickets(prev => prev.filter(t => !selectedIds.has(t.id)));
      setSelectedIds(new Set());
      setSelectMode(false);
      setShowDeleteConfirm(false);
      setToast(`Deleted ${ids.length} ticket${ids.length !== 1 ? "s" : ""}`);
      setTimeout(() => setToast(null), 3000);
      if (selectedTicketId !== null && selectedIds.has(selectedTicketId)) {
        setSelectedTicketId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tickets");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
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

  const channelIcon = (channel: string) => {
    const k = channelKey(channel);
    if (k === "WhatsApp") return <Smartphone className="h-4 w-4 text-success" />;
    if (k === "Telegram") return <SendHorizontal className="h-4 w-4 text-info" />;
    return <Globe className="h-4 w-4 text-primary" />;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{t("handoffsTitle")}</h2>
        <p className="mt-1 text-sm text-muted-fg">{t("handoffsSub")}</p>
      </div>

      {/* Control Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          {(["all", "WhatsApp", "Telegram", "Widget"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-fg hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>{tab === "all" ? t("all") : t(tab === "WhatsApp" ? "channelWhatsapp" : tab === "Telegram" ? "channelTelegram" : "channelWidget")}</span>
              <span
                className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                  activeTab === tab ? "bg-white/20 text-primary-foreground" : "bg-muted text-muted-fg"
                }`}
              >
                {channelCounts[tab]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Unreplied */}
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted-fg">
            <input
              type="checkbox"
              checked={unrepliedOnly}
              onChange={(e) => setUnrepliedOnly(e.target.checked)}
              className="rounded border-border bg-background text-primary accent-[var(--primary)] focus:ring-ring"
            />
            {t("unrepliedOnly")}
          </label>

          {/* Simulate button */}
          <button
            type="button"
            onClick={() => setShowSimDialog(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning transition-colors hover:bg-warning/20"
          >
            <FlaskConical className="h-3.5 w-3.5" />
            Send test message
          </button>

          {/* Select mode toggle */}
          <button
            type="button"
            onClick={toggleSelectMode}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
              selectMode
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border bg-card text-muted-fg hover:bg-muted hover:text-foreground"
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {selectMode ? "Cancel" : "Select"}
          </button>
        </div>
      </div>

      {/* Bulk-delete action bar */}
      {selectMode && selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5">
          <span className="text-xs font-semibold text-danger">
            {selectedIds.size} ticket{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-danger px-3 py-1.5 text-xs font-bold text-white transition-colors hover:brightness-110"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete selected
          </button>
        </div>
      )}

      {/* Simulate Dialog */}
      {showSimDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-warning" />
                <h3 className="text-sm font-bold text-foreground">Send test message</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSimDialog(false)}
                className="rounded-lg p-1.5 text-muted-fg transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-5 text-xs text-muted-fg">
              Creates a real handoff ticket so you can test the full reply and delivery flow — no live customer needed.
            </p>
            <form onSubmit={handleSimulate} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold text-muted-fg">Channel</label>
                <div className="flex gap-2">
                  {(["telegram", "web"] as const).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setSimChannel(ch)}
                      className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                        simChannel === ch
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-background text-muted-fg hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {ch === "telegram" ? (
                        <SendHorizontal className="h-3.5 w-3.5" />
                      ) : (
                        <Globe className="h-3.5 w-3.5" />
                      )}
                      {ch === "telegram" ? "Telegram" : "Widget"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-muted-fg">Customer message</label>
                <textarea
                  value={simMessage}
                  onChange={(e) => setSimMessage(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="Hi, I need help with my order"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSimDialog(false)}
                  className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-muted-fg transition-colors hover:bg-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={simLoading || !simMessage.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  {simLoading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FlaskConical className="h-3.5 w-3.5" />
                  )}
                  {simLoading ? "Creating…" : "Create ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk-delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger/15">
                <Trash2 className="h-5 w-5 text-danger" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Delete {selectedIds.size} ticket{selectedIds.size !== 1 ? "s" : ""}?
                </h3>
                <p className="mt-0.5 text-xs text-muted-fg">This cannot be undone.</p>
              </div>
            </div>
            <p className="mb-6 text-xs text-muted-fg">
              All messages and conversation data for the selected tickets will be permanently removed.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-muted-fg transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleBulkDelete()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-danger px-4 py-2 text-xs font-bold text-white transition-colors hover:brightness-110 disabled:opacity-50"
              >
                {deleting ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {deleting ? "Deleting…" : `Delete ${selectedIds.size}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline error banner (non-blocking) */}
      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-xs font-semibold text-danger">
          {error}
        </div>
      )}

      {/* Success toast (e.g. "added to knowledge base") */}
      {toast && (
        <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-xs font-semibold text-success">
          {toast}
        </div>
      )}

      {/* Conversation Workspace Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-20 text-center">
          <MessageSquare className="mb-2 h-12 w-12 animate-pulse text-muted-fg" />
          <p className="text-sm font-semibold text-muted-fg">{t("loading")}</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-20 text-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <MessageSquare className="h-7 w-7 text-muted-fg" />
          </span>
          <p className="text-sm font-semibold text-foreground">{t("noHandoffs")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                  onClick={() => {
                    if (selectMode) {
                      toggleTicketSelection(ticket.id, { stopPropagation: () => {} } as React.MouseEvent);
                    } else {
                      setSelectedTicketId(ticket.id);
                    }
                  }}
                  className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                    selectMode && selectedIds.has(ticket.id)
                      ? "border-danger/50 bg-danger/5"
                      : selectedTicketId === ticket.id && !selectMode
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                      {selectMode && (
                        <input
                          type="checkbox"
                          readOnly
                          checked={selectedIds.has(ticket.id)}
                          className="h-4 w-4 rounded border-border bg-background accent-[var(--danger)]"
                          onClick={(e) => toggleTicketSelection(ticket.id, e)}
                        />
                      )}
                      {channelIcon(ticket.channel)}
                      {ticket.user}
                    </span>
                    <span
                      title={ticket.createdAt ?? undefined}
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                        slaBreached ? "text-danger" : "text-muted-fg"
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {ticket.createdAt ? formatSlaAge(ageMs) : ticket.timeAgo}
                    </span>
                  </div>

                  <p className="mt-2 max-w-full truncate text-right text-xs text-muted-fg rtl:text-right">
                    {lastMsg ? lastMsg.content : "No messages."}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                    <div className="flex items-center gap-1.5">
                      {Boolean(ticket.metadata.isTest) && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-warning ring-1 ring-inset ring-warning/30">
                          <FlaskConical className="h-3 w-3" />
                          Test
                        </span>
                      )}
                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                        ticket.reason === "low_confidence"
                          ? "bg-warning/10 text-warning ring-warning/20"
                          : ticket.reason === "keyword_triggered"
                          ? "bg-danger/10 text-danger ring-danger/20"
                          : ticket.reason === "test"
                          ? "bg-warning/10 text-warning ring-warning/20"
                          : "bg-primary/10 text-primary ring-primary/20"
                      }`}>
                        {ticket.reason === "test" ? "Simulated" : reasonText(ticket.reason)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {delivery && delivery.status && delivery.status !== "pending" && (
                        <span
                          title={delivery.detail ?? undefined}
                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
                            delivery.ok
                              ? "bg-success/10 text-success ring-success/20"
                              : "bg-danger/10 text-danger ring-danger/20"
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
                          className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
                          title="Retry delivery to channel"
                        >
                          <RefreshCw className={`h-3 w-3 ${retryingId === ticket.id ? "animate-spin" : ""}`} />
                          Retry
                        </button>
                      )}
                      {ticket.unreplied && (
                        <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-danger" title="Needs Agent Response" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right panel: Active chat window */}
          {activeTicket ? (
            <div className="flex min-h-[500px] flex-col overflow-hidden rounded-xl border border-border bg-card lg:col-span-2">
              {/* Active Ticket Header */}
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-6 py-4">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                    {t("activeChat", { name: activeTicket.user })}
                    {Boolean(activeTicket.metadata.isTest) && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-warning ring-1 ring-inset ring-warning/30">
                        <FlaskConical className="h-3 w-3" />
                        Test
                      </span>
                    )}
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-fg">
                    <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                    {t("reason")}: {activeTicket.reason === "test" ? "Simulated message" : reasonText(activeTicket.reason)}
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
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <BookPlus className="h-3.5 w-3.5" />
                        {t("addToKb")}
                      </button>
                    );
                  })()}
                  <button
                    onClick={() => handleResolve(activeTicket.id)}
                    className="rounded-lg bg-success px-3 py-1.5 text-xs font-bold text-white transition-colors hover:brightness-110"
                  >
                    {t("resolveHandoff")}
                  </button>
                </div>
              </div>

              {activeOrder && (
                <div className="border-b border-border bg-success/5 px-6 py-4">
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-success">
                    <PackageCheck className="h-4 w-4" />
                    {t("purchaseDetails")}
                  </h4>
                  <div className="grid grid-cols-1 gap-3 text-xs text-foreground md:grid-cols-2">
                    <div className="flex items-start gap-2">
                      <PackageCheck className="mt-0.5 h-4 w-4 text-success" />
                      <span>
                        <span className="font-bold text-muted-fg">{t("productName")}: </span>
                        {activeOrder.productName || "-"}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Hash className="mt-0.5 h-4 w-4 text-success" />
                      <span>
                        <span className="font-bold text-muted-fg">{t("quantity")}: </span>
                        {activeOrder.quantity ?? "-"}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 md:col-span-2">
                      <MapPin className="mt-0.5 h-4 w-4 text-success" />
                      <span>
                        <span className="font-bold text-muted-fg">{t("deliveryAddress")}: </span>
                        {activeOrder.deliveryAddress || "-"}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="mt-0.5 h-4 w-4 text-success" />
                      <span>
                        <span className="font-bold text-muted-fg">{t("orderStatus")}: </span>
                        {activeOrder.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Messages Log */}
              <div className="max-h-[350px] flex-1 space-y-4 overflow-y-auto p-6">
                {activeTicket.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex max-w-[70%] flex-col ${
                      msg.role === "user" ? "mr-auto text-left" : "ml-auto text-right"
                    }`}
                  >
                    <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-muted text-foreground"
                        : msg.role === "assistant"
                        ? "border border-primary/20 bg-primary/10 text-foreground"
                        : "bg-primary text-primary-foreground"
                    }`}>
                      <div className="mb-1 flex items-center justify-between gap-1.5 text-[10px] font-bold opacity-80">
                        <span className="flex items-center gap-1">
                          {msg.role === "user" && <User className="h-3 w-3" />}
                          {msg.role === "assistant" && <Bot className="h-3 w-3" />}
                          {msg.role === "agent" && <CheckCheck className="h-3 w-3" />}
                          {msg.role === "user" ? "Client" : msg.role === "assistant" ? t("botBadge") : t("humanBadge")}
                        </span>
                        <span>{msg.time}</span>
                      </div>
                      <p className="text-right leading-relaxed rtl:text-right">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Box Form */}
              <form onSubmit={handleSendMessage} className="flex gap-3 border-t border-border bg-muted/40 p-4">
                <input
                  required
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={t("replyPlaceholder")}
                  className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-primary p-2.5 text-primary-foreground transition-colors hover:bg-primary-hover"
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
