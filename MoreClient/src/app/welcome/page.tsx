"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { useTheme } from "@/components/theme-provider";
import { Apple, Sun, Moon } from "lucide-react";
import { login, startSocialAuth } from "@/lib/api";

const SLIDES = 3;

export default function WelcomePage() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [slide, setSlide] = useState(0);
  const router = useRouter();

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError(t("requiredFields"));
      return;
    }
    setLoading(true);
    try {
      const session = await login(email, password);
      router.push(session.redirectTo);
    } catch (err) {
      setError((err as Error).message || "Login failed");
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setError("");
    setLoading(true);
    try {
      const res = await startSocialAuth(provider, "login");
      window.location.href = res.authUrl;
    } catch (err) {
      setError((err as Error)?.message || "Failed to start social login");
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % SLIDES), 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2 bg-background text-foreground">
      {/* Left — brand panel */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12 border-r border-border-custom bg-card">
        {/* Subtle grid pattern background */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-20 dark:opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, var(--border) 1px, transparent 1px),
              linear-gradient(to bottom, var(--border) 1px, transparent 1px)
            `,
            backgroundSize: "32px 32px"
          }}
        />

        <div className="relative z-10 w-full max-w-md rounded-2xl border border-border-custom bg-background/50 p-8 backdrop-blur-sm shadow-lg text-center">
          <div className="overflow-hidden rounded-xl bg-white p-4 max-w-[140px] mx-auto shadow-sm border border-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/clientmore-logo.jpeg"
              alt="clientMORE"
              className="mx-auto h-16 w-auto object-contain"
            />
          </div>
          <h2 className="mt-8 text-xl font-bold text-foreground">
            {t("welcomeSlideTitle")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            {t("welcomeSlideText")}
          </p>
          <div className="mt-7 flex items-center justify-center gap-2">
            {Array.from({ length: SLIDES }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === slide ? "w-6 bg-brand-600 dark:bg-brand-400" : "w-1.5 bg-border-custom"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right — actions panel (theme-aware) */}
      <div className="flex flex-col bg-background">
        <div className="flex justify-end p-5 gap-2.5">
          {/* Theme switcher toggle */}
          <button
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-custom text-foreground/80 hover:bg-foreground/5 transition-all"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            className="rounded-lg border border-border-custom px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-foreground/5 transition-colors"
          >
            {language === "ar" ? "English" : "العربية"}
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-md">
            <h1 className="text-center text-4xl font-bold tracking-tight text-foreground">
              {t("welcomeTitle").replace("MORE", "")}
              <span className="text-brand-600 dark:text-brand-400">MORE</span>
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-center text-sm sm:text-base leading-relaxed text-text-muted">
              {t("welcomeSubtitle")}
            </p>

            <form onSubmit={handleLoginSubmit} className="mt-8 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  {t("emailLabel")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-card text-foreground border border-border-custom rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-brand-500 focus:bg-background focus:ring-4 focus:ring-brand-500/10 placeholder:text-text-muted/50"
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  {t("passwordLabel")}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-card text-foreground border border-border-custom rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-brand-500 focus:bg-background focus:ring-4 focus:ring-brand-500/10 placeholder:text-text-muted/50"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="text-xs text-red-600 dark:text-red-400 font-semibold bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 active:scale-98 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{t("signInSuccess")}</span>
                  </>
                ) : (
                  <span>{t("signInBtn")}</span>
                )}
              </button>

              <div className="relative my-4 flex items-center gap-3">
                <div className="flex-1 border-t border-border-custom" />
                <span className="text-xs text-text-muted font-medium">
                  {language === "ar" ? "أو" : "Or"}
                </span>
                <div className="flex-1 border-t border-border-custom" />
              </div>

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => handleSocialLogin("google")}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border-custom bg-card px-4 text-xs sm:text-sm font-semibold text-foreground/80 transition-colors hover:bg-foreground/5 active:scale-98"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full text-sm font-bold text-[#4285F4]">
                    G
                  </span>
                  <span>{t("continueWithGoogle")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialLogin("apple")}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border-custom bg-card px-4 text-xs sm:text-sm font-semibold text-foreground/80 transition-colors hover:bg-foreground/5 active:scale-98"
                >
                  <Apple className="h-5 w-5 text-foreground" />
                  <span>{t("continueWithApple")}</span>
                </button>
              </div>

              <div className="text-center mt-4">
                <Link
                  href="/sign-up"
                  className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline transition-colors"
                >
                  {t("dontHaveAccount")}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
