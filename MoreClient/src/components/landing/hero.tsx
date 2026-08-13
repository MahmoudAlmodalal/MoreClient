"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowRight, Send, RefreshCw, Sparkles, BadgeCheck } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";

interface Message {
  sender: "customer" | "bot";
  text: string;
  options?: string[];
}

export function Hero() {
  const { language } = useLanguage();
  const chatBodyRef = useRef<HTMLDivElement>(null);
  
  // Custom interactive simulation steps
  const initialMessagesAr: Message[] = [
    { 
      sender: "customer", 
      text: "مرحباً، أريد التحقق من حالة حجزي لغد." 
    },
    {
      sender: "bot",
      text: "أهلاً بك! لقد عثرت على حجزك لدى د. سمير الساعة 2:00 مساءً (عمان). هل ترغب في تأكيد الحجز، إعادة جدولته، أو إلغائه؟ إليك خياراتك:",
      options: ["تأكيد", "إعادة جدولة", "إلغاء"]
    },
  ];

  const initialMessagesEn: Message[] = [
    { 
      sender: "customer", 
      text: "Hi, I need to check my booking status for tomorrow." 
    },
    {
      sender: "bot",
      text: "Welcome! I've located your booking for Dr. Smith at 2:00 PM (Amman). Do you wish to confirm, reschedule, or cancel? Here are your options:",
      options: ["Confirm", "Reschedule", "Cancel"]
    },
  ];

  const [messages, setMessages] = useState<Message[]>(language === "ar" ? initialMessagesAr : initialMessagesEn);
  const [isTyping, setIsTyping] = useState(false);
  const [prevLanguage, setPrevLanguage] = useState(language);
  const [hasSallaQuestionTriggered, setHasSallaQuestionTriggered] = useState(false);

  useEffect(() => {
    if (prevLanguage !== language) {
      setPrevLanguage(language);
      setMessages(language === "ar" ? initialMessagesAr : initialMessagesEn);
      setHasSallaQuestionTriggered(false);
      setIsTyping(false);
    }
  }, [language, prevLanguage]);

  const scrollToBottom = () => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleOptionClick = (option: string) => {
    if (isTyping) return;

    // Remove options from the last message to prevent double-clicking
    setMessages((prev) => {
      const updated = [...prev];
      if (updated.length > 0) {
        const last = updated[updated.length - 1];
        if (last.options) {
          updated[updated.length - 1] = { ...last, options: undefined };
        }
      }
      return updated;
    });

    // Add Customer response
    setMessages((prev) => [...prev, { sender: "customer", text: option }]);
    setIsTyping(true);

    // Simulated response timing
    setTimeout(() => {
      let botResponse = "";
      if (language === "ar") {
        if (option === "تأكيد") {
          botResponse = "ممتاز! تم تأكيد حجزك بنجاح. نحن بانتظارك غداً الساعة 2:00 مساءً في فرع عمان (شارع المدينة المنورة).";
        } else if (option === "إعادة جدولة") {
          botResponse = "بالتأكيد، يرجى اختيار تاريخ جديد أو الرد بالوقت المفضل لديك وسأقوم بتعديل الموعد فوراً.";
        } else {
          botResponse = "تم إلغاء حجزك بنجاح. إذا غيرت رأيك أو أردت حجز موعد جديد، يمكنك القيام بذلك في أي وقت.";
        }
      } else {
        if (option === "Confirm") {
          botResponse = "Perfect! Your booking is successfully confirmed. We look forward to seeing you tomorrow at 2:00 PM at the Amman branch (Al-Madina Al-Munawwarah St.).";
        } else if (option === "Reschedule") {
          botResponse = "Sure, please pick a new date or reply with your preferred time, and I will modify it immediately.";
        } else {
          botResponse = "Your booking has been cancelled successfully. If you change your mind, you can rebook anytime.";
        }
      }

      setMessages((prev) => [...prev, { sender: "bot", text: botResponse }]);
      setIsTyping(false);

      // Trigger Salla question after a short delay to keep the high-fidelity flow going
      if (!hasSallaQuestionTriggered && (option === "Confirm" || option === "تأكيد")) {
        setHasSallaQuestionTriggered(true);
        setTimeout(() => {
          setIsTyping(true);
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              { 
                sender: "customer", 
                text: language === "ar" ? "ممتاز، هل يمكنني أيضاً ربط هذا بمتجر سلة؟" : "Great, can I also link this to my Salla store?" 
              }
            ]);
            
            setTimeout(() => {
              setIsTyping(true);
              setTimeout(() => {
                const finalReply = language === "ar" 
                  ? "نعم بالتأكيد! توفر منصة MORE Response ربطاً مباشراً مع متاجر سلة وزيد عبر الـ Webhooks لتلقي الإشعارات التلقائية عند طلب العميل وتأكيد الشحن فوراً."
                  : "Yes, absolutely! The MORE Response platform provides direct integration with Salla and Zid stores via Webhooks to receive automatic notifications on customer orders and confirm shipping instantly.";
                setMessages((prev) => [...prev, { sender: "bot", text: finalReply }]);
                setIsTyping(false);
              }, 1200);
            }, 800);
          }, 600);
        }, 1500);
      }
    }, 1200);
  };

  const handleReset = () => {
    setMessages(language === "ar" ? initialMessagesAr : initialMessagesEn);
    setHasSallaQuestionTriggered(false);
    setIsTyping(false);
  };

  const capabilityPills = language === "ar"
    ? ["واتساب، SMS، وبريد إلكتروني", "صندوق وارد موحّد", "سير عمل يناسبك"]
    : ["WhatsApp, SMS & Email", "One unified inbox", "Workflows that fit you"];

  return (
    <section id="hero" className="relative overflow-hidden pb-20 pt-12 text-foreground sm:pb-28 sm:pt-16 lg:pb-32">
      {/* Decorative Aurora Violet Glows */}
      <div className="hero-orbit absolute -left-36 -top-32 h-[26rem] w-[26rem] rounded-full bg-[#7B61FF]/14 blur-[120px] pointer-events-none" />
      <div className="hero-orbit-slow absolute right-[-12rem] top-36 h-[25rem] w-[25rem] rounded-full bg-[#00FFCC]/10 blur-[120px] pointer-events-none" />
      <div className="hero-grid pointer-events-none absolute inset-0 -z-10 opacity-55 dark:opacity-40" />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-10">
          {/* Hero text */}
          <div className="z-10 flex flex-col text-start lg:col-span-7">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/8 px-3 py-1.5 text-xs font-bold tracking-wide text-brand-700 shadow-sm dark:text-brand-200">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white shadow-[0_0_16px_rgba(123,97,255,0.35)]">
                <Sparkles size={12} aria-hidden="true" />
              </span>
              {language === "ar" ? "أتمتة محادثات أكثر إنسانية" : "Human-first conversation automation"}
            </div>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-[4.15rem]">
              {language === "ar" ? (
                <>
                  أتمتة أعمالك. <br/>
                  <span className="bg-gradient-to-r from-[#7B61FF] via-[#9F8CFF] to-[#00FFCC] bg-clip-text text-transparent">إسعاد عملائك.</span>
                </>
              ) : (
                <>
                  Automate Your Business. <br/>
                  <span className="bg-gradient-to-r from-[#7B61FF] via-[#9F8CFF] to-[#00FFCC] bg-clip-text text-transparent">Delight Your Customers.</span>
                </>
              )}
            </h1>
            <p className="mt-6 text-base sm:text-lg leading-relaxed text-foreground/75 dark:text-[#8e8eb2] max-w-2xl">
              {language === "ar"
                ? "منصة الأتمتة الذكية الشبيهة بالبشر للواتساب والرسائل النصية والبريد الإلكتروني. ابنِ علاقات، لا مجرد تذاكر."
                : "The intelligent, human-like automation platform for WhatsApp, SMS, and Email. Build relationships, not just tickets."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">
              <Button
                href="/welcome"
                size="lg"
                className="rounded-2xl border-none bg-[#7B61FF] px-7 py-4 font-bold text-white shadow-[0_12px_28px_rgba(123,97,255,0.34)] transition-all hover:scale-[1.02] hover:bg-[#6848ff] hover:shadow-[0_16px_34px_rgba(123,97,255,0.42)] active:scale-[0.98] sm:px-8"
              >
                {language === "ar" ? "جربه مجاناً" : "Try It Free"}
                <ArrowRight size={18} className="ml-1.5 rtl:mr-1.5 rtl:ml-0" aria-hidden="true" />
              </Button>
              <Button
                href="#features"
                variant="outline"
                size="lg"
                className="rounded-2xl border-border-custom bg-background/55 px-7 py-4 font-semibold text-foreground shadow-sm transition-all hover:scale-[1.02] hover:border-brand-500/40 hover:bg-brand-500/5 active:scale-[0.98] sm:px-8"
              >
                {language === "ar" ? "استكشف المنصة" : "Explore Platform"}
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 border-t border-border-custom/70 pt-6">
              {capabilityPills.map((item) => (
                <span key={item} className="inline-flex items-center gap-2 text-xs font-semibold text-foreground/70 sm:text-sm">
                  <BadgeCheck size={16} className="shrink-0 text-[#7B61FF] dark:text-[#00FFCC]" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* High-Fidelity Chat Simulator Mockup */}
          <div className="relative z-10 flex w-full justify-center py-4 lg:col-span-5 lg:py-0">
            <div className="hero-orbit absolute -right-1 top-0 z-20 hidden items-center gap-2 rounded-2xl border border-brand-500/20 bg-card/95 px-3 py-2 shadow-[0_14px_30px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:flex">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00FFCC] opacity-70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#00D3AA]" />
              </span>
              <span className="text-xs font-bold text-foreground">{language === "ar" ? "الأتمتة نشطة" : "Automation active"}</span>
            </div>
            <div className="hero-orbit-slow absolute -bottom-2 -left-2 z-20 hidden items-center gap-2 rounded-2xl border border-border-custom bg-card/95 px-3 py-2 shadow-[0_14px_30px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/12 text-brand-600 dark:text-brand-200">M</span>
              <span className="text-xs font-bold text-foreground">{language === "ar" ? "صندوق وارد موحّد" : "One unified inbox"}</span>
            </div>
            <div className="relative w-full max-w-[430px] overflow-hidden rounded-[1.75rem] border border-border-custom bg-card p-1.5 shadow-[0_28px_70px_rgba(15,23,42,0.16)] dark:shadow-[0_28px_70px_rgba(0,0,0,0.55)]">
              <div className="absolute inset-0 rounded-[1.75rem] bg-gradient-to-br from-[#7B61FF]/12 via-transparent to-[#00FFCC]/12 pointer-events-none" />
              <div className="relative flex flex-col overflow-hidden rounded-[1.35rem] border border-border-custom/80 bg-card">
              {/* Soft Aura Violet light behind chat */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-[#7B61FF]/10 blur-[60px] pointer-events-none -z-10" />

              {/* Chat Header */}
              <div className="flex items-center justify-between border-b border-border-custom bg-foreground/[0.01] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#7B61FF] to-[#00FFCC] p-[1.5px] flex items-center justify-center shadow-[0_0_10px_rgba(123,97,255,0.2)]">
                    <div className="w-full h-full bg-card rounded-full flex items-center justify-center text-[10px] font-bold text-foreground">
                      MB
                    </div>
                  </div>
                  <div className="text-start">
                    <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      MoreBot
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00FFCC] animate-pulse" />
                    </div>
                    <div className="text-[10px] text-foreground/60 dark:text-[#8e8eb2]">
                      {language === "ar" ? "نشط الآن · محادثات ذكية" : "Active now · Intelligent Conversations"}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleReset}
                  className="p-1.5 rounded-lg hover:bg-foreground/5 text-foreground/60 hover:text-foreground transition-colors cursor-pointer"
                  title={language === "ar" ? "إعادة تعيين المحاكاة" : "Reset Simulation"}
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              {/* Chat messages */}
              <div
                ref={chatBodyRef}
                className="h-[310px] p-5 overflow-y-auto flex flex-col gap-4 text-xs sm:text-sm bg-background/40 scroll-smooth"
              >
                {messages.map((msg, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div
                      className={`max-w-[85%] px-4 py-3 rounded-2xl leading-relaxed transition-all duration-300 ${
                        msg.sender === "customer"
                          ? "bg-foreground/[0.06] text-foreground self-start rounded-tl-none border border-border-custom/50"
                          : "bg-[#7B61FF]/10 text-[#7B61FF] dark:text-[#d0c6ff] border border-[#7B61FF]/20 self-end rounded-tr-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                    {/* Render option buttons inside chatbot messages */}
                    {msg.options && (
                      <div className="flex flex-wrap gap-2 justify-end mt-1.5 z-20">
                        {msg.options.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            onClick={() => handleOptionClick(opt)}
                            className="bg-[#7B61FF] hover:bg-[#6848ff] text-white text-[11px] sm:text-xs font-bold px-3 py-1.5 rounded-full shadow-[0_0_10px_rgba(123,97,255,0.3)] transition-all transform active:scale-95 hover:scale-105 cursor-pointer"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div className="bg-[#7B61FF]/10 text-[#7B61FF] dark:text-[#d0c6ff] border border-[#7B61FF]/20 self-end rounded-2xl rounded-tr-none px-4 py-3 flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-[#7B61FF] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-[#7B61FF] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-[#7B61FF] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
              </div>

              {/* Chat Input simulator */}
              <div className="border-t border-border-custom bg-foreground/[0.01] p-4 flex gap-3 items-center">
                <div className="flex-1 bg-background border border-border-custom/50 rounded-lg px-4 py-2.5 text-start text-xs text-foreground/60 h-9 flex items-center select-none overflow-hidden">
                  {language === "ar" ? "اختر خياراً للرد..." : "Select an option to reply..."}
                </div>
                <button
                  disabled
                  className="w-9 h-9 rounded-lg flex items-center justify-center bg-foreground/5 text-foreground/30 cursor-not-allowed select-none"
                  aria-label="Send message"
                >
                  <Send size={15} className="rtl:rotate-180" />
                </button>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
