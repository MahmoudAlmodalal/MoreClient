"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { Apple } from "lucide-react";
import { login } from "@/lib/api";

const SLIDES = 3;

export default function WelcomePage() {
  const { t, language, setLanguage } = useLanguage();
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
    } catch (err: any) {
      setError(err.message || "Login failed");
      setLoading(false);
    }
  };

  const handleSocialLogin = () => {
    sessionStorage.setItem("userRole", "user");
    router.push("/dashboard");
  };

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

            <form onSubmit={handleLoginSubmit} className="mt-8 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {t("emailLabel")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[var(--surface-muted)] text-[var(--foreground-light)] border border-[var(--border-light)] rounded-xl px-4 py-3.5 text-sm outline-none transition-all duration-200 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 placeholder:text-gray-400"
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {t("passwordLabel")}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[var(--surface-muted)] text-[var(--foreground-light)] border border-[var(--border-light)] rounded-xl px-4 py-3.5 text-sm outline-none transition-all duration-200 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 placeholder:text-gray-400"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="text-xs text-red-600 font-semibold bg-red-50 p-3 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4F00C8] hover:bg-[#3B00A0] text-white font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg shadow-purple-600/20 hover:shadow-purple-600/30 hover:scale-[1.01] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={handleSocialLogin}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-light)] bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-[var(--surface-muted)]"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full text-sm font-bold text-[#4285F4]">
                    G
                  </span>
                  <span>{t("continueWithGoogle")}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSocialLogin}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-light)] bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-[var(--surface-muted)]"
                >
                  <Apple className="h-5 w-5 text-gray-900" />
                  <span>{t("continueWithApple")}</span>
                </button>
              </div>

              <div className="text-center mt-4">
                <Link
                  href="/sign-up"
                  className="text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors"
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
