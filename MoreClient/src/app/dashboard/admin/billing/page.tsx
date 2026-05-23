"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  apiGet,
  type PlansResponse,
  type PlanCatalogItem,
  type SubscriptionsResponse,
  type Subscription,
} from "../_components/api";

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

const statusTone = (status: string): "brand" | "neutral" | "solid" =>
  status === "active" ? "brand" : "neutral";

export default function AdminBillingPage() {
  const { t, language } = useLanguage();
  const [plans, setPlans] = useState<PlanCatalogItem[]>([]);
  const [subs, setSubs] = useState<SubscriptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<PlansResponse>("/api/v1/admin/plans"),
      apiGet<SubscriptionsResponse>("/api/v1/admin/subscriptions"),
    ])
      .then(([plansRes, subsRes]) => {
        setPlans(plansRes.items);
        setSubs(subsRes);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">{t("adminBillingTitle")}</h1>
        <p className="text-sm text-gray-500">{t("adminBillingSub")}</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {loading && <p className="text-sm text-gray-500">{t("loading")}</p>}

      {!loading && !error && (
        <>
          {/* Plan catalog */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-white">{t("plans")}</h2>
            {plans.length === 0 ? (
              <p className="text-sm text-gray-500">{t("noPlans")}</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => (
                  <Card key={`${plan.principalType}-${plan.code}`} tone="dark" className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">
                        {language === "ar" ? plan.nameAr : plan.nameEn}
                      </h3>
                      <Badge tone={plan.active ? "brand" : "neutral"}>
                        {plan.active ? t("active") : t("inactive")}
                      </Badge>
                    </div>
                    <Badge tone="neutral">{plan.principalType}</Badge>
                    <div className="space-y-1 pt-2 text-sm text-gray-400">
                      <div className="flex justify-between">
                        <span>{t("monthly")}</span>
                        <span className="font-medium text-white">{money(plan.monthlyCents)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("yearly")}</span>
                        <span className="font-medium text-white">{money(plan.yearlyCents)}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Subscriptions */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-white">
              {t("subscriptions")}{" "}
              {subs && <span className="text-gray-500">({subs.total})</span>}
            </h2>
            <Card tone="dark" className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1f1f2e] text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3 font-medium">{t("principal")}</th>
                    <th className="px-4 py-3 font-medium">{t("plan")}</th>
                    <th className="px-4 py-3 font-medium">{t("status")}</th>
                    <th className="px-4 py-3 font-medium">{t("period")}</th>
                  </tr>
                </thead>
                <tbody>
                  {subs?.items.map((sub: Subscription) => (
                    <tr key={sub.stripeSubId} className="border-b border-[#1f1f2e]/60 hover:bg-[#0d0d15]">
                      <td className="px-4 py-3">
                        <span className="text-gray-400">{sub.principalType}</span>
                        <span className="ml-2 font-mono text-xs text-gray-600">
                          {sub.principalId.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-white">{sub.planCode}</td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone(sub.status)}>{sub.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {subs && subs.items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-500">
                        {t("noSubscriptions")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
