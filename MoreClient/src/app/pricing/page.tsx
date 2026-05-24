"use client";

import { Check } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { Section, SectionHeading } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function PricingPage() {
  const { t } = useLanguage();

  const plans = [
    {
      name: t("planFreeName"),
      price: t("planFreePrice"),
      desc: t("planFreeDesc"),
      featured: false,
      cta: t("pricingStartFree"),
      features: [t("planFreeLimit"), t("featBilingualRag"), t("featOmnichannel")],
    },
    {
      name: t("planPro"),
      price: t("proPrice"),
      desc: t("planProDesc"),
      featured: true,
      cta: t("pricingGetPro"),
      features: [
        t("proLimit"),
        t("featBilingualRag"),
        t("featChromaVector"),
        t("featOmnichannel"),
        t("featHumanHandoff"),
        t("featAnalyticsDash"),
      ],
    },
    {
      name: t("planUltra"),
      price: t("ultraPrice"),
      desc: t("planUltraDesc"),
      featured: false,
      cta: t("pricingGetUltra"),
      features: [
        t("ultraLimit"),
        t("featAllProBenefits"),
        t("featSlaGuarantee"),
        t("featPriorityHandoff"),
      ],
    },
  ];

  return (
    <main id="top" className="min-h-screen bg-[#050508]">
      <LandingNav />

      <Section id="pricing">
        <SectionHeading
          eyebrow={t("pricingEyebrow")}
          title={t("pricingPageTitle")}
          subtitle={t("pricingPageSubtitle")}
        />

        <div className="mt-14 grid items-start gap-6 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
                className={`relative rounded-xl border p-7 ${
                  p.featured
                    ? "border-brand-500/40 bg-[#0d0d15] shadow-[var(--shadow-brand)] lg:-mt-4 lg:mb-4"
                    : "border-[var(--border)] bg-[var(--card-bg)]"
              }`}
            >
              {p.featured ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge tone="solid">{t("pricingMostPopular")}</Badge>
                </div>
              ) : null}
              <h3 className="text-lg font-semibold text-white">{p.name}</h3>
              <p className="mt-1 text-sm text-gray-400">{p.desc}</p>
              <div className="mt-5">
                <span className="text-4xl font-bold text-white">{p.price}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-gray-300">
                    <Check size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-brand-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                href="/welcome"
                variant={p.featured ? "primary" : "outline"}
                className="mt-7 w-full"
              >
                {p.cta}
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-gray-500">{t("pricingFooterNote")}</p>
      </Section>

      <LandingFooter />
    </main>
  );
}
