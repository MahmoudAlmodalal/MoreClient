"use client";

import { useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { Section, SectionHeading } from "@/components/ui/section";

export function Faq() {
  const { t } = useLanguage();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const items = [
    { q: t("faqQ1"), a: t("faqA1") },
    { q: t("faqQ2"), a: t("faqA2") },
    { q: t("faqQ3"), a: t("faqA3") },
    { q: t("faqQ4"), a: t("faqA4") },
  ];

  return (
    <Section id="faq">
      <SectionHeading eyebrow={t("faqEyebrow")} title={t("faqTitle")} />
      <div className="mx-auto mt-12 max-w-3xl space-y-3">
        {items.map((item, i) => {
          const isOpen = openIdx === i;
          return (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)]"
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start"
                aria-expanded={isOpen}
              >
                <span className="font-medium text-white">{item.q}</span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  className={`shrink-0 text-brand-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {isOpen ? (
                <p className="px-5 pb-5 text-sm leading-relaxed text-gray-400">{item.a}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
