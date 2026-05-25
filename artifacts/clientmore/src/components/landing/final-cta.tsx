"use client";

import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  const { t } = useLanguage();

  return (
    <div className="py-20 sm:py-28">
      <Container>
        <div className="relative overflow-hidden rounded-xl border border-brand-500/20 bg-[#0d0d15] px-6 py-16 text-center">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t("ctaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-gray-400">{t("ctaSubtitle")}</p>
          <div className="mt-9">
            <Button href="/welcome" size="lg">
              {t("ctaButton")}
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
