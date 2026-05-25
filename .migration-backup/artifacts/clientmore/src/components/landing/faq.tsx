"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export function Faq() {
  const { t, language } = useLanguage();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const itemsAr = [
    {
      q: "ما هي منصة مور ريبونس (More Response)؟",
      a: "منصة مور ريبونس هي نظام SaaS سحابي مصمم للشركات والمؤسسات والعيادات بمختلف التخصصات. تتيح لك أتمتة الردود على عملائك تلقائياً عبر قنوات مختلفة كالواتساب (WhatsApp API)، الرسائل القصيرة (SMS)، والبريد الإلكتروني، وتتبع أدائهم من خلال لوحة تحكم واحدة موحدة.",
    },
    {
      q: "هل يتطلب النظام خبيراً برمجياً لإعداده وتثبيته؟",
      a: "لا، لقد قمنا بتبسيط واجهة الاستخدام لتتمكن من التسجيل والبدء فوراً. كل ما عليك فعله هو اختيار الباقة، تعبئة بيانات شركتك، وسيقوم النظام بتوجيهك خطوة بخطوة للربط مع بوابات التراسل دون الحاجة لكتابة أي كود برمجي.",
    },
    {
      q: "هل يمكنني ربط المنصة ببرامج إدارة المستودعات والـ CRM الخاصة بي؟",
      a: "نعم بالطبع. توفر الباقتان الممتازة والمؤسسية دعماً كاملاً لواجهة برمجة التطبيقات (API Access Tokens) وربط الـ Webhooks، مما يتيح ترحيل البيانات تلقائياً وتكامل المحادثات الفورية مع برامج المبيعات وإدارة شؤون الموظفين الخاصة بك.",
    },
    {
      q: "هل توفر المنصة فترة تجريبية مجانية؟",
      a: "نعم، نوفر فترة تجربة مجانية تمكنك من استكشاف كافة خواص لوحة التحكم العامة وإرسال رسائل تجريبية واختبار أداء المساعد الآلي الذكي قبل الالتزام بالدفع الفعلي للباقات.",
    },
    {
      q: "أين يتم استضافة بيانات المحادثات وسجل العملاء؟",
      a: "نقوم بتوزيع واستضافة البيانات بشكل آمن للغاية عبر عقد قواعد البيانات الإقليمية (مثل Frankfurt وعمان والمنامة). هذا يساعد في تقليل سرعة الاستجابة إلى 124 مللي ثانية ويضمن التوافق الكامل مع قوانين حماية خصوصية البيانات المحلية.",
    },
  ];

  const itemsEn = [
    {
      q: "What is More Response?",
      a: "More Response is a unified cloud SaaS platform designed for companies, clinics, and businesses of various specialties. It allows you to automate replies to your customers across channels like WhatsApp (WhatsApp API), SMS, and Email, and track their performance via a single dashboard.",
    },
    {
      q: "Does the system require programming expertise to set up?",
      a: "No, we have simplified the user interface so you can sign up and start immediately. All you need to do is choose a plan, fill in your company details, and the system will guide you step-by-step to connect with messaging gateways without writing code.",
    },
    {
      q: "Can I integrate the platform with my CRM or inventory systems?",
      a: "Yes, absolutely. Both Premium and Enterprise plans offer full support for API access tokens and Webhook integrations, allowing automated data synchronization with your existing sales and employee management software.",
    },
    {
      q: "Does the platform offer a free trial?",
      a: "Yes, we provide a free trial period that allows you to explore all generic dashboard features, send test messages, and evaluate the AI automation agent before committing to any paid plan.",
    },
    {
      q: "Where are chat logs and customer databases hosted?",
      a: "We host and distribute data securely across regional database nodes (such as Frankfurt, Amman, and Manama). This helps minimize response latency to 124ms and ensures full compliance with local data protection regulations.",
    },
  ];

  const items = language === "ar" ? itemsAr : itemsEn;

  return (
    <section id="faq" className="relative py-20 border-t border-[#24213f]">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Section Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            {language === "ar" ? "الأسئلة الشائعة" : "Frequently Asked Questions"}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-gray-400">
            {language === "ar"
              ? "إليك إجابات لأكثر الأسئلة تداولاً حول كيفية عمل المنصة وطرق الربط والاستضافة"
              : "Here are answers to the most common questions about the platform, integrations, and hosting"}
          </p>
        </div>

        {/* Accordion List */}
        <div className="mx-auto max-w-3xl space-y-4">
          {items.map((item, i) => {
            const isOpen = openIdx === i;
            return (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-white/5 bg-[#151324]/40 transition-colors duration-200 hover:border-purple-500/20"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start font-semibold text-xs sm:text-sm text-white focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-purple-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 animate-slideDown">
                    <p className="text-xs sm:text-sm leading-relaxed text-gray-400">
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
