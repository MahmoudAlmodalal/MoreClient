"use client";

import { useState } from "react";
import {
  Home as HomeIcon,
  Layers,
  Users,
  FileText,
  BarChart3,
  Settings,
  Bell,
  Clock,
  Star,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export function Showcase() {
  const { language } = useLanguage();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const nodesAr = [
    { id: "home", label: "الرئيسية", desc: "الدخول: 1,850", info: "زيارات الموقع المباشرة" },
    { id: "features", label: "المميزات", desc: "الاستبقاء: 78%", info: "تصفح الخصائص والمقارنات" },
    { id: "signup", label: "التسجيل", desc: "التحويل: 42%", info: "إنشاء حسابات تجريبية جديدة" },
    { id: "active", label: "نشط الآن", desc: "الترقية: 15%", info: "الربط الفعلي بقنوات المحادثة" },
  ];

  const nodesEn = [
    { id: "home", label: "Home", desc: "Entry: 1,850", info: "Direct landing page visits" },
    { id: "features", label: "Features", desc: "Retention: 78%", info: "Feature grid interactions" },
    { id: "signup", label: "Sign Up", desc: "Conversion: 42%", info: "New trial account signups" },
    { id: "active", label: "Active", desc: "Upgrade: 15%", info: "Omnichannel bot deployment" },
  ];

  const nodes = language === "ar" ? nodesAr : nodesEn;

  return (
    <section id="showcase" className="border-b border-border-custom bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mb-14 max-w-2xl text-start sm:mb-16">
          <p className="text-xs font-bold tracking-[0.12em] text-accent">
            {language === "ar" ? "عرض المنتج" : "PRODUCT OVERVIEW"}
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.03em] text-foreground sm:text-4xl">
            {language === "ar" ? "رؤية أوضح لكل محادثة وقرار." : "A clearer view of every conversation and decision."}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-foreground/65 sm:text-base">
            {language === "ar"
              ? "راقب أداء القنوات، ترتيب أولويات الفريق، ومسار العميل من لوحة تحكم واحدة."
              : "Monitor channel performance, team priorities, and customer journeys from one operating view."}
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-border-custom bg-card shadow-lg">
          <div className="flex flex-col md:flex-row">
            <aside className="flex w-full items-center justify-between border-b border-border-custom bg-sidebar px-5 py-4 md:w-16 md:flex-col md:justify-start md:gap-7 md:border-b-0 md:border-e md:px-0 md:py-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-xs font-bold text-accent shadow-sm">M</div>
              <div className="flex gap-5 text-foreground/45 md:flex-col md:gap-5">
                <HomeIcon size={18} className="text-accent" />
                <Layers size={18} />
                <Users size={18} />
                <FileText size={18} />
                <BarChart3 size={18} />
              </div>
              <Settings size={18} className="text-foreground/45 md:mt-auto" />
            </aside>

            <div className="flex-1 p-5 text-start sm:p-7">
              <div className="flex items-center justify-between border-b border-border-custom pb-4">
                <div>
                  <h3 className="text-base font-bold tracking-tight text-foreground">
                    {language === "ar" ? "لوحة الإدارة - MORE Response" : "MORE Response Dashboard"}
                  </h3>
                  <p className="mt-1 text-[11px] text-foreground/55">
                    {language === "ar" ? "آخر مزامنة قبل دقيقة" : "Last synced one minute ago"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden items-center gap-1.5 text-[11px] font-semibold text-mint sm:flex">
                    <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                    {language === "ar" ? "النظام متصل" : "System connected"}
                  </span>
                  <Bell size={16} className="text-foreground/55" />
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-accent dark:bg-brand-50/40">S</div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border-custom bg-background/45 p-4">
                  <span className="text-xs font-medium text-foreground/55">{language === "ar" ? "التحويلات النشطة" : "Active Conversions"}</span>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold tracking-tight text-foreground">1,425</span>
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-mint"><TrendingUp size={10} /> +12.4%</span>
                  </div>
                  <svg className="mt-4 h-7 w-full" viewBox="0 0 100 25" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M0 20 Q15 5, 30 15 T60 8 T90 2 T100 12" fill="none" stroke="currentColor" className="text-accent" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>

                <div className="rounded-lg border border-border-custom bg-background/45 p-4">
                  <span className="text-xs font-medium text-foreground/55">{language === "ar" ? "متوسط سرعة الاستجابة" : "Avg. Resolution Time"}</span>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold tracking-tight text-foreground">2 mins</span>
                    <Clock size={16} className="text-accent" />
                  </div>
                  <svg className="mt-4 h-7 w-full" viewBox="0 0 100 25" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M0 15 Q25 22, 50 10 T90 18 T100 5" fill="none" stroke="currentColor" className="text-accent" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>

                <div className="rounded-lg border border-border-custom bg-background/45 p-4">
                  <span className="text-xs font-medium text-foreground/55">{language === "ar" ? "معدل رضا العملاء" : "Customer Satisfaction"}</span>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold tracking-tight text-foreground">4.9 / 5</span>
                    <div className="flex gap-0.5 text-accent" aria-label="Five star rating">
                      {Array.from({ length: 5 }).map((_, index) => <Star key={index} size={12} fill="currentColor" />)}
                    </div>
                  </div>
                  <svg className="mt-4 h-7 w-full" viewBox="0 0 100 25" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M0 12 Q30 5, 60 10 T90 2 T100 3" fill="none" stroke="currentColor" className="text-accent" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              <div className="relative mt-5 rounded-lg border border-border-custom bg-background/45 p-5">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-sm font-bold text-foreground">{language === "ar" ? "مسارات المستخدمين والاحتفاظ" : "Customer journeys"}</h4>
                  <span className="text-[11px] font-semibold text-foreground/55">{language === "ar" ? "تحديث مباشر" : "Live view"}</span>
                </div>

                <div className="relative mt-5 flex flex-col items-center gap-3 md:flex-row md:justify-between md:gap-2">
                  <div className="absolute left-10 right-10 top-1/2 hidden h-px -translate-y-1/2 bg-border-custom md:block" />
                  {nodes.map((node, index) => (
                    <div key={node.id} className="relative flex w-full items-center md:w-auto">
                      <div
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        className={`relative w-full cursor-pointer rounded-lg border px-3 py-3 text-center transition-colors md:w-36 ${
                          hoveredNode === node.id ? "border-accent bg-brand-50/50 dark:bg-brand-50/20" : "border-border-custom bg-card"
                        }`}
                      >
                        <div className="text-xs font-bold text-foreground">{node.label}</div>
                        <div className="mt-1 text-[10px] font-medium text-foreground/55">{node.desc}</div>
                        <div className={`absolute -bottom-12 left-1/2 z-20 w-44 -translate-x-1/2 rounded-md border border-border-custom bg-card p-2 text-[10px] text-foreground shadow-md transition-all duration-150 pointer-events-none ${hoveredNode === node.id ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}>
                          {node.info}
                        </div>
                      </div>
                      {index < nodes.length - 1 && <ArrowRight size={15} className="mx-auto my-1.5 shrink-0 rotate-90 text-foreground/35 md:mx-2 md:my-0 md:rotate-0" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-foreground/55">
          {language === "ar" ? "واجهة واحدة تساعد فريقك على رؤية الصورة كاملة." : "One operating view to help your team see the full picture."}
        </p>
      </div>
    </section>
  );
}
