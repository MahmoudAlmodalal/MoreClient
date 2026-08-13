"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowRight, Send, RefreshCw } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";

interface Message {
  sender: "customer" | "bot";
  text: string;
  options?: string[];
}

export function Hero() {
  const { language } = useLanguage();
  return <HeroContent key={language} language={language} />;
}

function HeroContent({ language }: { language: "ar" | "en" }) {
  const chatBodyRef = useRef<HTMLDivElement>(null);

  const initialMessagesAr: Message[] = [
    { sender: "customer", text: "مرحباً، أريد التحقق من حالة حجزي لغد." },
    {
      sender: "bot",
      text: "أهلاً بك! لقد عثرت على حجزك لدى د. سمير الساعة 2:00 مساءً (عمان). هل ترغب في تأكيد الحجز، إعادة جدولته، أو إلغائه؟ إليك خياراتك:",
      options: ["تأكيد", "إعادة جدولة", "إلغاء"],
    },
  ];

  const initialMessagesEn: Message[] = [
    { sender: "customer", text: "Hi, I need to check my booking status for tomorrow." },
    {
      sender: "bot",
      text: "Welcome! I've located your booking for Dr. Smith at 2:00 PM (Amman). Do you wish to confirm, reschedule, or cancel? Here are your options:",
      options: ["Confirm", "Reschedule", "Cancel"],
    },
  ];

  const [messages, setMessages] = useState<Message[]>(language === "ar" ? initialMessagesAr : initialMessagesEn);
  const [isTyping, setIsTyping] = useState(false);
  const [hasSallaQuestionTriggered, setHasSallaQuestionTriggered] = useState(false);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleOptionClick = (option: string) => {
    if (isTyping) return;

    setMessages((previous) => {
      const updated = [...previous];
      const last = updated[updated.length - 1];
      if (last?.options) updated[updated.length - 1] = { ...last, options: undefined };
      return updated;
    });

    setMessages((previous) => [...previous, { sender: "customer", text: option }]);
    setIsTyping(true);

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
      } else if (option === "Confirm") {
        botResponse = "Perfect! Your booking is successfully confirmed. We look forward to seeing you tomorrow at 2:00 PM at the Amman branch (Al-Madina Al-Munawwarah St.).";
      } else if (option === "Reschedule") {
        botResponse = "Sure, please pick a new date or reply with your preferred time, and I will modify it immediately.";
      } else {
        botResponse = "Your booking has been cancelled successfully. If you change your mind, you can rebook anytime.";
      }

      setMessages((previous) => [...previous, { sender: "bot", text: botResponse }]);
      setIsTyping(false);

      if (!hasSallaQuestionTriggered && (option === "Confirm" || option === "تأكيد")) {
        setHasSallaQuestionTriggered(true);
        setTimeout(() => {
          setIsTyping(true);
          setTimeout(() => {
            setMessages((previous) => [
              ...previous,
              {
                sender: "customer",
                text: language === "ar" ? "ممتاز، هل يمكنني أيضاً ربط هذا بمتجر سلة؟" : "Great, can I also link this to my Salla store?",
              },
            ]);
            setTimeout(() => {
              const finalReply = language === "ar"
                ? "نعم بالتأكيد! توفر منصة MORE Response ربطاً مباشراً مع متاجر سلة وزيد عبر الـ Webhooks لتلقي الإشعارات التلقائية عند طلب العميل وتأكيد الشحن فوراً."
                : "Yes, absolutely! The MORE Response platform provides direct integration with Salla and Zid stores via Webhooks to receive automatic notifications on customer orders and confirm shipping instantly.";
              setMessages((previous) => [...previous, { sender: "bot", text: finalReply }]);
              setIsTyping(false);
            }, 1200);
          }, 650);
        }, 1200);
      }
    }, 1000);
  };

  const handleReset = () => {
    setMessages(language === "ar" ? initialMessagesAr : initialMessagesEn);
    setHasSallaQuestionTriggered(false);
    setIsTyping(false);
  };

  const capabilityPills = language === "ar"
    ? ["قنواتك في مكان واحد", "سياق محفوظ لكل محادثة", "إعداد يناسب سير عملك"]
    : ["Every channel in one place", "Context kept in every conversation", "Workflows built around your team"];

  return (
    <section id="hero" className="border-b border-border-custom bg-background text-foreground">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-12 lg:items-center lg:gap-10 lg:py-24">
        <div className="lg:col-span-7">
          <p className="text-xs font-bold tracking-[0.12em] text-accent">
            {language === "ar" ? "منصة محادثات متصلة" : "CONNECTED CONVERSATION PLATFORM"}
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-[-0.035em] text-foreground sm:text-5xl lg:text-[4rem]">
            {language === "ar" ? (
              <>
                أتمتة أعمالك.<br />
                <span className="text-foreground/70">إسعاد عملائك.</span>
              </>
            ) : (
              <>
                Automate your business.<br />
                <span className="text-foreground/70">Delight your customers.</span>
              </>
            )}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-foreground/70 sm:text-lg">
            {language === "ar"
              ? "منصة واحدة لإدارة محادثات واتساب والرسائل النصية والبريد الإلكتروني، مع أتمتة عملية تحافظ على سياق العميل وتمنح فريقك وقتًا للعمل الأهم."
              : "One place to manage WhatsApp, SMS, and email conversations, with practical automation that preserves customer context and gives your team time for higher-value work."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/welcome" size="lg" className="rounded-lg border-none bg-accent px-6 py-3.5 font-bold text-white shadow-sm hover:bg-accent-hover">
              {language === "ar" ? "جربه مجاناً" : "Try It Free"}
              <ArrowRight size={18} className="ml-1.5 rtl:mr-1.5 rtl:ml-0" aria-hidden="true" />
            </Button>
            <Button href="#features" variant="outline" size="lg" className="rounded-lg border-border-custom bg-card px-6 py-3.5 font-semibold text-foreground hover:border-foreground/30 hover:bg-foreground/[0.025]">
              {language === "ar" ? "استكشف المنصة" : "Explore Platform"}
            </Button>
          </div>
          <div className="mt-10 grid max-w-2xl gap-3 border-t border-border-custom pt-6 sm:grid-cols-3">
            {capabilityPills.map((item) => (
              <span key={item} className="flex items-start gap-2 text-xs font-semibold leading-5 text-foreground/70">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="overflow-hidden rounded-2xl border border-border-custom bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border-custom px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-custom bg-surface-muted text-xs font-bold text-accent">
                  MB
                </div>
                <div className="text-start">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    MoreBot
                    <span className="h-1.5 w-1.5 rounded-full bg-mint" aria-label={language === "ar" ? "نشط" : "Active"} />
                  </div>
                  <div className="mt-0.5 text-[11px] text-foreground/55">
                    {language === "ar" ? "نشط الآن · مساعد آلي" : "Active now · Automation assistant"}
                  </div>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="rounded-md p-1.5 text-foreground/50 transition-colors hover:bg-foreground/[0.045] hover:text-foreground"
                title={language === "ar" ? "إعادة تعيين المحاكاة" : "Reset Simulation"}
                aria-label={language === "ar" ? "إعادة تعيين المحاكاة" : "Reset Simulation"}
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div ref={chatBodyRef} className="flex h-[330px] flex-col gap-4 overflow-y-auto bg-surface-muted/45 p-5 text-xs sm:text-sm">
              {messages.map((message, index) => (
                <div key={index} className="flex flex-col gap-1.5">
                  <div
                    className={`max-w-[86%] rounded-xl px-4 py-3 leading-relaxed ${
                      message.sender === "customer"
                        ? "self-start border border-border-custom bg-card text-foreground"
                        : "self-end border border-brand-500/20 bg-brand-50 text-foreground dark:bg-brand-50/30"
                    }`}
                  >
                    {message.text}
                  </div>
                  {message.options && (
                    <div className="mt-1.5 flex flex-wrap justify-end gap-2">
                      {message.options.map((option) => (
                        <button
                          key={option}
                          onClick={() => handleOptionClick(option)}
                          className="rounded-md bg-accent px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-accent-hover active:scale-[0.98] sm:text-xs"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-1 self-end rounded-xl border border-brand-500/20 bg-brand-50 px-4 py-3 dark:bg-brand-50/30">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: "300ms" }} />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 border-t border-border-custom px-4 py-4">
              <div className="flex h-9 flex-1 items-center rounded-lg border border-border-custom bg-background px-3 text-start text-xs text-foreground/45 select-none">
                {language === "ar" ? "اختر خياراً للرد..." : "Select an option to reply..."}
              </div>
              <button disabled className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground/[0.05] text-foreground/30" aria-label="Send message">
                <Send size={15} className="rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
