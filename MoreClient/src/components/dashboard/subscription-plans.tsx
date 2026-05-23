"use client";

import { useLanguage } from "@/components/language-provider";
import { CreditCard, CheckCircle2, Sparkles } from "lucide-react";

/**
 * Current-plan usage bar + Pro/Ultra plan cards with upgrade/downgrade buttons.
 * Driven by the shared `subscriptionPlan` / `usedMessages` state in the language
 * provider, so changes here reflect everywhere. Reused by the settings page and
 * the dedicated /dashboard/upgrade page.
 */
export function SubscriptionPlans() {
  const { t, subscriptionPlan, setSubscriptionPlan, usedMessages } = useLanguage();

  const limit = subscriptionPlan === "pro" ? 500 : 1500;
  const usagePercentage = Math.min((usedMessages / limit) * 100, 100);

  return (
    <div className="rounded-xl border border-[#1f1f2e] bg-[#0d0d15] p-6 space-y-6">
      <h3 className="text-base font-bold text-white flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-purple-400" />
        {t("billingTitle")}
      </h3>

      {/* Usage Status Bar */}
      <div className="rounded-xl bg-[#07070b] p-4 border border-[#1f1f2e]/60 space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="font-semibold text-purple-400">
            {t("usageRatio", { used: usedMessages, limit })}
          </span>
          <span className="font-mono font-bold text-white uppercase">{subscriptionPlan}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#0d0d15]">
          <div
            className="h-full bg-purple-600 transition-all duration-300"
            style={{ width: `${usagePercentage}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Pro Plan Box */}
        <div
          className={`rounded-xl border p-5 flex flex-col justify-between ${
            subscriptionPlan === "pro" ? "border-purple-500 bg-purple-500/5" : "border-[#1f1f2e]"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">{t("planPro")}</h4>
              {subscriptionPlan === "pro" && (
                <span className="inline-flex items-center rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-bold text-purple-400 ring-1 ring-inset ring-purple-500/20">
                  {t("activePlan")}
                </span>
              )}
            </div>
            <p className="text-xl font-extrabold text-white mt-2">{t("proPrice")}</p>
            <ul className="text-xs text-gray-400 mt-4 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-400" />
                {t("proLimit")}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-400" />
                {t("featBilingualRag")}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-400" />
                {t("featChromaVector")}
              </li>
            </ul>
          </div>

          {subscriptionPlan !== "pro" && (
            <button
              type="button"
              onClick={() => setSubscriptionPlan("pro")}
              className="w-full mt-6 rounded-xl border border-[#1f1f2e] bg-[#07070b] py-2 text-xs font-bold text-gray-300 hover:bg-[#1a1a26]"
            >
              {t("downgradeToPro")}
            </button>
          )}
        </div>

        {/* Ultra Plan Box */}
        <div
          className={`rounded-xl border p-5 flex flex-col justify-between ${
            subscriptionPlan === "ultra"
              ? "border-purple-500 bg-purple-500/5 glow-purple"
              : "border-[#1f1f2e] hover:border-purple-500/25"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                {t("planUltra")}
                <Sparkles className="h-4 w-4 text-yellow-400" />
              </h4>
              {subscriptionPlan === "ultra" && (
                <span className="inline-flex items-center rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-bold text-purple-400 ring-1 ring-inset ring-purple-500/20">
                  {t("activePlan")}
                </span>
              )}
            </div>
            <p className="text-xl font-extrabold text-white mt-2">{t("ultraPrice")}</p>
            <ul className="text-xs text-gray-400 mt-4 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-400" />
                {t("ultraLimit")}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-400" />
                {t("featAllProBenefits")} + {t("featSlaGuarantee")}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-400" />
                {t("featPriorityHandoff")}
              </li>
            </ul>
          </div>

          {subscriptionPlan !== "ultra" && (
            <button
              type="button"
              onClick={() => setSubscriptionPlan("ultra")}
              className="w-full mt-6 rounded-xl bg-purple-600 py-2 text-xs font-bold text-white hover:bg-purple-500"
            >
              {t("upgradeToUltra")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
