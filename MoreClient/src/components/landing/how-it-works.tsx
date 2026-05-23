"use client";

import { useLanguage } from "@/components/language-provider";
import { Section, SectionHeading } from "@/components/ui/section";

export function HowItWorks() {
  const { t } = useLanguage();

  const steps = [
    { n: "1", title: t("howStep1Title"), desc: t("howStep1Desc") },
    { n: "2", title: t("howStep2Title"), desc: t("howStep2Desc") },
    { n: "3", title: t("howStep3Title"), desc: t("howStep3Desc") },
  ];

  return (
    <Section id="how" className="border-y border-white/5 bg-white/[0.015]">
      <SectionHeading eyebrow={t("howEyebrow")} title={t("howTitle")} />
      <div className="relative mt-14 grid gap-10 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="relative text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl gradient-brand text-2xl font-bold text-white shadow-[var(--shadow-brand)]">
              {s.n}
            </div>
            <h3 className="mt-5 text-xl font-semibold text-white">{s.title}</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-gray-400">
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}
