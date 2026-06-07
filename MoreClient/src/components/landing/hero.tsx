"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowRight, MessageSquare, Send, CheckCircle, RefreshCw, XCircle } from "lucide-react";
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

  return (
    <section id="hero" className="relative overflow-hidden pt-20 pb-24 sm:pt-28 sm:pb-36 bg-[#101020] text-white">
      {/* Decorative Aurora Violet Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#7B61FF]/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-[#00FFCC]/5 blur-[150px] pointer-events-none" />

      {/* Grid overlay */}
      <div 
        className="pointer-events-none absolute inset-0 -z-10 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse at center, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black, transparent 75%)"
        }}
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-12 lg:items-center">
          {/* Hero text */}
          <div className="flex flex-col text-start lg:col-span-7 z-10">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl leading-[1.15]">
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
            <p className="mt-6 text-base sm:text-lg leading-relaxed text-[#8e8eb2] max-w-2xl">
              {language === "ar"
                ? "منصة الأتمتة الذكية الشبيهة بالبشر للواتساب والرسائل النصية والبريد الإلكتروني. ابنِ علاقات، لا مجرد تذاكر."
                : "The intelligent, human-like automation platform for WhatsApp, SMS, and Email. Build relationships, not just tickets."}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button
                href="/welcome"
                size="lg"
                className="bg-[#7B61FF] hover:bg-[#6848ff] text-white font-bold rounded-full px-8 py-4 shadow-[0_0_20px_rgba(123,97,255,0.4)] transition-all hover:scale-102 border-none active:scale-98"
              >
                {language === "ar" ? "جربه مجاناً" : "Try It Free"}
                <ArrowRight size={18} className="ml-1.5 rtl:mr-1.5 rtl:ml-0" aria-hidden="true" />
              </Button>
              <Button
                href="#features"
                variant="outline"
                size="lg"
                className="bg-transparent hover:bg-white/5 text-white font-semibold rounded-full px-8 py-4 border-white/20 hover:border-white/40 transition-all hover:scale-102 active:scale-98"
              >
                {language === "ar" ? "استكشف المنصة" : "Explore Platform"}
              </Button>
            </div>
          </div>

          {/* High-Fidelity Chat Simulator Mockup */}
          <div className="lg:col-span-5 flex justify-center z-10 w-full">
            <div className="relative w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#161632] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col backdrop-blur-md">
              {/* Soft Aura Violet light behind chat */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-[#7B61FF]/20 blur-[60px] pointer-events-none -z-10" />

              {/* Chat Header */}
              <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#7B61FF] to-[#00FFCC] p-[1.5px] flex items-center justify-center shadow-[0_0_10px_rgba(123,97,255,0.3)]">
                    <div className="w-full h-full bg-[#161632] rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                      MB
                    </div>
                  </div>
                  <div className="text-start">
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      MoreBot
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00FFCC] animate-pulse" />
                    </div>
                    <div className="text-[10px] text-[#8e8eb2]">
                      {language === "ar" ? "نشط الآن · محادثات ذكية" : "Active now · Intelligent Conversations"}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleReset}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-[#8e8eb2] hover:text-white transition-colors cursor-pointer"
                  title={language === "ar" ? "إعادة تعيين المحاكاة" : "Reset Simulation"}
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              {/* Chat messages */}
              <div
                ref={chatBodyRef}
                className="h-[310px] p-5 overflow-y-auto flex flex-col gap-4 text-xs sm:text-sm bg-[#0f0f26]/40 scroll-smooth"
              >
                {messages.map((msg, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div
                      className={`max-w-[85%] px-4 py-3 rounded-2xl leading-relaxed transition-all duration-300 ${
                        msg.sender === "customer"
                          ? "bg-white/[0.06] text-white self-start rounded-tl-none border border-white/5"
                          : "bg-[#7B61FF]/10 text-[#d0c6ff] border border-[#7B61FF]/20 self-end rounded-tr-none"
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
                  <div className="bg-[#7B61FF]/10 text-white border border-[#7B61FF]/20 self-end rounded-2xl rounded-tr-none px-4 py-3 flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-[#7B61FF] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-[#7B61FF] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-[#7B61FF] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
              </div>

              {/* Chat Input simulator */}
              <div className="border-t border-white/5 bg-white/[0.01] p-4 flex gap-3 items-center">
                <div className="flex-1 bg-[#0f0f26]/80 border border-white/5 rounded-lg px-4 py-2.5 text-start text-xs text-[#8e8eb2] h-9 flex items-center select-none overflow-hidden">
                  {language === "ar" ? "اختر خياراً للرد..." : "Select an option to reply..."}
                </div>
                <button
                  disabled
                  className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 text-white/30 cursor-not-allowed select-none"
                  aria-label="Send message"
                >
                  <Send size={15} className="rtl:rotate-180" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
