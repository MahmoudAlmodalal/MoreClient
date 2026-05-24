"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { AuthShell } from "@/components/auth/auth-shell";
import { Apple } from "lucide-react";
import { register, ApiError } from "@/lib/api";

export default function SignUpPage() {
  const { t } = useLanguage();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !confirmPassword) {
      setError(t("requiredFields"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("passwordsDontMatch"));
      return;
    }

    setLoading(true);
    try {
      const session = await register(name, email, password, name);
      router.push(session.redirectTo);
    } catch (err) {
      setLoading(false);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t("signUpFailed") || "Sign up failed. Please try again.");
      }
    }
  };

  const handleSocialSignUp = () => {
    // TODO: Implement OAuth signup (Google, Apple)
    setError("Social signup coming soon");
  };

  return (
    <AuthShell>
      <div className="rounded-2xl border border-[#1f1f2e] bg-[#0d0d15] p-8">
        <h1 className="text-xl font-semibold text-white text-center mb-6">{t("createAccountBtn")}</h1>

        <div className="mb-6 grid gap-3">
          <button
            type="button"
            onClick={handleSocialSignUp}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#1f1f2e] bg-white px-4 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-100"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full text-sm font-bold text-[#4285F4]">
              G
            </span>
            <span>{t("signUpWithGoogle")}</span>
          </button>

          <button
            type="button"
            onClick={handleSocialSignUp}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#1f1f2e] bg-white px-4 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-100"
          >
            <Apple className="h-5 w-5 text-gray-900" />
            <span>{t("signUpWithApple")}</span>
          </button>
        </div>
        
        <form onSubmit={handleSignUpSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {t("nameLabel")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[#1f1f2e] bg-[#07070b] px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {t("emailLabel")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[#1f1f2e] bg-[#07070b] px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              placeholder="name@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {t("passwordLabel")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[#1f1f2e] bg-[#07070b] px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {t("confirmPasswordLabel")}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-[#1f1f2e] bg-[#07070b] px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 font-semibold bg-red-950/30 p-3 rounded-lg border border-red-900/50">
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
                <span>{t("signUpSuccess")}</span>
              </>
            ) : (
              <span>{t("createAccountBtn")}</span>
            )}
          </button>

          <div className="text-center mt-4">
            <Link
              href="/welcome"
              className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
            >
              {t("alreadyHaveAccount")}
            </Link>
          </div>
        </form>
      </div>
    </AuthShell>
  );
}
