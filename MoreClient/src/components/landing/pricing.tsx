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
      features: ["1,000 رسالة مؤتمتة / شهرياً", "مدير قناة دعم واحد", "تحليلات لوحة التحكم الأساسية", "الدعم القياسي"],
    },
    {
      id: "professional",
      name: "الباقة الاحترافية (Professional)",
      price: "$50",
      desc: "الخيار الأفضل للشركات النامية لتوسيع الأتمتة والتحليلات.",
      featured: true,
      label: "موصى به للفرق النامية",
      cta: "جربه مجاناً",
      features: ["10,000 رسالة مؤتمتة / شهرياً", "5 مدراء قنوات دعم", "التحليلات التنبؤية المتقدمة", "الدعم ذو الأولوية"],
    },
    {
      id: "team",
      name: "باقة الفريق (Team)",
      price: "$100",
      desc: "للمؤسسات والفرق الكبيرة التي تبحث عن أقصى درجات الأتمتة.",
      featured: false,
      cta: "تواصل مع المبيعات",
      features: ["50,000 رسالة مؤتمتة / شهرياً", "عدد غير محدود من المدراء", "بنية تحتية وخوادم مخصصة بالكامل", "مدير حساب مخصص على مدار الساعة"],
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
      features: ["1,000 Automated Messages/month", "1 Channel Manager", "Core Dashboard Analytics", "Standard Support"],
    },
    {
      id: "professional",
      name: "Professional",
      price: "$50",
      desc: "Most popular for growing teams needing AI capabilities and extra channels.",
      featured: true,
      label: "Recommended for growing teams",
      cta: "Try For Free",
      features: ["10,000 Automated Messages/month", "5 Channel Managers", "Advanced Predictive Analytics", "Priority Support"],
    },
    {
      id: "team",
      name: "Team",
      price: "$100",
      desc: "For large organizations requiring custom scaling and full infrastructure.",
      featured: false,
      cta: "Contact Sales",
      features: ["50,000 Automated Messages/month", "Unlimited Managers", "Full Dedicated Infrastructure", "24/7 Dedicated Account Manager"],
    },
  ];

  const plans = language === "ar" ? plansAr : plansEn;

  return (
    <section id="pricing" className="border-b border-border-custom bg-card py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center sm:mb-16">
          <p className="text-xs font-bold tracking-[0.12em] text-accent">
            {language === "ar" ? "خطط واضحة" : "CLEAR PLANS"}
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.03em] text-foreground sm:text-4xl">
            {language === "ar" ? "أسعار مباشرة تناسب مرحلة عملك." : "Straightforward pricing for the stage you are in."}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-foreground/65 sm:text-base">
            {language === "ar"
              ? "اختر الباقة المناسبة اليوم، ثم وسّعها عندما تتغير احتياجات فريقك."
              : "Choose the plan that fits today, then scale it as your team’s needs change."}
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl items-stretch gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-xl border p-7 ${
                plan.featured ? "border-accent bg-brand-50/45 dark:bg-brand-50/20" : "border-border-custom bg-background/35"
              }`}
            >
              {plan.featured && plan.label && (
                <p className="mb-6 w-fit rounded-md bg-accent px-2.5 py-1 text-[11px] font-bold text-white">
                  {plan.label}
                </p>
              )}
              <div>
                <h3 className="text-lg font-bold text-foreground sm:text-xl">{plan.name}</h3>
                <p className="mt-2.5 min-h-11 text-sm leading-6 text-foreground/65">{plan.desc}</p>
                <div className="mt-8 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-[-0.04em] text-foreground sm:text-5xl">{plan.price}</span>
                  <span className="ms-1 text-sm font-semibold text-foreground/55">/ {language === "ar" ? "شهرياً" : "month"}</span>
                </div>
                <ul className="mt-8 space-y-3.5 border-t border-border-custom pt-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-foreground/75">
                      <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-50 text-accent dark:bg-brand-50/40">
                        <Check size={11} strokeWidth={3} aria-hidden="true" />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                href="/welcome"
                className={`mt-10 w-full rounded-lg py-3 font-bold ${
                  plan.featured
                    ? "border-none bg-accent text-white hover:bg-accent-hover"
                    : "border-border-custom bg-card text-foreground hover:border-accent/50 hover:bg-background"
                }`}
              >
                {plan.cta}
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
