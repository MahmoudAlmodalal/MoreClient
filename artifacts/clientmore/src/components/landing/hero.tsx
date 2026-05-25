"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowRight, Bot, MessageSquare, Send } from "lucide-react";
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

  // Reset hero state when language toggles (render-time reset — React batches
  // this before paint, no double render).
  if (prevLanguage !== language) {
    setPrevLanguage(language);
    setMessages(language === "ar" ? initialMessagesAr : initialMessagesEn);
    setDialogueIdx(0);
    setIsTyping(false);
  }

  // Scroll to bottom helper
  const scrollToBottom = () => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const currentDialogues = language === "ar" ? dialoguesAr : dialoguesEn;

  // Handle simulated message send
  const handleSendSim = () => {
    if (isTyping) return;

    const idx = dialogueIdx % currentDialogues.length;
    const dialog = currentDialogues[idx];

    // 1. Add customer message
    setMessages((prev) => [...prev, { sender: "customer", text: dialog.customer }]);
    setDialogueIdx((prev) => prev + 1);

    // 2. Set typing state
    setIsTyping(true);

    // 3. Add bot reply after delay
    setTimeout(() => {
      setMessages((prev) => [...prev, { sender: "bot", text: dialog.bot }]);
      setIsTyping(false);
    }, 1200);
  };

  // Preview next user question in the input field
  const nextInputPreview = currentDialogues[dialogueIdx % currentDialogues.length].customer;

  return (
    <section id="hero" className="relative overflow-hidden pt-14 pb-20 sm:pt-20 sm:pb-28">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(139,92,246,0.12),rgba(9,8,15,0)_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.1),transparent_40%)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
      </div>

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Hero text information */}
          <div className="flex flex-col text-start lg:col-span-7">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl leading-[1.15] text-gradient-brand">
              {language === "ar" ? "أتمتة خدمة العملاء لعملك بذكاء اصطناعي خارق" : "Automate Customer Support for Your Business with Superpower AI"}
            </h1>
            <p className="mt-6 text-base sm:text-lg leading-relaxed text-gray-300 max-w-2xl">
              {language === "ar"
                ? "مور ريبونس (More Response) هي لوحة التحكم السحابية الموحدة للرد التلقائي وإدارة المحادثات. اربط قنوات الواتساب والرسائل النصية والبريد الإلكتروني وأتمت خدمة عملائك بذكاء متكامل لمختلف التخصصات والشركات."
                : "More Response is a unified cloud control panel for automated replies and conversation management. Connect WhatsApp, SMS, and Email to automate your customer service with integrated intelligence for various industries and businesses."}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button
                href="/welcome"
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border-0 shadow-lg shadow-purple-950/40"
              >
                {language === "ar" ? "ابدأ تجربتك المجانية" : "Start Your Free Trial"}
                <ArrowRight size={18} className="ml-1.5 rtl:mr-1.5 rtl:ml-0" aria-hidden="true" />
              </Button>
              <Button
                href="#showcase"
                variant="outline"
                size="lg"
                className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
              >
                {language === "ar" ? "شاهد لوحة التحكم" : "Explore Dashboard"}
              </Button>
            </div>
          </div>

          {/* Interactive Chat Simulator */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-[430px] rounded-2xl border border-[#24213f] bg-[#151324] shadow-2xl overflow-hidden flex flex-col">
              {/* Simulator Header */}
              <div className="flex items-center justify-between border-b border-[#24213f] bg-black/10 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-xs">
                    AI
                  </div>
                  <div className="text-start">
                    <div className="text-sm font-semibold text-white">
                      {language === "ar" ? "المساعد الذكي (MoreBot)" : "Smart Assistant (MoreBot)"}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {language === "ar" ? "نشط الآن" : "Active now"}
                    </div>
                  </div>
                </div>
                <MessageSquare size={18} className="text-gray-500" />
              </div>

              {/* Simulator Messages */}
              <div
                ref={chatBodyRef}
                className="h-[300px] p-5 overflow-y-auto flex flex-col gap-4 text-xs sm:text-sm"
              >
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-xl leading-relaxed ${
                      msg.sender === "customer"
                        ? "bg-[#24213f] text-gray-100 self-start rounded-br-none"
                        : "bg-purple-950/20 border border-purple-500/20 text-purple-300 self-end rounded-bl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}

                {isTyping && (
                  <div className="bg-purple-950/20 border border-purple-500/20 text-purple-300 self-end rounded-xl rounded-bl-none px-4 py-3 flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
              </div>

              {/* Simulator Input Bar */}
              <div className="border-t border-[#24213f] bg-black/20 p-4 flex gap-3 items-center">
                <div className="flex-1 bg-[#09080f]/50 border border-[#24213f] rounded-lg px-3 py-2 text-start text-xs text-gray-400 h-9 line-clamp-1 flex items-center select-none overflow-hidden">
                  {nextInputPreview}
                </div>
                <button
                  onClick={handleSendSim}
                  disabled={isTyping}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-white transition-all select-none ${
                    isTyping
                      ? "bg-purple-500/20 text-purple-400/50 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-500 cursor-pointer shadow-md shadow-purple-950/30"
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
