"use client";

import { useState, useEffect } from "react";
import { Globe2, LogIn, Menu, X } from "lucide-react";
import { usePathname } from "@/lib/next-shim/navigation";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";

function NavLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 60" className="h-[46px] w-[84px] select-none">
      <defs>
        <linearGradient id="logoGradNav" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <text x="55" y="16" textAnchor="middle" fontFamily="'Inter', sans-serif" fontWeight="300" fontSize="11" fill="#9ca3af" letterSpacing="3" style={{ textTransform: "lowercase" }}>response</text>
      <g transform="translate(16, 22)">
        <text x="0" y="24" fontFamily="'Outfit', sans-serif" fontWeight="800" fontSize="26" fill="url(#logoGradNav)">M</text>
        <g transform="translate(23, 5)">
          <circle cx="10" cy="10" r="10" fill="url(#logoGradNav)" />
          <path d="M 6 8 A 1.8 1.8 0 0 1 9 8" fill="none" stroke="#09080f" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 11 8 A 1.8 1.8 0 0 1 14 8" fill="none" stroke="#09080f" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 6 12 A 4 4 0 0 0 14 12" fill="none" stroke="#09080f" strokeWidth="2.0" strokeLinecap="round" />
        </g>
        <text x="47" y="24" fontFamily="'Outfit', sans-serif" fontWeight="800" fontSize="26" fill="url(#logoGradNav)" letterSpacing="1">RE</text>
      </g>
    </svg>
  );
}

export function LandingNav() {
  const { t, language, setLanguage, isRtl } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const sectionHref = (hash: string) => (pathname === "/" ? hash : `/${hash}`);

  const links = [
    { href: sectionHref("#hero"), label: t("navHome") },
    { href: sectionHref("#about"), label: t("navAbout") },
    { href: sectionHref("#features"), label: t("navFeatures") },
    { href: sectionHref("#showcase"), label: t("navShowcase") },
    { href: sectionHref("#pricing"), label: t("navPricing") },
    { href: sectionHref("#faq"), label: t("navFaq") },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 border-b ${
        scrolled
          ? "bg-[#09080f]/90 backdrop-blur-md border-white/5 py-2 shadow-lg"
          : "bg-[#09080f]/60 backdrop-blur-sm border-transparent py-4"
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <a href={pathname === "/" ? "#hero" : "/#hero"} aria-label="More Response" className="flex items-center">
          <NavLogo />
        </a>

        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-gray-300 transition-all duration-200 hover:text-brand-400 hover:scale-105"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-gray-300 transition-all hover:bg-white/5 hover:border-white/20"
            aria-label="Switch language"
          >
            <Globe2 size={14} aria-hidden="true" />
            {language === "ar" ? "EN" : "ع"}
          </button>
          <a
            href="/welcome"
            className="hidden items-center gap-1.5 text-sm font-semibold text-gray-300 transition-colors hover:text-white sm:flex"
          >
            <LogIn size={15} aria-hidden="true" />
            {t("navLogin")}
          </a>
          <Button href="/welcome" size="sm" className="hidden sm:inline-flex bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border-0 shadow-lg shadow-purple-950/40">
            {t("navGetStarted")}
          </Button>
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-300 transition-colors hover:bg-white/5 lg:hidden"
            aria-label="menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-white/5 bg-[#09080f] px-5 py-4 lg:hidden">
          <nav className="flex flex-col gap-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm text-gray-300 hover:text-brand-400 py-1.5 transition-colors"
              >
                {l.label}
              </a>
            ))}
            <a
              href="/welcome"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-300 py-1.5 hover:text-white"
            >
              <LogIn size={15} aria-hidden="true" />
              {t("navLogin")}
            </a>
            <Button href="/welcome" size="sm" className="mt-2 w-full bg-gradient-to-r from-purple-600 to-indigo-600 border-0">
              {t("navGetStarted")}
            </Button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
