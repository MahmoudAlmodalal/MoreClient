"use client";

import { useLanguage } from "@/components/language-provider";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  const { t } = useLanguage();

  return (
    <div className="py-20 sm:py-28">
      <Container>
        <div className="relative overflow-hidden rounded-3xl border border-brand-500/20 bg-[#0d0d15] px-6 py-16 text-center">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-1/2 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-700/20 blur-[100px]" />
          </div>
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t("ctaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-gray-400">{t("ctaSubtitle")}</p>
          <div className="mt-9">
            <Button href="/welcome" size="lg">
              {t("ctaButton")}
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
