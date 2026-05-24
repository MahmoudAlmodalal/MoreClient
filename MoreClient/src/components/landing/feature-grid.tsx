"use client";

import {
  BarChart3,
  Bolt,
  Globe2,
  Handshake,
  MonitorSmartphone,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Section, SectionHeading } from "@/components/ui/section";
import { Card } from "@/components/ui/card";

export function FeatureGrid() {
  const { t } = useLanguage();

  const features = [
    {
      title: t("featInstantTitle"),
      desc: t("featInstantDesc"),
      icon: Bolt,
      accent: "text-amber-300 bg-amber-400/10",
    },
    {
      title: t("featOmnichannelTitle"),
      desc: t("featOmnichannelDesc"),
      icon: Globe2,
      accent: "text-sky-300 bg-sky-400/10",
    },
    {
      title: t("featHandoffTitle"),
      desc: t("featHandoffDesc"),
      icon: Handshake,
      accent: "text-emerald-300 bg-emerald-400/10",
    },
    {
      title: t("featAnalyticsTitle"),
      desc: t("featAnalyticsDesc"),
      icon: BarChart3,
      accent: "text-brand-300 bg-brand-500/10",
    },
    {
      title: t("featUxTitle"),
      desc: t("featUxDesc"),
      icon: MonitorSmartphone,
      accent: "text-cyan-300 bg-cyan-400/10",
    },
    {
      title: t("featSecurityTitle"),
      desc: t("featSecurityDesc"),
      icon: ShieldCheck,
      accent: "text-rose-300 bg-rose-400/10",
    },
  ];

  return (
    <Section id="features">
      <SectionHeading
        eyebrow={t("featuresEyebrow")}
        title={t("featuresTitle")}
        subtitle={t("featuresSubtitle")}
      />
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => {
          const Icon = f.icon;
          return (
          <Card key={f.title} tone="dark" className="transition-colors hover:border-brand-500/30">
            <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg ${f.accent}`}>
              <Icon size={22} aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">{f.desc}</p>
          </Card>
          );
        })}
      </div>
    </Section>
  );
}
