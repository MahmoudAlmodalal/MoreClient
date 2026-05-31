"use client";

import { Rocket, UploadCloud, Workflow } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Section, SectionHeading } from "@/components/ui/section";

export function HowItWorks() {
  const { t } = useLanguage();

  const steps = [
    { n: "1", title: t("howStep1Title"), desc: t("howStep1Desc"), icon: Workflow },
    { n: "2", title: t("howStep2Title"), desc: t("howStep2Desc"), icon: UploadCloud },
    { n: "3", title: t("howStep3Title"), desc: t("howStep3Desc"), icon: Rocket },
  ];

  return (
    <Section id="how" className="border-y border-border bg-muted/30">
      <SectionHeading eyebrow={t("howEyebrow")} title={t("howTitle")} />
      <div className="relative mt-14 grid gap-10 md:grid-cols-3">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
          <div key={s.n} className="relative rounded-2xl border border-border bg-card p-6 text-center shadow-sm transition-shadow hover:shadow-md">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Icon size={24} aria-hidden="true" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-fg">{s.n}</p>
            <h3 className="mt-5 text-xl font-semibold text-foreground">{s.title}</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-fg">
              {s.desc}
            </p>
          </div>
          );
        })}
      </div>
    </Section>
  );
}
