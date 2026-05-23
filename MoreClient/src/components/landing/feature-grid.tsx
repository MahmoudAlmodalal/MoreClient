"use client";

import React from "react";
import { useLanguage } from "@/components/language-provider";
import { Section, SectionHeading } from "@/components/ui/section";
import { Card } from "@/components/ui/card";

function Icon({ path }: { path: React.ReactNode }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {path}
    </svg>
  );
}

const stroke = { stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function FeatureGrid() {
  const { t } = useLanguage();

  const features = [
    {
      title: t("featInstantTitle"),
      desc: t("featInstantDesc"),
      icon: <Icon path={<><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" {...stroke} /></>} />,
    },
    {
      title: t("featOmnichannelTitle"),
      desc: t("featOmnichannelDesc"),
      icon: <Icon path={<><circle cx="12" cy="12" r="9" {...stroke} /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" {...stroke} /></>} />,
    },
    {
      title: t("featHandoffTitle"),
      desc: t("featHandoffDesc"),
      icon: <Icon path={<><path d="M16 11a4 4 0 1 0-8 0M2 20a6 6 0 0 1 12 0M17 14l3 3-3 3" {...stroke} /></>} />,
    },
    {
      title: t("featAnalyticsTitle"),
      desc: t("featAnalyticsDesc"),
      icon: <Icon path={<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" {...stroke} /></>} />,
    },
    {
      title: t("featUxTitle"),
      desc: t("featUxDesc"),
      icon: <Icon path={<><rect x="3" y="4" width="18" height="14" rx="2" {...stroke} /><path d="M3 9h18M7 20h10" {...stroke} /></>} />,
    },
    {
      title: t("featSecurityTitle"),
      desc: t("featSecurityDesc"),
      icon: <Icon path={<><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z" {...stroke} /></>} />,
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
        {features.map((f) => (
          <Card key={f.title} tone="dark" className="transition-colors hover:border-brand-500/30">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-300">
              {f.icon}
            </div>
            <h3 className="text-lg font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">{f.desc}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
