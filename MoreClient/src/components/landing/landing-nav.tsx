"use client";

import { useState, useEffect } from "react";
import { LogIn, Menu, X, Sun, Moon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

function NavLogo() {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-custom bg-card text-accent shadow-sm">
        <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M4 17V8L12 14L20 8V17" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="font-outfit text-base font-extrabold tracking-tight text-foreground sm:text-lg">
        MORE <span className="font-medium text-foreground/65">Response</span>
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
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const sectionHref = (hash: string) => (pathname === "/" ? hash : `/${hash}`);
  const links = [
    { href: sectionHref("#hero"), label: t("navHome") },
    { href: sectionHref("#features"), label: t("navFeatures") },
    { href: sectionHref("#showcase"), label: t("navShowcase") },
    { href: sectionHref("#pricing"), label: t("navPricing") },
    { href: sectionHref("#faq"), label: t("navFaq") },
  ];

  return (
    <header className={`sticky top-0 z-50 border-b border-border-custom bg-background/95 backdrop-blur-md transition-shadow duration-200 ${scrolled ? "shadow-sm" : ""}`}>
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8">
        <a href={pathname === "/" ? "#hero" : "/#hero"} aria-label="More Response" className="flex items-center">
          <NavLogo />
        </a>

        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs font-semibold text-foreground/65 transition-colors hover:text-accent"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            className="inline-flex items-center justify-center rounded-lg px-2 py-1.5 text-xs font-bold text-foreground/70 transition-colors hover:bg-foreground/[0.045] hover:text-foreground"
            aria-label="Switch language"
          >
            {language === "ar" ? "EN" : "ع"}
          </button>

          <button
            onClick={toggleTheme}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-foreground/[0.045] hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <a
            href="/welcome"
            className="hidden items-center gap-1.5 text-xs font-semibold text-foreground/70 transition-colors hover:text-foreground sm:flex"
          >
            <LogIn size={14} aria-hidden="true" />
            {t("navLogin")}
          </a>

          <Button href="/welcome" size="sm" className="hidden rounded-lg border-none bg-accent px-4 text-white shadow-sm hover:bg-accent-hover sm:inline-flex">
            {t("navGetStarted")}
          </Button>

          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-foreground/75 transition-colors hover:bg-foreground/[0.045] lg:hidden"
            aria-label="menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border-custom bg-card px-5 py-4 lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/75 transition-colors hover:bg-foreground/[0.045] hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <a
              href="/welcome"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-foreground/75"
            >
              <LogIn size={15} aria-hidden="true" />
              {t("navLogin")}
            </a>
            <Button href="/welcome" size="sm" className="mt-2 w-full rounded-lg border-none bg-accent text-white hover:bg-accent-hover">
              {t("navGetStarted")}
            </Button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
