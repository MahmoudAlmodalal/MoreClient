"use client";

import { Check } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";

export function Pricing() {
  const { language } = useLanguage();

  const plansAr = [
    {
      name: "الباقة الأساسية",
      price: "$99",
      desc: "باقة البداية الأساسية للفرق الصغيرة التي تبدأ بالدعم الذكي.",
      featured: false,
      cta: "ابدأ الباقة الأساسية",
      features: [
        "10,000 رسالة مؤتمتة / شهرياً",
        "2 من قنوات مدراء الدعم",
        "لوحة تحكم وإحصائيات عامة",
        "ربط خادم قواعد بيانات واحد",
      ],
    },
    {
      name: "الباقة الممتازة",
      price: "$199",
      desc: "الأكثر شعبية للفرق المتنامية التي تحتاج ميزات ذكاء اصطناعي وقنوات دعم إضافية.",
      featured: true,
      cta: "ابدأ تجربة مجانية",
      features: [
        "50,000 رسالة مؤتمتة / شهرياً",
        "10 من مدراء قنوات الدعم",
        "روبوت محادثة تفاعلي متقدم بالذكاء",
        "تحليلات متقدمة وقناة دعم مخصصة",
      ],
    },
    {
      name: "الباقة المؤسسية",
      price: "$399",
      desc: "للشركات الكبرى التي تتطلب استضافة مخصصة وتكاملات برمجية غير محدودة.",
      featured: false,
      cta: "تواصل مع المبيعات",
      features: [
        "200,000 رسالة مؤتمتة / شهرياً",
        "عدد غير محدود من المدراء",
        "خادم واستضافة مخصصة بالكامل",
        "تكامل برمجي مخصص (Custom Webhooks)",
      ],
    },
  ];

  const plansEn = [
    {
      name: "Basic Plan",
      price: "$99",
      desc: "Starter package for small teams beginning with smart AI support.",
      featured: false,
      cta: "Get Started",
      features: [
        "10,000 automated messages / month",
        "2 support channel managers",
        "Dashboard and general statistics",
        "Connection of one database server node",
      ],
    },
    {
      name: "Premium Plan",
      price: "$199",
      desc: "Most popular for growing teams needing AI capabilities and extra channels.",
      featured: true,
      cta: "Start Free Trial",
      features: [
        "50,000 automated messages / month",
        "10 support channel managers",
        "Advanced AI-powered interactive chatbot",
        "Advanced analytics and dedicated support channel",
      ],
    },
    {
      name: "Enterprise Plan",
      price: "$399",
      desc: "For large organizations requiring custom hosting and unlimited integrations.",
      featured: false,
      cta: "Contact Sales",
      features: [
        "200,000 automated messages / month",
        "Unlimited support channel managers",
        "Fully dedicated hosting and server",
        "Custom API & webhook integrations",
      ],
    },
  ];

  const plans = language === "ar" ? plansAr : plansEn;

  return (
    <section id="pricing" className="relative py-20 border-t border-border-custom bg-background">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Section Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            {language === "ar" ? "خطط الأسعار المرنة" : "Flexible Pricing Plans"}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-text-muted">
            {language === "ar"
              ? "اختر الباقة المناسبة لحجم ونشاط عملك وابدأ أتمتة دعم عملائك اليوم"
              : "Choose the package tailored to your business scale and start automating customer support today"}
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 ${
                p.featured
                  ? "border-brand-500 bg-card shadow-md lg:-mt-4 lg:mb-4"
                  : "border-border-custom bg-card hover:border-brand-500/30"
              }`}
            >
              {p.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">
                  {language === "ar" ? "الأكثر شعبية" : "Most Popular"}
                </div>
              )}

              <div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground">{p.name}</h3>
                <p className="mt-2 text-xs sm:text-sm text-text-muted min-h-[36px]">{p.desc}</p>
                
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-foreground">{p.price}</span>
                  <span className="text-xs sm:text-sm text-text-muted font-medium ml-1.5 rtl:mr-1.5 rtl:ml-0">
                    / {language === "ar" ? "شهرياً" : "month"}
                  </span>
                </div>

                <ul className="mt-8 space-y-4">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/80">
                      <Check size={16} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                href="/welcome"
                variant={p.featured ? "primary" : "outline"}
                className="mt-8 w-full font-semibold"
              >
                {p.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
