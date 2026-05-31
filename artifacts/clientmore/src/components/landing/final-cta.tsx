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
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card px-6 py-16 text-center shadow-sm glow-brand">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("ctaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-fg">{t("ctaSubtitle")}</p>
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
