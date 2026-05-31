"use client";

import { useState } from "react";
import Link from "@/lib/next-shim/link";
import { useRouter } from "@/lib/next-shim/navigation";
import { useLanguage } from "@/components/language-provider";
import { AuthShell } from "@/components/auth/auth-shell";
import { register } from "@/lib/api";

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
    } catch (err: any) {
      setError(err.message || "Registration failed");
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
        <h1 className="text-2xl font-bold tracking-tight text-foreground text-center mb-1">{t("createAccountBtn")}</h1>
        <p className="text-sm text-muted-fg text-center mb-7">{t("welcomeSubtitle")}</p>

        <form onSubmit={handleSignUpSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-fg uppercase tracking-wider mb-2">
              {t("nameLabel")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-fg outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-ring/30"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-fg uppercase tracking-wider mb-2">
              {t("emailLabel")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-fg outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-ring/30"
              placeholder="name@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-fg uppercase tracking-wider mb-2">
              {t("passwordLabel")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-fg outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-ring/30"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-fg uppercase tracking-wider mb-2">
              {t("confirmPasswordLabel")}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-fg outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-ring/30"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="text-xs text-danger font-semibold bg-danger/10 p-3 rounded-lg border border-danger/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 transition-all duration-200 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
              className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
            >
              {t("alreadyHaveAccount")}
            </Link>
          </div>
        </form>
      </div>
    </AuthShell>
  );
}
