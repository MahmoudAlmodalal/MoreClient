"use client";

import { Check } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";

export function Pricing() {
  const { language } = useLanguage();

  const plansAr = [
    {
      id: "starter",
      name: "الباقة الأساسية (Starter)",
      price: "$20",
      desc: "لتوفير الدعم الفني الأساسي للفرق الصغيرة وبدء الأتمتة.",
      featured: false,
      cta: "ابدأ الآن",
      features: [
        "1,000 رسالة مؤتمتة / شهرياً",
        "مدير قناة دعم واحد",
        "تحليلات لوحة التحكم الأساسية",
        "الدعم القياسي"
      ],
    },
    {
      id: "professional",
      name: "الباقة الاحترافية (Professional)",
      price: "$50",
      desc: "الخيار الأفضل للشركات النامية لتوسيع الأتمتة والتحليلات.",
      featured: true,
      label: "موصى به",
      cta: "جربه مجاناً",
      features: [
        "10,000 رسالة مؤتمتة / شهرياً",
        "5 مدراء قنوات دعم",
        "التحليلات التنبؤية المتقدمة",
        "الدعم ذو الأولوية"
      ],
    },
    {
      id: "team",
      name: "باقة الفريق (Team)",
      price: "$100",
      desc: "للمؤسسات والفرق الكبيرة التي تبحث عن أقصى درجات الأتمتة.",
      featured: false,
      cta: "تواصل مع المبيعات",
      features: [
        "50,000 رسالة مؤتمتة / شهرياً",
        "عدد غير محدود من المدراء",
        "بنية تحتية وخوادم مخصصة بالكامل",
        "مدير حساب مخصص على مدار الساعة"
      ],
    },
  ];

  const plansEn = [
    {
      id: "starter",
      name: "Starter",
      price: "$20",
      desc: "Starter package for small teams beginning with smart AI support.",
      featured: false,
      cta: "Get Started",
      features: [
        "1,000 Automated Messages/month",
        "1 Channel Manager",
        "Core Dashboard Analytics",
        "Standard Support"
      ],
    },
    {
      id: "professional",
      name: "Professional",
      price: "$50",
      desc: "Most popular for growing teams needing AI capabilities and extra channels.",
      featured: true,
      label: "RECOMMENDED",
      cta: "Try For Free",
      features: [
        "10,000 Automated Messages/month",
        "5 Channel Managers",
        "Advanced Predictive Analytics",
        "Priority Support"
      ],
    },
    {
      id: "team",
      name: "Team",
      price: "$100",
      desc: "For large organizations requiring custom scaling and full infrastructure.",
      featured: false,
      cta: "Contact Sales",
      features: [
        "50,000 Automated Messages/month",
        "Unlimited Managers",
        "Full Dedicated Infrastructure",
        "24/7 Dedicated Account Manager"
      ],
    },
  ];

  const plans = language === "ar" ? plansAr : plansEn;

  return (
    <section id="pricing" className="relative py-24 bg-background border-t border-border-custom">
      {/* Glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#7B61FF]/5 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {language === "ar" ? "خطط الأسعار المرنة" : "Simple, Transparent Pricing"}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-foreground/70 dark:text-[#8e8eb2]">
            {language === "ar"
              ? "اختر الباقة المناسبة لحجم ونشاط عملك وابدأ أتمتة دعم عملائك اليوم."
              : "Choose the package tailored to your business scale and start automating customer support today."}
          </p>
        </div>

        {/* Pricing Cards Stack / Grid */}
        <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-3 items-stretch max-w-5xl mx-auto">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`relative rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 transform hover:-translate-y-1 ${
                p.featured
                  ? "bg-[#7B61FF] text-white shadow-[0_20px_40px_rgba(123,97,255,0.25)] border border-white/10 scale-102 z-10"
                  : "bg-card text-foreground border border-border-custom shadow-lg hover:border-[#7B61FF]/30"
              }`}
            >
              {p.featured && p.label && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#00FFCC] text-[#101020] px-4 py-1 text-[10px] font-black uppercase tracking-wider shadow-[0_4px_10px_rgba(0,255,204,0.3)]">
                  {p.label}
                </div>
              )}

              <div>
                <h3 className={`text-lg sm:text-xl font-black ${p.featured ? "text-white" : "text-foreground"}`}>
                  {p.name}
                </h3>
                <p className={`mt-2.5 text-xs sm:text-sm leading-relaxed ${p.featured ? "text-white/80" : "text-foreground/70 dark:text-[#8e8eb2]"}`}>
                  {p.desc}
                </p>
                
                {/* Price Display */}
                <div className="mt-8 flex items-baseline gap-1">
                  <span className={`text-4xl sm:text-5xl font-black tracking-tight ${p.featured ? "text-white" : "text-foreground"}`}>
                    {p.price}
                  </span>
                  <span className={`text-xs sm:text-sm font-semibold ml-1.5 rtl:mr-1.5 rtl:ml-0 ${p.featured ? "text-white/70" : "text-foreground/60 dark:text-[#8e8eb2]"}`}>
                    / {language === "ar" ? "شهرياً" : "month"}
                  </span>
                </div>

                {/* Features List */}
                <ul className="mt-8 space-y-4">
                  {p.features.map((f, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-3 text-xs sm:text-sm">
                      <div className={`mt-0.5 shrink-0 rounded-full p-0.5 flex items-center justify-center ${
                        p.featured ? "bg-white/20 text-white" : "bg-[#7B61FF]/20 text-[#7B61FF] dark:text-[#00FFCC]"
                      }`}>
                        <Check size={12} className="stroke-[3.5px]" />
                      </div>
                      <span className={p.featured ? "text-white" : "text-foreground/80 dark:text-[#d0d0eb]"}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <Button
                href="/welcome"
                className={`mt-10 w-full font-bold py-3.5 rounded-xl transition-all active:scale-95 shadow-md ${
                  p.featured
                    ? "bg-white text-[#7B61FF] hover:bg-white/90 shadow-[0_4px_15px_rgba(255,255,255,0.2)] border-none"
                    : "bg-transparent text-[#7B61FF] border border-[#7B61FF] hover:bg-[#7B61FF]/10"
                }`}
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
