"use client";

import Link from "next/link";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { SubscriptionPlans } from "@/components/dashboard/subscription-plans";

export default function UpgradePage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6 text-foreground">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
          <Sparkles className="h-6 w-6 text-brand-600 dark:text-brand-400" />
          {t("upgradeTitle")}
        </h1>
        <p className="mt-1 text-sm text-text-muted">{t("upgradeSubtitle")}</p>
      </div>

      <SubscriptionPlans />

      <Link
        href="/pricing"
        target="_blank"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 dark:text-brand-400 transition-colors hover:underline"
      >
        {t("compareAllPlans")}
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

