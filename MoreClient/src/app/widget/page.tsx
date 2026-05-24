"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/components/language-provider";
import { apiSend, type ChatResponse } from "@/lib/api";
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
        channel: "web"
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
    <div className="flex h-screen flex-col bg-[#050508] text-white">
      {/* Widget Header */}
      <div
        className="flex items-center justify-between border-b border-purple-500/20 backdrop-blur-md px-4 py-3.5 shadow-lg relative"
        style={{ background: "linear-gradient(90deg, rgba(88, 28, 135, 0.85) 0%, rgba(49, 46, 129, 0.85) 50%, rgba(7, 7, 11, 0.9) 100%)" }}
      >
        {/* Subtle neon glowing lightbar directly below header */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-60" />
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={companyLogo}
            alt="Logo"
            className="h-8 w-8 rounded-lg object-cover border border-purple-500/20 shadow-md"
          />
          <div>
            <h2 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
              {botName}
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </h2>
            <span className="text-[9px] text-gray-500 font-medium">Bilingual Support Agent</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Switch */}
          <button
            onClick={handleLanguageToggle}
            aria-label={language === "en" ? "التبديل إلى العربية" : "Switch to English"}
            className="flex items-center gap-1 rounded-md border border-[#1f1f2e] bg-[#0d0d15] px-2 py-1 text-[10px] text-gray-400 hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
          >
            <Globe className="h-3.5 w-3.5 text-purple-400" aria-hidden="true" />
            <span>{language === "en" ? "AR" : "EN"}</span>
          </button>

          {/* Close Widget Button */}
          <button
            onClick={() => window.parent.postMessage("clientmore-close-widget", "*")}
            className="rounded-md p-1 text-gray-400 hover:bg-[#1f1f2e] hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
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
                <div className="h-7 w-7 rounded-xl flex items-center justify-center shrink-0 border border-purple-500/20 bg-[#0d0d15] shadow-inner mt-1">
                  {msg.sender === "human" ? (
                    <User className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                  ) : (
                    <Bot className="h-3.5 w-3.5 text-purple-400" />
                  )}
                </div>
              )}

              <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    isUser
                      ? "text-white rounded-tr-none shadow-lg shadow-purple-500/10"
                      : msg.sender === "human"
                      ? "bg-[#0d0d15] border border-indigo-500/25 text-indigo-100 rounded-tl-none shadow-inner"
                      : "bg-[#0d0d15] text-purple-200 border border-[#1f1f2e] rounded-tl-none shadow-inner"
                  }`}
                  style={isUser ? { background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" } : undefined}
                >
                  <p className="text-left rtl:text-right whitespace-pre-line leading-relaxed">{msg.text}</p>
                  
                  {/* Time & Sender Badge */}
                  <div className="mt-1.5 flex items-center gap-1.5 text-[8px] text-gray-500 justify-between">
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
                className="rounded-full border border-purple-500/20 bg-purple-950/20 hover:bg-purple-900/40 px-3 py-1.5 text-[10px] font-semibold text-purple-300 hover:text-white transition-all cursor-pointer shadow-sm hover:scale-[1.03]"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Typing Loading State */}
        {loading && (
          <div role="status" className="flex items-center gap-2 text-xs text-gray-500 italic max-w-xs mr-auto ml-1.5">
            <div className="h-2 w-2 rounded-full bg-purple-500 animate-ping" />
            <span>{language === "ar" ? t("aiSearchingAr") : t("aiSearching")}</span>
          </div>
        )}

        {/* Escalation banner — shown once the backend hands off to a human */}
        {isEscalated && (
          <div className="flex items-center gap-2 rounded-xl border border-indigo-500/25 bg-indigo-950/20 px-3.5 py-2 text-[10px] font-semibold text-indigo-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <User className="h-3.5 w-3.5 text-indigo-400 animate-pulse shrink-0" />
            <span className="text-left rtl:text-right">
              {language === "ar" ? t("widgetEscalatedAr") : t("widgetEscalated")}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer Chat Form */}
      <form onSubmit={handleSend} className="border-t border-[#1f1f2e] bg-gradient-to-t from-[#07070b] to-[#0a0a10] p-3 flex gap-2">
        <input
          required
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          aria-label={language === "ar" ? t("widgetInputPlaceholderAr") : t("widgetPlaceholder")}
          placeholder={language === "ar" ? t("widgetInputPlaceholderAr") : t("widgetPlaceholder")}
          className="flex-1 rounded-xl border border-[#1f1f2e] bg-[#0d0d15] px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputVal.trim() || loading}
          aria-label={language === "ar" ? "إرسال" : "Send message"}
          className="rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 p-2.5 text-white hover:brightness-110 active:scale-95 transition-all shadow-md shadow-purple-600/10 shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <Send className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
