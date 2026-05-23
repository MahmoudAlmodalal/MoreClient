"use client";

import { useLanguage } from "@/components/language-provider";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  const { t } = useLanguage();

  return (
    <div id="top" className="relative overflow-hidden pt-16 sm:pt-24">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand-700/25 blur-[120px]" />
        <div className="absolute right-0 top-40 h-[280px] w-[280px] rounded-full bg-brand-500/20 blur-[100px]" />
      </div>

      <Container className="text-center">
        <div className="mx-auto flex max-w-3xl flex-col items-center">
          <Badge tone="brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
            {t("heroBadge")}
          </Badge>

          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
            {t("heroTitle")}
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-400">
            {t("heroSubtitle")}
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Button href="/welcome" size="lg">
              {t("heroCtaPrimary")}
            </Button>
            <Button href="#how" variant="outline" size="lg">
              {t("heroCtaSecondary")}
            </Button>
          </div>
        </div>

        {/* Framed dashboard mockup */}
        <div className="relative mx-auto mt-16 max-w-4xl">
          <div className="glow-purple rounded-2xl border border-white/10 bg-[#0d0d15] p-2 shadow-2xl">
            <div className="rounded-xl border border-white/5 bg-[#07070b] p-4">
              {/* window chrome */}
              <div className="mb-4 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                    <div className="mb-3 h-2 w-12 rounded-full bg-white/10" />
                    <div className="mb-2 h-6 w-16 rounded bg-brand-500/40" />
                    <div className="h-2 w-20 rounded-full bg-white/5" />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex h-32 items-end gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-4">
                {[40, 70, 55, 85, 60, 95, 75].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t gradient-brand"
                    style={{ height: `${h}%`, opacity: 0.35 + i * 0.08 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
