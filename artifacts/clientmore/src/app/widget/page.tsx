"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/components/language-provider";
import { apiGet, apiSend, createWebSocketUrl, type ChatMessageOut, type ChatResponse } from "@/lib/api";
import {
  Send,
  Bot,
  User,
  Globe,
  X
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "bot" | "human";
  text: string;
  time: string;
}

export default function WidgetPage() {
  const {
    t,
    language,
    setLanguage,
    botName,
    companyLogo
  } = useLanguage();

  const messageIdRef = useRef(1);
  const lastAgentMessageIdRef = useRef(0);
  const tenantKeyRef = useRef("telnet");
  // One stable session id per widget mount — drives backend conversation memory.
  const sessionId = useRef<string>(crypto.randomUUID());
  const greetingText = language === "ar" ? t("widgetGreetingAr") : t("widgetGreeting");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "greeting",
      sender: "bot",
      text: greetingText,
      time: "Now"
    }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chats. Honor reduced-motion so the view jumps
  // instead of animating for users who ask their OS to limit motion.
  const scrollToBottom = () => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    messagesEndRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const companyKey = params.get("company");
    tenantKeyRef.current =
      params.get("tenantKey") ||
      params.get("tenant_key") ||
      (companyKey && companyKey !== "default" ? companyKey : "") ||
      "telnet";
  }, []);

  // Live agent replies: prefer a WebSocket to /ws/chat/:sessionId so we get
  // server-pushed `{type:"agent.message"}` frames the moment the operator
  // replies. Falls back to the legacy 5s long-poll when the socket is closed
  // or proxied away (e.g. corporate WS blocks).
  useEffect(() => {
    if (!isEscalated) return;

    const appendAgentRow = (row: { id?: number; content: string; time?: string }) => {
      if (typeof row.id === "number") {
        if (row.id <= lastAgentMessageIdRef.current) return; // duplicate
        lastAgentMessageIdRef.current = row.id;
      }
      setMessages(prev => [
        ...prev,
        {
          id: `agent-${row.id ?? Date.now()}`,
          sender: "human" as const,
          text: row.content,
          time: row.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    };

    const pollAgentMessages = async () => {
      try {
        const rows = await apiGet<ChatMessageOut[]>(
          `/api/chat/${encodeURIComponent(sessionId.current)}/agent-messages?after_id=${lastAgentMessageIdRef.current}&tenant_key=${encodeURIComponent(tenantKeyRef.current)}`
        );
        rows.forEach(appendAgentRow);
      } catch {
        /* keep polling quietly; the chat form already handles connection errors */
      }
    };

    let ws: WebSocket | null = null;
    let pollInterval: number | null = null;
    let stopped = false;
    let wsOpen = false;

    const startPolling = (intervalMs: number) => {
      if (pollInterval !== null) return;
      void pollAgentMessages();
      pollInterval = window.setInterval(pollAgentMessages, intervalMs);
    };

    const stopPolling = () => {
      if (pollInterval !== null) {
        window.clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    try {
      const url = new URL(
        createWebSocketUrl(`/ws/chat/${encodeURIComponent(sessionId.current)}`),
      );
      url.searchParams.set("tenant_key", tenantKeyRef.current);
      ws = new WebSocket(url.toString());

      ws.onopen = () => {
        wsOpen = true;
        // Catch up on anything that arrived before the socket opened, then let
        // the push channel take over.
        void pollAgentMessages();
        stopPolling();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg?.type === "agent.message" && typeof msg.content === "string") {
            appendAgentRow({ id: msg.id, content: msg.content, time: msg.time });
          }
        } catch {
          /* ignore malformed frames */
        }
      };

      const fallback = () => {
        if (stopped) return;
        wsOpen = false;
        // Drop back to a slower poll cadence than the original 3s — we only
        // need it when the socket is down.
        startPolling(5000);
      };
      ws.onclose = fallback;
      ws.onerror = () => ws?.close();
    } catch {
      // No WebSocket support at all — keep the old polling cadence.
      startPolling(3000);
    }

    // If the socket hasn't opened within 2s, fall back to polling so the user
    // never sits in dead air waiting for a stuck handshake.
    const guardTimer = window.setTimeout(() => {
      if (!wsOpen && !stopped) startPolling(5000);
    }, 2000);

    return () => {
      stopped = true;
      window.clearTimeout(guardTimer);
      stopPolling();
      ws?.close();
    };
  }, [isEscalated]);

  const nextMessageId = () => {
    messageIdRef.current += 1;
    return `message-${messageIdRef.current}`;
  };

  const resetGreeting = (nextLanguage: "en" | "ar") => {
    setMessages([
      {
        id: `greeting-${nextLanguage}`,
        sender: "bot",
        text: nextLanguage === "ar" ? t("widgetGreetingAr") : t("widgetGreeting"),
        time: "Now"
      }
    ]);
    setIsEscalated(false);
  };

  const handleLanguageToggle = () => {
    const nextLanguage = language === "en" ? "ar" : "en";
    setLanguage(nextLanguage);
    resetGreeting(nextLanguage);
  };

  const suggestionsEn = [
    "Refund Policy 💸",
    "Upgrade Subscription ⚡",
    "Talk to Human Agent 👥"
  ];
  const suggestionsAr = [
    "سياسة الاسترجاع 💸",
    "ترقية الاشتراك ⚡",
    "التحدث مع الدعم البشري 👥"
  ];

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: nextMessageId(),
      sender: "user",
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      // Real backend brain: persists the turn, runs RAG, and decides escalation.
      // Language is detected server-side, so we don't send it.
      const resp = await apiSend<ChatResponse>("/api/chat", "POST", {
        session_id: sessionId.current,
        message: text,
        channel: "web",
        tenantKey: tenantKeyRef.current
      });

      setMessages(prev => [
        ...prev,
        {
          id: nextMessageId(),
          sender: resp.sender === "human" ? "human" : "bot",
          text: resp.reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      if (resp.escalate) {
        setIsEscalated(true);
      }
    } catch {
      // Graceful degradation — surface a bilingual connection error.
      setMessages(prev => [
        ...prev,
        {
          id: nextMessageId(),
          sender: "bot",
          text: language === "ar"
            ? "عذراً، أواجه مشكلة في الاتصال حالياً. يرجى المحاولة مرة أخرى."
            : "Sorry, I'm having trouble connecting right now. Please try again.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    sendMessage(inputVal);
    setInputVal("");
  };

  const handleSuggestionClick = (suggestionText: string) => {
    const cleanText = suggestionText.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim();
    sendMessage(cleanText);
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Widget Header */}
      <div className="gradient-brand flex items-center justify-between border-b border-border px-4 py-3.5 shadow-md relative">
        {/* Subtle glowing lightbar directly below header */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-60" />
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={companyLogo}
            alt="Logo"
            className="h-8 w-8 rounded-lg object-cover border border-white/20 shadow-md"
          />
          <div>
            <h2 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
              {botName}
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            </h2>
            <span className="text-[9px] text-white/70 font-medium">Bilingual Support Agent</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Switch */}
          <button
            onClick={handleLanguageToggle}
            aria-label={language === "en" ? "التبديل إلى العربية" : "Switch to English"}
            className="flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-[10px] text-white/90 hover:bg-white/20 hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <Globe className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            <span>{language === "en" ? "AR" : "EN"}</span>
          </button>

          {/* Close Widget Button */}
          <button
            onClick={() => window.parent.postMessage("clientmore-close-widget", "*")}
            className="rounded-md p-1 text-white/90 hover:bg-white/20 hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label={language === "ar" ? "إغلاق المحادثة" : "Close chat"}
            title={language === "ar" ? "إغلاق المحادثة" : "Close chat"}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area — a live region so screen readers announce new replies */}
      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label={language === "ar" ? "سجل المحادثة" : "Conversation"}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 max-w-[85%] ${
                isUser ? "ml-auto flex-row-reverse justify-start" : "mr-auto justify-start"
              }`}
            >
              {/* Bot/Agent Avatar */}
              {!isUser && (
                <div className="h-7 w-7 rounded-xl flex items-center justify-center shrink-0 border border-border bg-muted shadow-sm mt-1">
                  {msg.sender === "human" ? (
                    <User className="h-3.5 w-3.5 text-primary animate-pulse" />
                  ) : (
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  )}
                </div>
              )}

              <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                    isUser
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : msg.sender === "human"
                      ? "bg-primary/10 border border-primary/20 text-foreground rounded-tl-none"
                      : "bg-muted text-foreground border border-border rounded-tl-none"
                  }`}
                >
                  <p className="text-left rtl:text-right whitespace-pre-line leading-relaxed">{msg.text}</p>

                  {/* Time & Sender Badge */}
                  <div className={`mt-1.5 flex items-center gap-1.5 text-[8px] justify-between ${isUser ? "text-primary-foreground/70" : "text-muted-fg"}`}>
                    <span className="font-semibold uppercase tracking-wider">
                      {isUser
                        ? (language === "ar" ? "أنت" : "You")
                        : msg.sender === "human"
                        ? t("humanBadge")
                        : t("botBadge")}
                    </span>
                    <span className="opacity-40">•</span>
                    <span suppressHydrationWarning>{msg.time}</span>
                  </div>
                </div>

              </div>
            </div>
          );
        })}

        {/* Suggestion Chips */}
        {messages.length <= 2 && (
          <div className="flex flex-wrap gap-2 px-1 py-3 justify-start items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
            {(language === "ar" ? suggestionsAr : suggestionsEn).map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSuggestionClick(chip)}
                className="rounded-full border border-primary/20 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 text-[10px] font-semibold text-primary transition-all cursor-pointer shadow-sm hover:scale-[1.03]"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Typing Loading State */}
        {loading && (
          <div role="status" className="flex items-center gap-2 text-xs text-muted-fg italic max-w-xs mr-auto ml-1.5">
            <div className="h-2 w-2 rounded-full bg-muted-fg animate-ping" />
            <span>{language === "ar" ? t("aiSearchingAr") : t("aiSearching")}</span>
          </div>
        )}

        {/* Escalation banner — shown once the backend hands off to a human */}
        {isEscalated && (
          <div className="flex items-center gap-2 rounded-xl border border-warning/20 bg-warning/10 px-3.5 py-2 text-[10px] font-semibold text-warning animate-in fade-in slide-in-from-bottom-2 duration-300">
            <User className="h-3.5 w-3.5 text-warning animate-pulse shrink-0" />
            <span className="text-left rtl:text-right">
              {language === "ar" ? t("widgetEscalatedAr") : t("widgetEscalated")}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer Chat Form */}
      <form onSubmit={handleSend} className="border-t border-border bg-card p-3 flex gap-2">
        <input
          required
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          aria-label={language === "ar" ? t("widgetInputPlaceholderAr") : t("widgetPlaceholder")}
          placeholder={language === "ar" ? t("widgetInputPlaceholderAr") : t("widgetPlaceholder")}
          className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-fg outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/30"
        />
        <button
          type="submit"
          disabled={!inputVal.trim() || loading}
          aria-label={language === "ar" ? "إرسال" : "Send message"}
          className="rounded-xl bg-primary p-2.5 text-primary-foreground hover:bg-primary-hover active:scale-95 transition-all shadow-sm shadow-primary/20 shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <Send className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
