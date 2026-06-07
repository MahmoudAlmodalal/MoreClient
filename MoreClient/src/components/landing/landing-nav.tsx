"use client";

import { useState, useEffect } from "react";
import { Globe2, LogIn, Menu, X, Sun, Moon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

function NavLogo() {
  return (
    <div className="flex items-center gap-2 select-none">
      {/* Small, elegant stylized 'M' icon */}
      <div className="relative w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7B61FF] to-[#00FFCC] p-[1.5px] flex items-center justify-center shadow-[0_0_15px_rgba(123,97,255,0.25)]">
        <div className="w-full h-full bg-[#101020] rounded-[7px] flex items-center justify-center">
          <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 17V8L12 14L20 8V17" stroke="url(#logoGradNav)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="logoGradNav" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7B61FF" />
                <stop offset="100%" stopColor="#00FFCC" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      {/* Brand Name */}
      <span className="font-outfit text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center">
        MORE<span className="text-[#00FFCC] ml-1 font-medium text-xs tracking-wider bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20">Response</span>
      </span>
    </div>
  );
}

export function LandingNav() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
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
      className={`sticky top-0 z-50 transition-all duration-300 border-b backdrop-blur-md ${
        scrolled
          ? "bg-[#101020]/90 border-white/10 py-2.5 shadow-lg"
          : "bg-transparent border-transparent py-4"
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
              className="text-xs font-semibold uppercase tracking-wider text-white/70 transition-all duration-200 hover:text-[#00FFCC] hover:scale-102"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            className="inline-flex items-center justify-center rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-bold text-white/80 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
            aria-label="Switch language"
          >
            {language === "ar" ? "EN" : "ع"}
          </button>

          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/80 hover:bg-white/5 hover:text-white transition-all active:scale-95 cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} className="text-white/80" />}
          </button>

          <a
            href="/welcome"
            className="hidden items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/80 transition-colors hover:text-white sm:flex"
          >
            <LogIn size={14} aria-hidden="true" />
            {t("navLogin")}
          </a>
          
          <Button href="/welcome" size="sm" className="hidden sm:inline-flex bg-gradient-to-r from-[#7B61FF] to-[#6848ff] text-white hover:shadow-[0_0_15px_rgba(123,97,255,0.4)] border-none">
            {t("navGetStarted")}
          </Button>

          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/80 transition-colors hover:bg-white/5 lg:hidden"
            aria-label="menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-white/10 bg-[#101020] px-5 py-4 lg:hidden">
          <nav className="flex flex-col gap-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-white/70 hover:text-[#00FFCC] py-1.5 transition-colors"
              >
                {l.label}
              </a>
            ))}
            <a
              href="/welcome"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 text-sm font-semibold text-white/70 py-1.5 hover:text-white"
            >
              <LogIn size={15} aria-hidden="true" />
              {t("navLogin")}
            </a>
            <Button href="/welcome" size="sm" className="mt-2 w-full bg-gradient-to-r from-[#7B61FF] to-[#6848ff] text-white border-none">
              {t("navGetStarted")}
            </Button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
