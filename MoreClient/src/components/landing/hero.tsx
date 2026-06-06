"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowRight, MessageSquare, Send } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";

interface Message {
  sender: "customer" | "bot";
  text: string;
}

export function Hero() {
  const { t, language, isRtl } = useLanguage();
  const chatBodyRef = useRef<HTMLDivElement>(null);

  // Initial messages
  const initialMessagesAr: Message[] = [
    { sender: "customer", text: "مرحباً، هل يمكنني حجز موعد استشارة الغد، وهل لديكم فرع في عمان؟" },
    {
      sender: "bot",
      text: "أهلاً بك! بالطبع، يسعدني مساعدتك. لدينا فرع رئيسي في عمان (شارع المدينة المنورة). لحجز موعد استشارة غداً، يرجى اختيار التخصص المناسب وتأكيد الساعة المفضلة، وسيقوم النظام بتسجيل حجزك فوراً!",
    },
  ];

  const initialMessagesEn: Message[] = [
    { sender: "customer", text: "Hi, can I book a consultation appointment for tomorrow, and do you have a branch in Amman?" },
    {
      sender: "bot",
      text: "Welcome! Of course, I'd be happy to assist you. We have a main branch in Amman (Al-Madina Al-Munawwarah St.). To book a consultation tomorrow, please select the appropriate specialty and confirm your preferred hour, and the system will register your booking immediately!",
    },
  ];

  // Conversation turns
  const dialoguesAr = [
    {
      customer: "هل يمكن ربط المنصة بمتجر سلة؟",
      bot: "نعم بالتأكيد! توفر المنصة ربطاً مباشراً مع متاجر سلة وزيد عبر الـ Webhooks لتلقي الإشعارات التلقائية عند طلب العميل وتأكيد الشحن فوراً.",
    },
    {
      customer: "كم تدعم الباقة الممتازة من رسائل الواتساب؟",
      bot: "تدعم الباقة الممتازة 50,000 رسالة مؤتمتة شهرياً مع إمكانية زيادة سعة استهلاك الرسائل بأسعار مخفضة جداً من لوحة التحكم.",
    },
    {
      customer: "رائع، سأجرب الباقة المجانية الآن!",
      bot: "أهلاً وسهلاً بك! اضغط على زر 'ابدأ مجاناً' في أعلى الصفحة للتسجيل والدخول للوحة التحكم فوراً.",
    },
  ];

  const dialoguesEn = [
    {
      customer: "Can I connect the platform to Salla store?",
      bot: "Yes, absolutely! The platform provides direct integration with Salla and Zid stores via Webhooks to receive automatic notifications on customer orders and confirm shipping instantly.",
    },
    {
      customer: "How many WhatsApp messages does the Premium plan support?",
      bot: "The Premium plan supports 50,000 automated messages per month, with the ability to add more volume at highly discounted rates from the control panel.",
    },
    {
      customer: "Awesome, I will try the free plan now!",
      bot: "You are welcome! Click 'Start Free' at the top of the page to register and access the control panel immediately.",
    },
  ];

  const [messages, setMessages] = useState<Message[]>(language === "ar" ? initialMessagesAr : initialMessagesEn);
  const [dialogueIdx, setDialogueIdx] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [prevLanguage, setPrevLanguage] = useState(language);

  if (prevLanguage !== language) {
    setPrevLanguage(language);
    setMessages(language === "ar" ? initialMessagesAr : initialMessagesEn);
    setDialogueIdx(0);
    setIsTyping(false);
  }

  const scrollToBottom = () => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const currentDialogues = language === "ar" ? dialoguesAr : dialoguesEn;

  const handleSendSim = () => {
    if (isTyping) return;

    const idx = dialogueIdx % currentDialogues.length;
    const dialog = currentDialogues[idx];

    setMessages((prev) => [...prev, { sender: "customer", text: dialog.customer }]);
    setDialogueIdx((prev) => prev + 1);
    setIsTyping(true);

    setTimeout(() => {
      setMessages((prev) => [...prev, { sender: "bot", text: dialog.bot }]);
      setIsTyping(false);
    }, 1200);
  };

  const nextInputPreview = currentDialogues[dialogueIdx % currentDialogues.length].customer;

  return (
    <section id="hero" className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-32 bg-background">
      {/* Human-designed grid overlay instead of AI glows */}
      <div 
        className="pointer-events-none absolute inset-0 -z-10 opacity-30 dark:opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--border) 1px, transparent 1px),
            linear-gradient(to bottom, var(--border) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse at center, black, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black, transparent 70%)"
        }}
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Hero text */}
          <div className="flex flex-col text-start lg:col-span-7">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl leading-[1.15]">
              {language === "ar" ? (
                <>
                  أتمتة خدمة العملاء لعملك بذكاء اصطناعي <span className="text-brand-600 dark:text-brand-400">خارق</span>
                </>
              ) : (
                <>
                  Automate Customer Support for Your Business with <span className="text-brand-600 dark:text-brand-400">Superpower AI</span>
                </>
              )}
            </h1>
            <p className="mt-6 text-base sm:text-lg leading-relaxed text-text-muted max-w-2xl">
              {language === "ar"
                ? "مور ريبونس (More Response) هي لوحة التحكم السحابية الموحدة للرد التلقائي وإدارة المحادثات. اربط قنوات الواتساب والرسائل النصية والبريد الإلكتروني وأتمت خدمة عملائك بذكاء متكامل لمختلف التخصصات والشركات."
                : "More Response is a unified cloud control panel for automated replies and conversation management. Connect WhatsApp, SMS, and Email to automate your customer service with integrated intelligence for various industries and businesses."}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button
                href="/welcome"
                size="lg"
                variant="primary"
              >
                {language === "ar" ? "ابدأ تجربتك المجانية" : "Start Your Free Trial"}
                <ArrowRight size={18} className="ml-1.5 rtl:mr-1.5 rtl:ml-0" aria-hidden="true" />
              </Button>
              <Button
                href="#showcase"
                variant="outline"
                size="lg"
              >
                {language === "ar" ? "شاهد لوحة التحكم" : "Explore Dashboard"}
              </Button>
            </div>
          </div>

          {/* Chat simulator mockup */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-[430px] rounded-2xl border border-border-custom bg-card shadow-lg overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border-custom bg-foreground/[0.02] px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    AI
                  </div>
                  <div className="text-start">
                    <div className="text-sm font-semibold text-foreground">
                      {language === "ar" ? "المساعد الذكي (MoreBot)" : "Smart Assistant (MoreBot)"}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {language === "ar" ? "نشط الآن" : "Active now"}
                    </div>
                  </div>
                </div>
                <MessageSquare size={18} className="text-text-muted" />
              </div>

              {/* Chat messages */}
              <div
                ref={chatBodyRef}
                className="h-[300px] p-5 overflow-y-auto flex flex-col gap-4 text-xs sm:text-sm bg-background/50"
              >
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-xl leading-relaxed ${
                      msg.sender === "customer"
                        ? "bg-foreground/[0.05] text-foreground self-start rounded-tl-none"
                        : "bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/20 self-end rounded-tr-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}

                {isTyping && (
                  <div className="bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/20 self-end rounded-xl rounded-tr-none px-4 py-3 flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="border-t border-border-custom bg-foreground/[0.02] p-4 flex gap-3 items-center">
                <div className="flex-1 bg-background border border-border-custom rounded-lg px-3 py-2 text-start text-xs text-text-muted h-9 line-clamp-1 flex items-center select-none overflow-hidden">
                  {nextInputPreview}
                </div>
                <button
                  onClick={handleSendSim}
                  disabled={isTyping}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-white transition-all select-none active:scale-95 ${
                    isTyping
                      ? "bg-brand-500/20 text-brand-300/50 cursor-not-allowed"
                      : "bg-brand-600 hover:bg-brand-500 cursor-pointer shadow-sm"
                  }`}
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
