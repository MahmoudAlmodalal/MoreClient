import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import Header from "../components/Header";
import Spinner from "../components/Spinner";
import StatCard from "../components/StatCard";
import { useLanguage } from "../i18n/LanguageProvider";
import { getAnalytics } from "../api/endpoints";
import { ApiError } from "../api/client";
import type { AnalyticsResponse } from "../types/api";

const PIE_COLORS = ["#4f46e5", "#06b6d4", "#f59e0b", "#10b981", "#ef4444"];

export default function DashboardPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getAnalytics()
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.detail : String(e)))
      .finally(() => setLoading(false));
  };

  // Initial fetch: loading already defaults to true, so don't setState
  // synchronously here (the retry button uses `load` for that).
  useEffect(() => {
    let active = true;
    getAnalytics()
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e instanceof ApiError ? e.detail : String(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <Header title={t("analyticsTitle")} subtitle={t("analyticsSub")} />
      <div className="p-6">
        {loading ? (
          <Spinner label={t("loading")} />
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-3 rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              {t("retry")}
            </button>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* KPI cards (analytics is snake_case) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label={t("kpiTotalQuestions")} value={data.kpis.total_questions} accent="text-indigo-600" />
              <StatCard
                label={t("kpiDeflectionRate")}
                value={`${(data.kpis.deflection_rate * 100).toFixed(1)}%`}
                accent="text-cyan-600"
              />
              <StatCard
                label={t("kpiCostSavings")}
                value={`$${data.kpis.cost_savings.toLocaleString()}`}
                accent="text-green-600"
              />
              <StatCard
                label={t("kpiFeedbackScore")}
                value={data.kpis.feedback_score.toFixed(1)}
                accent="text-amber-600"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Top questions */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                <h2 className="mb-4 text-sm font-semibold text-slate-900">{t("topQuestions")}</h2>
                {data.top_questions.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-400">{t("noData")}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.top_questions} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </section>

              {/* Channel distribution */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold text-slate-900">{t("sourceDistribution")}</h2>
                {data.channel_distribution.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-400">{t("noData")}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.channel_distribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                      >
                        {data.channel_distribution.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
