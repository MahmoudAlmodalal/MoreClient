"use client";

import { useLanguage } from "@/components/language-provider";
import { Logo } from "@/components/ui/logo";

/**
 * Branded centered container for the Clerk sign-in / sign-up widgets.
 * Renders a graceful fallback when Clerk isn't configured in the environment.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050508] px-5 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[360px] w-[640px] -translate-x-1/2 rounded-full bg-brand-700/25 blur-[120px]" />
      </div>

      <a href="/" aria-label="clientMORE" className="relative z-10 mb-8">
        <Logo variant="dark" size="md" />
      </a>

      <div className="relative z-10 w-full max-w-md">
        {hasClerk ? (
          <div className="flex justify-center">{children}</div>
        ) : (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center">
            <h1 className="text-lg font-semibold text-white">
              {t("authNotConfiguredTitle")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              {t("authNotConfiguredText")}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <a
                href="/dashboard"
                className="gradient-brand rounded-xl px-5 py-3 text-sm font-semibold text-white hover:brightness-110"
              >
                {t("goToDashboard")}
              </a>
              <a
                href="/welcome"
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-gray-300 hover:bg-white/5"
              >
                {t("backToWelcome")}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Clerk `appearance` themed to the brand purple, shared by both auth pages. */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#7c3aed",
    colorBackground: "#0d0d15",
    colorText: "#f3f4f6",
    colorInputBackground: "#07070b",
    colorInputText: "#f3f4f6",
    borderRadius: "0.75rem",
  },
  elements: {
    card: "bg-[#0d0d15] border border-[#1f1f2e] shadow-none",
    headerTitle: "text-white",
    headerSubtitle: "text-gray-400",
    socialButtonsBlockButton: "border-white/10 text-gray-200",
    formButtonPrimary: "bg-[#7c3aed] hover:bg-[#6d28d9]",
    footerActionLink: "text-brand-400 hover:text-brand-300",
  },
};
