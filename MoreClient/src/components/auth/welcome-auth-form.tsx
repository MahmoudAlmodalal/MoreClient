"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";

/**
 * Inline email/password auth on the welcome page.
 *
 * When Clerk is configured we render the real Clerk-hook form; otherwise we
 * render a dev fallback (the app bypasses auth in dev when no key is present),
 * mirroring the pattern in `auth/auth-shell.tsx`. The Clerk hooks live in a
 * child component that is only mounted when a key exists, so the hooks are never
 * invoked outside a `<ClerkProvider>`.
 */
export function WelcomeAuthForm() {
  const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return hasClerk ? <ClerkAuthForm /> : <DevAuthFallback />;
}

type Mode = "signIn" | "signUp";

const inputClass =
  "w-full rounded-xl border border-[var(--border-light)] bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

function Tabs({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const { t } = useLanguage();
  const tabClass = (active: boolean) =>
    `flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
      active
        ? "bg-white text-brand-700 shadow-sm"
        : "text-gray-500 hover:text-gray-700"
    }`;
  return (
    <div className="mb-6 flex gap-1 rounded-xl bg-[var(--surface-muted)] p-1">
      <button type="button" className={tabClass(mode === "signIn")} onClick={() => setMode("signIn")}>
        {t("signInTab")}
      </button>
      <button type="button" className={tabClass(mode === "signUp")} onClick={() => setMode("signUp")}>
        {t("createAccountTab")}
      </button>
    </div>
  );
}

function MoreOptions() {
  const { t } = useLanguage();
  return (
    <p className="mt-6 text-center text-xs text-gray-400">
      <a href="/sign-in" className="font-medium text-brand-700 hover:underline">
        {t("moreOptions")}
      </a>
    </p>
  );
}

function clerkErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "errors" in err) {
    const errors = (err as { errors?: Array<{ longMessage?: string; message?: string }> }).errors;
    if (errors && errors.length > 0) {
      return errors[0].longMessage || errors[0].message || fallback;
    }
  }
  return fallback;
}

function ClerkAuthForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const { isLoaded: signInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  const [mode, setMode] = useState<Mode>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!signInLoaded || !signIn) return;
    setBusy(true);
    setError(null);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await setSignInActive({ session: result.createdSessionId });
        router.push("/dashboard");
      } else {
        setError(t("authNotConfiguredText"));
      }
    } catch (err) {
      setError(clerkErrorMessage(err, "Could not sign in."));
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async () => {
    if (!signUpLoaded || !signUp) return;
    setBusy(true);
    setError(null);
    try {
      await signUp.create({ emailAddress: email, password, firstName: name || undefined });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      setError(clerkErrorMessage(err, "Could not create account."));
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (!signUpLoaded || !signUp) return;
    setBusy(true);
    setError(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setSignUpActive({ session: result.createdSessionId });
        router.push("/dashboard");
      } else {
        setError(t("verifyCodeSent"));
      }
    } catch (err) {
      setError(clerkErrorMessage(err, "Invalid verification code."));
    } finally {
      setBusy(false);
    }
  };

  // ── Email verification step (sign up) ──────────────────────────────────────
  if (pendingVerification) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t("authVerifyTitle")}</h2>
        <p className="mt-1 text-sm text-gray-500">{t("verifyCodeSent")}</p>
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("verifyCodeLabel")}</label>
            <input
              className={inputClass}
              value={code}
              inputMode="numeric"
              autoComplete="one-time-code"
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button size="lg" className="w-full" onClick={handleVerify} disabled={busy || !code}>
            {busy ? t("authProcessing") : t("authVerifyCta")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Sign in / Sign up step ─────────────────────────────────────────────────
  const submit = mode === "signIn" ? handleSignIn : handleSignUp;
  const canSubmit = email && password && (mode === "signIn" || name);

  return (
    <div>
      <Tabs mode={mode} setMode={setMode} />
      <div className="space-y-4">
        {mode === "signUp" ? (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("nameLabel")}</label>
            <input
              className={inputClass}
              value={name}
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        ) : null}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("emailLabel")}</label>
          <input
            className={inputClass}
            type="email"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("passwordLabel")}</label>
          <input
            className={inputClass}
            type="password"
            value={password}
            autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Clerk's bot-protection widget mounts here on sign-up */}
        <div id="clerk-captcha" />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button size="lg" className="w-full" onClick={submit} disabled={busy || !canSubmit}>
          {busy ? t("authProcessing") : mode === "signIn" ? t("authSignInCta") : t("authCreateCta")}
        </Button>
      </div>
      <MoreOptions />
    </div>
  );
}

function DevAuthFallback() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>("signIn");
  return (
    <div>
      <Tabs mode={mode} setMode={setMode} />
      <div className="space-y-4 opacity-60">
        {mode === "signUp" ? (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("nameLabel")}</label>
            <input className={inputClass} disabled />
          </div>
        ) : null}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("emailLabel")}</label>
          <input className={inputClass} type="email" disabled />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("passwordLabel")}</label>
          <input className={inputClass} type="password" disabled />
        </div>
      </div>
      <p className="mt-4 rounded-xl bg-[var(--surface-muted)] px-4 py-3 text-xs leading-relaxed text-gray-500">
        {t("authDevNotice")}
      </p>
      <Button href="/dashboard" size="lg" className="mt-4 w-full">
        {t("enterDashboardDev")}
      </Button>
      <MoreOptions />
    </div>
  );
}
