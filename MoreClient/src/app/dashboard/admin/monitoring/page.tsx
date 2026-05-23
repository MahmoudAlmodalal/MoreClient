"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Users, Briefcase, DollarSign, Activity } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Card } from "@/components/ui/card";
import { apiGet, type MetricsResponse, type PlatformMetric } from "../_components/api";

const tooltipStyle = {
  backgroundColor: "#0d0d15",
  borderColor: "#1f1f2e",
  color: "#f3f4f6",
  borderRadius: "8px",
};

export default function AdminMonitoringPage() {
  const { t, isRtl } = useLanguage();
  const [metrics, setMetrics] = useState<PlatformMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<MetricsResponse>("/api/v1/admin/analytics/platform?days=30")
      .then((data) => setMetrics(data.items))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  // Chart data: oldest → newest, with parsed numeric GMV (dollars).
  const chartData = useMemo(
    () =>
      [...metrics]
        .sort((a, b) => a.day.localeCompare(b.day))
        .map((m) => ({
          day: m.day.slice(5, 10), // MM-DD
          signups: m.signupsTalent + m.signupsCompany,
          jobs: m.jobsPublished,
          active: m.activeTalent + m.activeCompanies,
          gmv: Number(m.gmvCents) / 100,
        })),
    [metrics],
  );

  const totals = useMemo(() => {
    return metrics.reduce(
      (acc, m) => ({
        talent: acc.talent + m.signupsTalent,
        companies: acc.companies + m.signupsCompany,
        jobs: acc.jobs + m.jobsPublished,
        gmv: acc.gmv + Number(m.gmvCents) / 100,
      }),
      { talent: 0, companies: 0, jobs: 0, gmv: 0 },
    );
  }, [metrics]);

  const kpis = [
    { label: t("totalTalent"), value: totals.talent.toLocaleString(), icon: Users },
    { label: t("totalCompanies"), value: totals.companies.toLocaleString(), icon: Users },
    { label: t("metricJobs"), value: totals.jobs.toLocaleString(), icon: Briefcase },
    { label: t("metricGmv"), value: `$${totals.gmv.toLocaleString()}`, icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">{t("adminMonitoringTitle")}</h1>
        <p className="text-sm text-gray-500">{t("adminMonitoringSub")} · {t("last30Days")}</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {loading && <p className="text-sm text-gray-500">{t("loading")}</p>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label} tone="dark" className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{kpi.label}</p>
                    <p className="text-lg font-bold text-white">{kpi.value}</p>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card tone="dark">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
              <Activity className="h-4 w-4 text-purple-400" />
              {t("metricSignups")} & {t("metricActive")}
            </h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" />
                  <XAxis dataKey="day" stroke="#4b5563" fontSize={11} tickLine={false} reversed={isRtl} />
                  <YAxis stroke="#4b5563" fontSize={11} tickLine={false} orientation={isRtl ? "right" : "left"} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#8b5cf6", strokeOpacity: 0.2 }} />
                  <Line type="monotone" dataKey="signups" name={t("metricSignups")} stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="active" name={t("metricActive")} stroke="#22d3ee" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card tone="dark">
              <h2 className="mb-4 text-sm font-semibold text-white">{t("metricJobs")}</h2>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" />
                    <XAxis dataKey="day" stroke="#4b5563" fontSize={11} tickLine={false} reversed={isRtl} />
                    <YAxis stroke="#4b5563" fontSize={11} tickLine={false} orientation={isRtl ? "right" : "left"} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(139, 92, 246, 0.05)" }} />
                    <Bar dataKey="jobs" name={t("metricJobs")} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card tone="dark">
              <h2 className="mb-4 text-sm font-semibold text-white">{t("metricGmv")} ($)</h2>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" />
                    <XAxis dataKey="day" stroke="#4b5563" fontSize={11} tickLine={false} reversed={isRtl} />
                    <YAxis stroke="#4b5563" fontSize={11} tickLine={false} orientation={isRtl ? "right" : "left"} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(34, 211, 238, 0.05)" }} />
                    <Bar dataKey="gmv" name={t("metricGmv")} fill="#22d3ee" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
