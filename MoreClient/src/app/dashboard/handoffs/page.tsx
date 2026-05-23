"use client";

import React, { useState } from "react";
import { useLanguage } from "@/components/language-provider";
import {
  MessageSquare,
  Send,
  SendHorizontal,
  Smartphone,
  Globe,
  CheckCheck,
  User,
  ShieldAlert,
  Bot
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "agent";
  content: string;
  time: string;
}

interface HandoffTicket {
  id: string;
  user: string;
  channel: "Telegram" | "WhatsApp" | "Widget";
  reason: "low_confidence" | "user_requested" | "keyword_triggered";
  language: "en" | "ar";
  timeAgo: string;
  unreplied: boolean;
  messages: ChatMessage[];
  metadata: {
    platformInfo?: string;
    phoneNumber?: string;
    username?: string;
  };
}

export default function HandoffsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"all" | "Telegram" | "WhatsApp" | "Widget">("all");
  const [unrepliedOnly, setUnrepliedOnly] = useState(false);

  const [tickets, setTickets] = useState<HandoffTicket[]>([
    {
      id: "1",
      user: "+972 59-912-3456",
      channel: "WhatsApp",
      reason: "low_confidence",
      language: "en",
      timeAgo: "5 min ago",
      unreplied: true,
      metadata: {
        phoneNumber: "+972 59-912-3456",
        platformInfo: "Twilio Sandbox API"
      },
      messages: [
        { id: "m1", role: "user", content: "Hi, do you deliver products directly inside Gaza during the current blockade?", time: "10:20 AM" },
        { id: "m2", role: "assistant", content: "I don't have enough information to answer that question. Would you like to speak with a human agent?", time: "10:20 AM" },
        { id: "m3", role: "user", content: "Yes please, connect me.", time: "10:21 AM" }
      ]
    },
    {
      id: "2",
      user: "@mahmoud_al",
      channel: "Telegram",
      reason: "keyword_triggered",
      language: "ar",
      timeAgo: "12 min ago",
      unreplied: true,
      metadata: {
        username: "@mahmoud_al",
        platformInfo: "Telegram Bot API v21.3"
      },
      messages: [
        { id: "m4", role: "user", content: "أريد تقديم شكوى رسمية بخصوص سوء الخدمة الفنية", time: "10:13 AM" },
        { id: "m5", role: "assistant", content: "تم تحويلك إلى موظف الدعم البشري. سنرد عليك قريباً.", time: "10:13 AM" }
      ]
    },
    {
      id: "3",
      user: "Client Session #3892",
      channel: "Widget",
      reason: "user_requested",
      language: "en",
      timeAgo: "1 hour ago",
      unreplied: false,
      metadata: {
        platformInfo: "Chrome 124.0.0 / Linux Workspace"
      },
      messages: [
        { id: "m6", role: "user", content: "Is it possible to custom brand the widget?", time: "9:15 AM" },
        { id: "m7", role: "assistant", content: "Yes, you can edit company logo, name and bot name from Settings page.", time: "9:16 AM" },
        { id: "m8", role: "user", content: "Can I use custom CSS fonts too? Talk to human.", time: "9:17 AM" },
        { id: "m9", role: "agent", content: "Sure, we support custom CSS! Let me know if you need docs.", time: "9:20 AM" }
      ]
    }
  ]);

  const [selectedTicketId, setSelectedTicketId] = useState<string>("1");
  const [replyText, setReplyText] = useState("");

  const activeTicket = tickets.find(t => t.id === selectedTicketId);

  // Filters
  const filteredTickets = tickets.filter(ticket => {
    const matchesTab = activeTab === "all" || ticket.channel === activeTab;
    const matchesUnreplied = !unrepliedOnly || ticket.unreplied;
    return matchesTab && matchesUnreplied;
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicketId) return;

    setTickets(prev => prev.map(t => {
      if (t.id === selectedTicketId) {
        return {
          ...t,
          unreplied: false, // Agent replied
          messages: [
            ...t.messages,
            {
              id: Date.now().toString(),
              role: "agent",
              content: replyText,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]
        };
      }
      return t;
    }));

    setReplyText("");
  };

  const handleResolve = (id: string) => {
    setTickets(prev => prev.filter(t => t.id !== id));
    // Auto-select another ticket if available
    const remaining = tickets.filter(t => t.id !== id);
    if (remaining.length > 0) {
      setSelectedTicketId(remaining[0].id);
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
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === tab
                  ? "bg-purple-600 text-white"
                  : "bg-[#0d0d15] text-gray-400 border border-[#1f1f2e] hover:bg-[#1a1a26]"
              }`}
            >
              {tab === "all" ? t("all") : t(tab === "WhatsApp" ? "channelWhatsapp" : tab === "Telegram" ? "channelTelegram" : "channelWidget")}
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

      {/* Conversation Workspace Grid */}
      {filteredTickets.length === 0 ? (
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
                      {ticket.channel === "WhatsApp" && <Smartphone className="h-4 w-4 text-emerald-400" />}
                      {ticket.channel === "Telegram" && <SendHorizontal className="h-4 w-4 text-blue-400" />}
                      {ticket.channel === "Widget" && <Globe className="h-4 w-4 text-purple-400" />}
                      {ticket.user}
                    </span>
                    <span className="text-[10px] text-gray-500">{ticket.timeAgo}</span>
                  </div>

                  <p className="mt-2 text-xs text-gray-400 truncate max-w-full text-right rtl:text-right">
                    {lastMsg ? lastMsg.content : "No messages."}
                  </p>

                  <div className="mt-3 flex items-center justify-between border-t border-[#1f1f2e]/50 pt-2.5">
                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                      ticket.reason === "low_confidence"
                        ? "bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20"
                        : ticket.reason === "keyword_triggered"
                        ? "bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20"
                        : "bg-purple-500/10 text-purple-400 ring-1 ring-inset ring-purple-500/20"
                    }`}>
                      {ticket.reason === "low_confidence" ? t("lowConfidence") : ticket.reason === "keyword_triggered" ? t("keywordTriggered") : t("userRequested")}
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
            <div className="lg:col-span-2 flex flex-col rounded-xl border border-[#1f1f2e] bg-[#0d0d15] overflow-hidden min-h-[500px]">
              {/* Active Ticket Header */}
              <div className="border-b border-[#1f1f2e] bg-[#07070b] px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {t("activeChat", { name: activeTicket.user })}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-purple-400" />
                    {t("reason")}: {activeTicket.reason === "low_confidence" ? t("lowConfidence") : t("userRequested")}
                  </p>
                </div>

                <button
                  onClick={() => handleResolve(activeTicket.id)}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition-colors"
                >
                  {t("resolveHandoff")}
                </button>
              </div>

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
