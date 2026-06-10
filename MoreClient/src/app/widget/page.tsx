"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/components/language-provider";
import { apiGet, apiSend, type ChatMessageOut, type ChatResponse } from "@/lib/api";
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

  useEffect(() => {
    if (!isEscalated) return;

    const pollAgentMessages = async () => {
      try {
        const rows = await apiGet<ChatMessageOut[]>(
          `/api/chat/${encodeURIComponent(sessionId.current)}/agent-messages?after_id=${lastAgentMessageIdRef.current}&tenant_key=${encodeURIComponent(tenantKeyRef.current)}`
        );
        if (rows.length === 0) return;

        lastAgentMessageIdRef.current = Math.max(
          lastAgentMessageIdRef.current,
          ...rows.map(row => row.id)
        );
        setMessages(prev => [
          ...prev,
          ...rows.map(row => ({
            id: `agent-${row.id}`,
            sender: "human" as const,
            text: row.content,
            time: row.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }))
        ]);
      } catch {
        /* keep polling quietly */
      }
    };

    void pollAgentMessages();
    const interval = window.setInterval(pollAgentMessages, 3000);
    return () => window.clearInterval(interval);
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
    <div className="flex h-screen flex-col bg-background text-foreground transition-colors duration-200">
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-border-custom bg-card px-4 py-3.5 shadow-sm relative">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={companyLogo}
            alt="Logo"
            className="h-8 w-8 rounded-lg object-cover border border-brand-500/20 shadow-sm"
          />
          <div>
            <h2 className="text-xs font-bold text-foreground tracking-tight flex items-center gap-1.5">
              {botName}
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            <span className="text-[9px] text-text-muted font-medium">Bilingual Support Agent</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Switch */}
          <button
            onClick={handleLanguageToggle}
            aria-label={language === "en" ? "التبديل إلى العربية" : "Switch to English"}
            className="flex items-center gap-1 rounded-md border border-border-custom bg-card px-2 py-1 text-[10px] text-text-muted hover:text-foreground transition-colors cursor-pointer focus:outline-none"
          >
            <Globe className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" aria-hidden="true" />
            <span>{language === "en" ? "AR" : "EN"}</span>
          </button>

          {/* Close Widget Button */}
          <button
            onClick={() => window.parent.postMessage("clientmore-close-widget", "*")}
            className="rounded-md p-1 text-text-muted hover:bg-foreground/5 hover:text-foreground transition-colors cursor-pointer focus:outline-none"
            aria-label={language === "ar" ? "إغلاق المحادثة" : "Close chat"}
            title={language === "ar" ? "إغلاق المحادثة" : "Close chat"}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label={language === "ar" ? "سجل المحادثة" : "Conversation"}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50"
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
                <div className="h-7 w-7 rounded-xl flex items-center justify-center shrink-0 border border-border-custom bg-card shadow-sm mt-1">
                  {msg.sender === "human" ? (
                    <User className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                  ) : (
                    <Bot className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                  )}
                </div>
              )}

              <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    isUser
                      ? "bg-accent text-white rounded-tr-none shadow-sm"
                      : msg.sender === "human"
                      ? "bg-card border border-brand-500/20 text-foreground rounded-tl-none"
                      : "bg-card border border-border-custom text-foreground rounded-tl-none"
                  }`}
                >
                  <p className="text-left rtl:text-right whitespace-pre-line leading-relaxed font-medium">{msg.text}</p>
                  
                  {/* Time & Sender Badge */}
                  <div className="mt-1.5 flex items-center gap-1.5 text-[8px] text-text-muted justify-between">
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
                className="rounded-full border border-border-custom bg-card hover:bg-foreground/5 px-3 py-1.5 text-[10px] font-semibold text-brand-600 dark:text-brand-300 hover:text-foreground transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Typing Loading State */}
        {loading && (
          <div role="status" className="flex items-center gap-2 text-xs text-text-muted italic max-w-xs mr-auto ml-1.5">
            <div className="h-2 w-2 rounded-full bg-brand-500 animate-ping" />
            <span>{language === "ar" ? t("aiSearchingAr") : t("aiSearching")}</span>
          </div>
        )}

        {/* Escalation banner */}
        {isEscalated && (
          <div className="flex items-center gap-2 rounded-xl border border-brand-500/20 bg-brand-500/5 px-3.5 py-2 text-[10px] font-semibold text-brand-600 dark:text-brand-300 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <User className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400 animate-pulse shrink-0" />
            <span className="text-left rtl:text-right">
              {language === "ar" ? t("widgetEscalatedAr") : t("widgetEscalated")}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer Chat Form */}
      <form onSubmit={handleSend} className="border-t border-border-custom bg-card p-3 flex gap-2">
        <input
          required
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          aria-label={language === "ar" ? t("widgetInputPlaceholderAr") : t("widgetPlaceholder")}
          placeholder={language === "ar" ? t("widgetInputPlaceholderAr") : t("widgetPlaceholder")}
          className="flex-1 rounded-xl border border-border-custom bg-background px-3.5 py-2.5 text-xs text-foreground placeholder-text-muted/50 focus:border-brand-500 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!inputVal.trim() || loading}
          aria-label={language === "ar" ? "إرسال" : "Send message"}
          className="rounded-xl bg-accent p-2.5 text-white hover:bg-accent-hover active:scale-95 transition-all shadow-sm shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <Send className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
