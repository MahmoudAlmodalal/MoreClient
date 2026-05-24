"use client";

import { useState } from "react";
import { Globe2, LogIn, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

export function LandingNav() {
  const { t, language, setLanguage } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const sectionHref = (hash: string) => (pathname === "/" ? hash : `/${hash}`);

  const links = [
    { href: sectionHref("#features"), label: t("navFeatures") },
    { href: sectionHref("#how"), label: t("navHowItWorks") },
    { href: "/pricing", label: t("navPricing") },
    { href: sectionHref("#faq"), label: t("navFaq") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#050508]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <a href={pathname === "/" ? "#top" : "/#top"} aria-label="clientMORE">
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/5"
            aria-label="Switch language"
          >
            <Globe2 size={14} aria-hidden="true" />
            {language === "ar" ? "EN" : "ع"}
          </button>
          <a
            href="/welcome"
            className="hidden items-center gap-1.5 text-sm text-gray-300 transition-colors hover:text-white sm:flex"
          >
            <LogIn size={15} aria-hidden="true" />
            {t("navLogin")}
          </a>
          <Button href="/welcome" size="sm" className="hidden sm:inline-flex">
            {t("navGetStarted")}
          </Button>
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-300 transition-colors hover:bg-white/5 md:hidden"
            aria-label="menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
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
