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
    <Section id="how" className="border-y border-white/5 bg-white/[0.015]">
      <SectionHeading eyebrow={t("howEyebrow")} title={t("howTitle")} />
      <div className="relative mt-14 grid gap-10 md:grid-cols-3">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
          <div key={s.n} className="relative rounded-2xl border border-white/8 bg-[#0d0d15] p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-brand-300">
              <Icon size={24} aria-hidden="true" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase text-gray-500">{s.n}</p>
            <h3 className="mt-5 text-xl font-semibold text-white">{s.title}</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-gray-400">
              {s.desc}
            </p>
          </div>
          );
        })}
      </div>
    </Section>
  );
}
