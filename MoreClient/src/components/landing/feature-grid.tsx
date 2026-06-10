"use client";

import {
  Inbox,
  BrainCircuit,
  TrendingUp,
  ShieldAlert,
  Combine,
  Users2,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export function FeatureGrid() {
  const { language } = useLanguage();

  const featuresAr = [
    {
      title: "صندوق الوارد الموحد",
      desc: "قناة مركزية موحدة لـ WhatsApp وSMS والبريد الإلكتروني للرد على الجميع في مكان واحد.",
      icon: Inbox,
    },
    {
      title: "ذكاء اصطناعي تفصيلي",
      desc: "روبوتات ذكية تفهم سياق المحادثة ونبرة العميل وتتحدث بأسلوب بشري طبيعي.",
      icon: BrainCircuit,
    },
    {
      title: "التحليلات التنبؤية",
      desc: "بيانات ورؤى مدعومة بالذكاء الاصطناعي لمساعدتك على اتخاذ القرارات وتوسيع حجم عملك.",
      icon: TrendingUp,
    },
    {
      title: "قاعدة بيانات معزولة",
      desc: "أقصى درجات الأمان وحماية الخصوصية عبر بنية قواعد بيانات منفصلة لكل منشأة.",
      icon: ShieldAlert,
    },
    {
      title: "تكاملات برمجية مرنة",
      desc: "اربط المنصة بسهولة مع سلة (Salla)، وزيد (Zid)، وأنظمة المبيعات والـ ERP الخاصة بك.",
      icon: Combine,
    },
    {
      title: "إدارة صلاحيات الفريق",
      desc: "تحتحكم كامل وتوزيع للأدوار والصلاحيات للموظفين ومدراء قنوات الدعم.",
      icon: Users2,
    },
  ];

  const featuresEn = [
    {
      title: "Unified Inbox",
      desc: "A single, centralized hub for managing WhatsApp, SMS, and Email conversations in one place.",
      icon: Inbox,
    },
    {
      title: "Nuanced AI",
      desc: "Conversational chatbots that understand context, tone, and provide human-like helpful answers.",
      icon: BrainCircuit,
    },
    {
      title: "Predictive Analytics",
      desc: "Data-driven AI insights and projections to scale support operations and grow your business.",
      icon: TrendingUp,
    },
    {
      title: "Dedicated Data",
      desc: "Maximum enterprise security and compliance with isolated, single-tenant databases.",
      icon: ShieldAlert,
    },
    {
      title: "Flexible Integrations",
      desc: "Connect effortlessly to Salla, Zid, Custom APIs, and your local ERP systems via Webhooks.",
      icon: Combine,
    },
    {
      title: "Role-Based Access",
      desc: "Full administrative control, team permissions, and structured role management for support agents.",
      icon: Users2,
    },
  ];

  const features = language === "ar" ? featuresAr : featuresEn;

  return (
    <section id="features" className="relative py-24 bg-background border-t border-border-custom">
      {/* Decorative Aura Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#7B61FF]/5 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        
        {/* Integrated Who We Are / Inspiration block */}
        <div className="max-w-4xl mx-auto mb-20 p-8 sm:p-10 rounded-2xl border border-border-custom bg-card/40 backdrop-blur-sm relative overflow-hidden text-center sm:text-start shadow-xl">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#00FFCC]/5 blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#7B61FF] to-[#00FFCC] p-[1px] flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,255,204,0.15)]">
              <div className="w-full h-full bg-card rounded-[11px] flex items-center justify-center text-[#7B61FF] dark:text-[#00FFCC] text-lg font-bold">
                M
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold tracking-widest text-[#7B61FF] dark:text-[#00FFCC] uppercase">
                {language === "ar" ? "رؤيتنا وقيمنا" : "Our Brand Promise"}
              </h3>
              <p className="text-sm sm:text-base leading-relaxed text-foreground/90 font-medium">
                {language === "ar"
                  ? "نحن نبني علاقات، لا مجرد برمجيات. MORE Response هو نظام أتمتة من الجيل القادم تم تصميمه لمساعدة الشركات والمتاجر الإلكترونية والعيادات على جسر الفجوة مع عملائهم. من خلال الدمج بين قنوات الواتساب المباشرة والرسائل النصية والبريد الإلكتروني مع بنية خوادم مخصصة لكل عميل، نضمن بقاء بيانات عملائك آمنة، سريعة، ومحلية."
                  : "We build relationships, not just software. MORE Response is a next-generation automation platform crafted to help companies, e-commerce stores, and clinics bridge the gap to their customers. By combining direct WhatsApp, SMS, and Email channels with single-tenant architecture, we ensure your client data remains secure, fast, and local."}
              </p>
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {language === "ar" ? "بُنيت للمؤسسات، صُممت لك." : "Built for Enterprise, Designed for You."}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-foreground/70 dark:text-[#8e8eb2]">
            {language === "ar"
              ? "كل ما يحتاجه فريقك للإدارة والتوسع، في عرض واحد."
              : "Everything your team needs to manage and scale, in one single view."}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group relative rounded-2xl border border-border-custom bg-card/85 p-7 text-start transition-all duration-300 hover:border-[#7B61FF]/40 hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_15px_30px_rgba(0,0,0,0.3)] overflow-hidden"
              >
                {/* Subtle corner violet light on hover */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#7B61FF] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Icon Container with Accent */}
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-foreground/[0.03] text-[#7B61FF] dark:text-[#00FFCC] group-hover:text-white group-hover:bg-[#7B61FF] border border-border-custom/50 transition-all duration-300">
                  <Icon size={20} aria-hidden="true" />
                </div>
                
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-2.5 transition-colors group-hover:text-[#7B61FF] dark:group-hover:text-[#00FFCC]">
                  {f.title}
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed text-foreground/70 dark:text-[#8e8eb2] group-hover:text-foreground/90 dark:group-hover:text-white/80 transition-colors">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
