"use client";

import { useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { apiSend, type SettingsOut } from "@/lib/api";
import { CreditCard, CheckCircle2, Sparkles } from "lucide-react";

/**
 * Current-plan usage bar + Pro/Ultra plan cards with upgrade/downgrade buttons.
 * Driven by the shared `subscriptionPlan` / `usedMessages` state in the language
 * provider, so changes here reflect everywhere. Reused by the settings page and
 * the dedicated /dashboard/upgrade page.
 */
export function SubscriptionPlans() {
  const { t, subscriptionPlan, setSubscriptionPlan, usedMessages } = useLanguage();
  const [savingPlan, setSavingPlan] = useState<"pro" | "ultra" | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const limit = subscriptionPlan === "pro" ? 500 : 1500;
  const usagePercentage = Math.min((usedMessages / limit) * 100, 100);

  const handlePlanChange = async (plan: "pro" | "ultra") => {
    if (plan === subscriptionPlan || savingPlan) return;

    const previousPlan = subscriptionPlan;
    setSavingPlan(plan);
    setNotice(null);
    setSubscriptionPlan(plan);

    try {
      const saved = await apiSend<SettingsOut>("/api/settings", "PUT", {
        subscriptionPlan: plan,
      });
      if (saved.subscriptionPlan === "pro" || saved.subscriptionPlan === "ultra") {
        setSubscriptionPlan(saved.subscriptionPlan);
      }
      setNotice({ type: "success", message: t("planSaved") });
    } catch {
      setSubscriptionPlan(previousPlan);
      setNotice({ type: "error", message: t("planSaveError") });
    } finally {
      setSavingPlan(null);
    }
  };

  return (
    <div className="rounded-xl border border-border-custom bg-card p-6 space-y-6 text-foreground">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            {t("billingTitle")}
          </h3>
          <p className="mt-1 text-xs text-text-muted">{t("billingSub")}</p>
        </div>
        {notice && (
          <div
            className={`rounded-lg px-3 py-2 text-xs font-semibold border ${
              notice.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
            }`}
            role="status"
          >
            {notice.message}
          </div>
        )}
      </div>

      {/* Usage Status Bar */}
      <div className="rounded-xl bg-background p-4 border border-border-custom/60 space-y-3">
        <div>
          <p className="text-sm font-bold text-foreground">{t("currentPlanTitle")}</p>
          <p className="mt-1 text-xs text-text-muted">{t("currentPlanSub")}</p>
        </div>
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span className="font-semibold text-brand-600 dark:text-brand-400">
            {t("usageRatio", { used: usedMessages, limit })}
          </span>
          <span className="font-mono font-bold text-foreground uppercase">{subscriptionPlan}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-card border border-border-custom">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${usagePercentage}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Pro Plan Box */}
        <div
          className={`rounded-xl border p-5 flex flex-col justify-between ${
            subscriptionPlan === "pro"
              ? "border-brand-500 bg-brand-500/5"
              : "border-border-custom"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground">{t("planPro")}</h4>
              {subscriptionPlan === "pro" && (
                <span className="inline-flex items-center rounded-md bg-brand-500/10 px-2 py-0.5 text-xs font-bold text-brand-600 dark:text-brand-400 border border-brand-500/20">
                  {t("activePlan")}
                </span>
              )}
            </div>
            <p className="text-xl font-extrabold text-foreground mt-2">{t("proPrice")}</p>
            <ul className="text-xs text-text-muted mt-4 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                {t("proLimit")}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                {t("featBilingualRag")}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                {t("featChromaVector")}
              </li>
            </ul>
          </div>

          {subscriptionPlan !== "pro" && (
            <button
              type="button"
              disabled={Boolean(savingPlan)}
              onClick={() => handlePlanChange("pro")}
              className="w-full mt-6 rounded-xl border border-border-custom bg-background py-2 text-xs font-bold text-text-muted hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 active:scale-98 transition-all cursor-pointer"
            >
              {savingPlan === "pro" ? t("saving") : t("proPlanCta")}
            </button>
          )}
        </div>

        {/* Ultra Plan Box */}
        <div
          className={`rounded-xl border p-5 flex flex-col justify-between ${
            subscriptionPlan === "ultra"
              ? "border-brand-500 bg-brand-500/5 shadow-sm"
              : "border-border-custom hover:border-brand-500/30"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                {t("planUltra")}
                <Sparkles className="h-4 w-4 text-yellow-500" />
              </h4>
              {subscriptionPlan === "ultra" && (
                <span className="inline-flex items-center rounded-md bg-brand-500/10 px-2 py-0.5 text-xs font-bold text-brand-600 dark:text-brand-400 border border-brand-500/20">
                  {t("activePlan")}
                </span>
              )}
            </div>
            <p className="text-xl font-extrabold text-foreground mt-2">{t("ultraPrice")}</p>
            <ul className="text-xs text-text-muted mt-4 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                {t("ultraLimit")}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                {t("featAllProBenefits")} + {t("featSlaGuarantee")}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                {t("featPriorityHandoff")}
              </li>
            </ul>
          </div>

          {subscriptionPlan !== "ultra" && (
            <button
              type="button"
              disabled={Boolean(savingPlan)}
              onClick={() => handlePlanChange("ultra")}
              className="w-full mt-6 rounded-xl bg-accent py-2 text-xs font-bold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 active:scale-98 transition-all cursor-pointer"
            >
              {savingPlan === "ultra" ? t("saving") : t("upgradeToUltra")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
