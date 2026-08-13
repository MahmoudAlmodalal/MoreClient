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
    { title: "صندوق الوارد الموحد", desc: "قناة مركزية موحدة لـ WhatsApp وSMS والبريد الإلكتروني للرد على الجميع في مكان واحد.", icon: Inbox },
    { title: "ذكاء اصطناعي تفصيلي", desc: "روبوتات ذكية تفهم سياق المحادثة ونبرة العميل وتتحدث بأسلوب بشري طبيعي.", icon: BrainCircuit },
    { title: "التحليلات التنبؤية", desc: "بيانات ورؤى مدعومة بالذكاء الاصطناعي لمساعدتك على اتخاذ القرارات وتوسيع حجم عملك.", icon: TrendingUp },
    { title: "قاعدة بيانات معزولة", desc: "أقصى درجات الأمان وحماية الخصوصية عبر بنية قواعد بيانات منفصلة لكل منشأة.", icon: ShieldAlert },
    { title: "تكاملات برمجية مرنة", desc: "اربط المنصة بسهولة مع سلة (Salla)، وزيد (Zid)، وأنظمة المبيعات والـ ERP الخاصة بك.", icon: Combine },
    { title: "إدارة صلاحيات الفريق", desc: "تحكم كامل وتوزيع للأدوار والصلاحيات للموظفين ومدراء قنوات الدعم.", icon: Users2 },
  ];

  const featuresEn = [
    { title: "Unified Inbox", desc: "A single, centralized hub for managing WhatsApp, SMS, and Email conversations in one place.", icon: Inbox },
    { title: "Nuanced AI", desc: "Conversational chatbots that understand context, tone, and provide human-like helpful answers.", icon: BrainCircuit },
    { title: "Predictive Analytics", desc: "Data-driven AI insights and projections to scale support operations and grow your business.", icon: TrendingUp },
    { title: "Dedicated Data", desc: "Maximum enterprise security and compliance with isolated, single-tenant databases.", icon: ShieldAlert },
    { title: "Flexible Integrations", desc: "Connect effortlessly to Salla, Zid, Custom APIs, and your local ERP systems via Webhooks.", icon: Combine },
    { title: "Role-Based Access", desc: "Full administrative control, team permissions, and structured role management for support agents.", icon: Users2 },
  ];

  const features = language === "ar" ? featuresAr : featuresEn;

  return (
    <section id="features" className="border-b border-border-custom bg-card py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto mb-20 max-w-4xl border-s-2 border-accent ps-6 text-start sm:ps-8">
          <p className="text-xs font-bold tracking-[0.12em] text-accent">
            {language === "ar" ? "رؤيتنا وقيمنا" : "OUR BRAND PROMISE"}
          </p>
          <p className="mt-4 text-lg font-medium leading-8 text-foreground/80 sm:text-xl">
            {language === "ar"
              ? "نحن نبني علاقات، لا مجرد برمجيات. تجمع MORE Response قنوات التواصل الرئيسية مع بنية مخصصة لكل عميل، لتبقى بياناتك منظمة وقابلة للثقة بينما يركز فريقك على خدمة أفضل."
              : "We build relationships, not just software. MORE Response brings core communication channels together with dedicated customer architecture, so your data stays organized and your team can focus on better service."}
          </p>
        </div>

        <div className="mb-14 max-w-2xl text-start sm:mb-16">
          <p className="text-xs font-bold tracking-[0.12em] text-accent">
            {language === "ar" ? "كل ما تحتاجه في مكان واحد" : "ONE CONNECTED WORKSPACE"}
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.03em] text-foreground sm:text-4xl">
            {language === "ar" ? "بُنيت للمؤسسات، وصُممت لفرق العمل." : "Built for enterprise. Designed for the team using it."}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-foreground/65 sm:text-base">
            {language === "ar"
              ? "أدوات عملية لفهم المحادثات، تنظيم الفريق، واتخاذ القرار من شاشة واحدة."
              : "Practical tools to understand conversations, organize your team, and make decisions from a single workspace."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="group rounded-xl border border-border-custom bg-background/35 p-6 text-start transition-colors duration-200 hover:border-accent/40 hover:bg-background"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-accent dark:bg-brand-50/40">
                  <Icon size={19} aria-hidden="true" />
                </div>
                <h3 className="mt-6 text-base font-bold text-foreground sm:text-lg">{feature.title}</h3>
                <p className="mt-2.5 text-sm leading-6 text-foreground/65">{feature.desc}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
