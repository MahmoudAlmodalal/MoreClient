"use client";

import { useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

export function LandingNav() {
  const { t, language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "#features", label: t("navFeatures") },
    { href: "#how", label: t("navHowItWorks") },
    { href: "#pricing", label: t("navPricing") },
    { href: "#faq", label: t("navFaq") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#050508]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <a href="#top" aria-label="clientMORE">
          <Logo variant="dark" size="sm" />
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-gray-300 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/5"
          >
            {language === "ar" ? "EN" : "ع"}
          </button>
          <a
            href="/welcome"
            className="hidden text-sm text-gray-300 transition-colors hover:text-white sm:block"
          >
            {t("navLogin")}
          </a>
          <Button href="/welcome" size="sm" className="hidden sm:inline-flex">
            {t("navGetStarted")}
          </Button>
          <button
            className="md:hidden text-gray-300"
            aria-label="menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-white/5 bg-[#050508] px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm text-gray-300"
              >
                {l.label}
              </a>
            ))}
            <Button href="/welcome" size="sm" className="mt-2 w-full">
              {t("navGetStarted")}
            </Button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
