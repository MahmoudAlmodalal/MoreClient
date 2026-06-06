"use client";

import {
  Bot,
  Globe2,
  BarChart3,
  Database,
  KeyRound,
  Users,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export function FeatureGrid() {
  const { language } = useLanguage();

  const featuresAr = [
    {
      title: "ردود ذكية مؤتمتة",
      desc: "روبوت ذكاء اصطناعي تفاعلي يفهم أسئلة عملائك ويجيب عليها فوراً بناء على مستندات قاعدة المعرفة المرفوعة الخاصة بك.",
      icon: Bot,
      accent: "text-brand-600 dark:text-brand-400 bg-brand-500/10 border-brand-500/20",
    },
    {
      title: "قنوات تراسل موحدة",
      desc: "اربط قنوات الواتساب والرسائل النصية والبريد الإلكتروني وتفاعل مع كافة المحادثات من واجهة موحدة.",
      icon: Globe2,
      accent: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
    },
    {
      title: "تقارير وإحصائيات متكاملة",
      desc: "لوحة إحصائيات متقدمة لحجم استهلاك الرسائل، سرعة استجابة عقد الـ API، وسجل اشتراكات العملاء.",
      icon: BarChart3,
      accent: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "قواعد بيانات مخصصة",
      desc: "تخزين آمن ومحمي بالكامل عبر تقسيم قواعد بيانات المشتركين على خوادم إقليمية لسرعة استجابة خارقة.",
      icon: Database,
      accent: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "ربط برمجي مرن (Webhooks)",
      desc: "مفاتيح وصول الـ API وربط فوري للتحديثات التلقائية لتكامل سلس مع متاجر سلة أو أنظمة الـ ERP الخاصة بك.",
      icon: KeyRound,
      accent: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    },
    {
      title: "إدارة الصلاحيات والفرق",
      desc: "إضافة مدراء وموظفي دعم، وتحديد صلاحيات الوصول إلى القنوات المختلفة والتحكم في إعدادات عقد التشغيل.",
      icon: Users,
      accent: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
    },
  ];

  const featuresEn = [
    {
      title: "Smart Automated Replies",
      desc: "An interactive AI chatbot that understands customer questions and replies instantly based on your uploaded knowledge base documents.",
      icon: Bot,
      accent: "text-brand-600 dark:text-brand-400 bg-brand-500/10 border-brand-500/20",
    },
    {
      title: "Unified Messaging Channels",
      desc: "Connect WhatsApp, SMS, and Email channels and engage with all conversations from one unified interface.",
      icon: Globe2,
      accent: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
    },
    {
      title: "Integrated Reports & Analytics",
      desc: "Advanced statistics dashboard for message volume, API node latency, and client subscription tracking.",
      icon: BarChart3,
      accent: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Dedicated Databases & Nodes",
      desc: "Fully secure and isolated storage by partitioning tenant databases across regional sharding nodes.",
      icon: Database,
      accent: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Flexible API & Webhooks",
      desc: "Access tokens and instant update webhooks for seamless integrations with Salla, Zid, or your local ERP system.",
      icon: KeyRound,
      accent: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    },
    {
      title: "Team & Permission Management",
      desc: "Add admins and support agents, define access permissions for different channels, and manage deployment node settings.",
      icon: Users,
      accent: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
    },
  ];

  const features = language === "ar" ? featuresAr : featuresEn;

  return (
    <section id="features" className="relative py-20 bg-background border-t border-border-custom">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Section Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            {language === "ar" ? "مميزات خارقة لنمو أعمالك" : "Supercharged Features for Business Growth"}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-text-muted">
            {language === "ar"
              ? "كل ما تحتاجه للتحكم الشامل ببيانات وقنوات تواصل عملائك في لوحة تحكم واحدة"
              : "Everything you need for unified control over customer data and messaging channels in a single dashboard"}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-border-custom bg-card p-6 text-start transition-all duration-300 hover:border-accent hover:shadow-md hover:-translate-y-1"
              >
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border ${f.accent}`}>
                  <Icon size={20} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-xs sm:text-sm leading-relaxed text-text-muted">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
