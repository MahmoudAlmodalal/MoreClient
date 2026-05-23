"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";

const SLIDES = 3;

export default function WelcomePage() {
  const { t, language, setLanguage } = useLanguage();
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % SLIDES), 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left — brand panel */}
      <div className="gradient-brand relative hidden overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 top-10 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-brand-300/30 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-8 backdrop-blur-md">
          <div className="overflow-hidden rounded-2xl bg-white p-6 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/clientmore-logo.jpeg"
              alt="clientMORE"
              className="mx-auto h-24 w-auto object-contain"
            />
          </div>
          <h2 className="mt-8 text-center text-2xl font-bold text-white">
            {t("welcomeSlideTitle")}
          </h2>
          <p className="mt-3 text-center text-sm leading-relaxed text-white/80">
            {t("welcomeSlideText")}
          </p>
          <div className="mt-7 flex items-center justify-center gap-2">
            {Array.from({ length: SLIDES }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === slide ? "w-6 bg-white" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right — actions panel (light) */}
      <div className="flex flex-col bg-[var(--surface-light)] text-[var(--foreground-light)]">
        <div className="flex justify-end p-5">
          <button
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            className="rounded-lg border border-[var(--border-light)] px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-[var(--surface-muted)]"
          >
            {language === "ar" ? "English" : "العربية"}
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-md">
            <h1 className="text-center text-4xl font-bold tracking-tight">
              {t("welcomeTitle").replace("MORE", "")}
              <span className="text-brand-700">MORE</span>
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-center text-base leading-relaxed text-gray-500">
              {t("welcomeSubtitle")}
            </p>

            <div className="mt-9 space-y-3">
              <Button href="/sign-in" size="lg" className="w-full">
                {t("signInBtn")}
              </Button>
              <Button
                href="/sign-up"
                size="lg"
                className="w-full border border-[var(--border-light)] !text-brand-700 hover:!bg-[var(--surface-muted)]"
                variant="ghost"
              >
                {t("createAccountBtn")}
              </Button>
            </div>

            <div className="my-7 flex items-center gap-3 text-xs text-gray-400">
              <span className="h-px flex-1 bg-[var(--border-light)]" />
              {t("orExplore")}
              <span className="h-px flex-1 bg-[var(--border-light)]" />
            </div>

            <a
              href="/dashboard"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--surface-muted)] px-5 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-brand-100"
            >
              {t("takeTour")}
            </a>

            <p className="mt-10 text-center text-xs text-gray-400">
              <a href="/legal/privacy" className="hover:text-gray-600">{t("footerPrivacy")}</a>
              <span className="mx-2">·</span>
              <a href="/legal/terms" className="hover:text-gray-600">{t("footerTerms")}</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
