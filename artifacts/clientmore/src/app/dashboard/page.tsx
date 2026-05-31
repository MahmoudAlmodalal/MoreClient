"use client";

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/language-provider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  apiGet,
  apiSend,
  createWebSocketUrl,
  createAuthenticatedWebSocketUrl,
  type AnalyticsResponse,
  type AnalyticsSocketMessage
} from "@/lib/api";
import {
  MessageSquare,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  ThumbsUp,
  AlertTriangle,
  X
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

// Matches AnalyticsResponse["unanswered"][number] from the backend.
type UnansweredItem = AnalyticsResponse["unanswered"][number];

const subscribeToClientReady = () => () => {};
const getClientReady = () => true;
const getServerReady = () => false;

// Theme-aware chart colors. These resolve to whichever theme is active because
// they reference the live CSS custom properties, so charts re-skin on toggle
// without a re-render.
const chart = {
  axis: "var(--foreground-muted)",
  grid: "var(--border)",
  cursor: "color-mix(in srgb, var(--primary) 8%, transparent)",
  bar: "var(--primary)",
  tooltip: {
    backgroundColor: "var(--popover)",
    borderColor: "var(--border)",
    color: "var(--foreground)",
    borderRadius: "12px",
    boxShadow: "0 8px 30px -12px rgba(0,0,0,0.4)"
  } as React.CSSProperties,
  pie: [
    "var(--color-chart-1)",
    "var(--color-chart-2)",
    "var(--color-chart-3)",
    "var(--color-chart-4)",
    "var(--color-chart-5)"
  ]
};

/** Mirrors the analytics layout (KPI row → charts → queue) so the page doesn't
 *  flash zero-value cards before the backend fetch resolves. */
function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-6">
      <span className="sr-only">Loading analytics…</span>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton className="mt-5 h-7 w-20" />
            <Skeleton className="mt-2 h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-6 h-64 w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <Skeleton className="h-5 w-32" />
          <div className="mt-8 flex justify-center">
            <Skeleton className="h-40 w-40 rounded-full" />
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <Skeleton className="h-5 w-56" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

const tintStyles: Record<string, string> = {
  info: "bg-info/10 text-info",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning"
};

export default function DashboardPage() {
  const { t, isRtl } = useLanguage();
  const isClient = useSyncExternalStore(
    subscribeToClientReady,
    getClientReady,
    getServerReady
  );

  // States for interactive Q&A injector + live analytics from the backend.
  const [unansweredQuestions, setUnansweredQuestions] = useState<UnansweredItem[]>([]);
  const [kpis, setKpis] = useState<AnalyticsResponse["kpis"]>({
    total_questions: 0,
    deflection_rate: 0,
    cost_savings: 0,
    feedback_score: 0
  });
  const [topQuestions, setTopQuestions] = useState<AnalyticsResponse["top_questions"]>([]);
  const [channelDistribution, setChannelDistribution] = useState<
    AnalyticsResponse["channel_distribution"]
  >([]);

  const [selectedQuestion, setSelectedQuestion] = useState<UnansweredItem | null>(null);
  const [answerInput, setAnswerInput] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const dashboardSocketRef = useRef<WebSocket | null>(null);
  const [loading, setLoading] = useState(true);

  const applyAnalyticsData = useCallback((data: AnalyticsResponse) => {
    setKpis(data.kpis);
    setTopQuestions(data.top_questions);
    setChannelDistribution(data.channel_distribution);
    setUnansweredQuestions(data.unanswered);
  }, []);

  // Fetch real analytics on mount; on failure, keep graceful zero/empty defaults.
  useEffect(() => {
    let active = true;
    apiGet<AnalyticsResponse>("/api/analytics")
      .then((data) => {
        if (!active) return;
        applyAnalyticsData(data);
      })
      .catch(() => {
        /* graceful fallback: leave zeros/empty arrays in place */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyAnalyticsData]);

  useEffect(() => {
    if (!isClient) return;

    let stopped = false;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      clearReconnectTimer();
      const socket = new WebSocket(createAuthenticatedWebSocketUrl("/ws/dashboard"));
      dashboardSocketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptRef.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as AnalyticsSocketMessage;
          if (message.type === "analytics.snapshot") {
            applyAnalyticsData(message.data);
          }
        } catch {
          /* ignore malformed frames */
        }
      };

      socket.onclose = () => {
        if (dashboardSocketRef.current === socket) {
          dashboardSocketRef.current = null;
        }
        if (stopped) return;

        const attempt = reconnectAttemptRef.current + 1;
        reconnectAttemptRef.current = attempt;
        const delay = Math.min(30000, 1000 * 2 ** Math.min(attempt - 1, 5));
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      stopped = true;
      clearReconnectTimer();
      dashboardSocketRef.current?.close();
      dashboardSocketRef.current = null;
    };
  }, [applyAnalyticsData, isClient]);

  const handleInjectAnswer = (item: UnansweredItem) => {
    setSelectedQuestion(item);
    setAnswerInput("");
  };

  const submitInjectedAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerInput.trim() || !selectedQuestion) return;

    const item = selectedQuestion;
    try {
      // Teach the bot: persist + embed the approved answer into the KB.
      // The unanswered queue is built from pending handoffs, so item.id is the
      // handoff id (analytics sets UnansweredItem.id = Handoff.id) — pass it as
      // provenance to restore the audit trail, matching the handoffs page.
      await apiSend("/api/learn", "POST", {
        question: item.question,
        answer: answerInput.trim(),
        source_handoff_id: item.id
      });
      // Only mutate the UI once the answer is actually persisted.
      setUnansweredQuestions((prev) => prev.filter((q) => q.id !== item.id));
      setSelectedQuestion(null);
      setToastMessage(t("saved"));
    } catch {
      // Persistence failed: keep the modal open so the agent can retry.
      setToastMessage(t("failed"));
    }

    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

  // KPI cards bound to live values.
  const stats = [
    {
      name: t("kpiTotalQuestions"),
      value: kpis.total_questions.toLocaleString(),
      change: "+12.5%",
      icon: MessageSquare,
      tint: "info"
    },
    {
      name: t("kpiDeflectionRate"),
      value: `${kpis.deflection_rate.toFixed(1)}%`,
      change: "+3.2%",
      icon: CheckCircle,
      tint: "primary"
    },
    {
      name: t("kpiCostSavings"),
      value: `$${kpis.cost_savings}`,
      change: "+$620",
      icon: DollarSign,
      tint: "success"
    },
    {
      name: t("kpiFeedbackScore"),
      value: `${kpis.feedback_score} / 5`,
      change: "+0.15",
      icon: ThumbsUp,
      tint: "warning"
    }
  ];

  // Recharts data, sourced from the backend ([{name,count}] and [{name,value}]).
  const repeatedQuestionsData = topQuestions;

  const sourceShareData = channelDistribution.map((slice, i) => ({
    ...slice,
    color: chart.pie[i % chart.pie.length]
  }));

  if (!isClient) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 ${isRtl ? "left-4" : "right-4"} z-50 flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground shadow-lg`}
        >
          <CheckCircle className="h-4 w-4 text-success" />
          {toastMessage}
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div className="pointer-events-none absolute end-0 top-0 -me-16 -mt-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {t("analyticsTitle")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-fg">{t("analyticsSub")}</p>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="group rounded-2xl border border-border bg-card p-5 transition-shadow duration-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${tintStyles[stat.tint]}`}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        stat.change.startsWith("+")
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-fg"
                      }`}
                    >
                      {stat.change}
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-bold tracking-tight text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-muted-fg">{stat.name}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Top Repeated Questions Bar Chart */}
            <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">{t("topQuestions")}</h3>
                  <p className="text-xs text-muted-fg">Most frequent user questions</p>
                </div>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={repeatedQuestionsData}
                    layout={isRtl ? "vertical" : "horizontal"}
                    margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                    <XAxis
                      dataKey={isRtl ? "count" : "name"}
                      type={isRtl ? "number" : "category"}
                      stroke={chart.axis}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      dataKey={isRtl ? "name" : "count"}
                      type={isRtl ? "category" : "number"}
                      stroke={chart.axis}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={isRtl ? 90 : 30}
                    />
                    <Tooltip cursor={{ fill: chart.cursor }} contentStyle={chart.tooltip} />
                    <Bar dataKey="count" fill={chart.bar} radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Channel Source Share Chart */}
            <div className="flex flex-col rounded-2xl border border-border bg-card p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">{t("sourceDistribution")}</h3>
                  <p className="text-xs text-muted-fg">By channel</p>
                </div>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
                  <Clock className="h-4 w-4 text-teal-500" />
                </span>
              </div>
              <div className="relative h-48 w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceShareData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="var(--card)"
                      strokeWidth={2}
                    >
                      {sourceShareData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chart.tooltip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                {sourceShareData.map((channel) => (
                  <div key={channel.name} className="flex flex-col items-center">
                    <span
                      className="mb-1 h-2 w-2 rounded-full"
                      style={{ backgroundColor: channel.color }}
                    />
                    <span className="max-w-full truncate font-medium text-muted-fg">
                      {channel.name}
                    </span>
                    <span className="mt-0.5 font-bold text-foreground">{channel.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Unanswered List Queue */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                  {t("unansweredListTitle")}
                  <span className="inline-flex items-center rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-semibold text-danger ring-1 ring-inset ring-danger/20">
                    {unansweredQuestions.length}
                  </span>
                </h3>
                <p className="mt-0.5 text-xs text-muted-fg">{t("unansweredListSub")}</p>
              </div>
            </div>

            {unansweredQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle className="h-6 w-6 text-success" />
                </span>
                <p className="text-sm font-semibold text-foreground">{t("unansweredEmpty")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-muted-fg">
                  <thead className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-fg">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-right rtl:text-right">{t("questionCol")}</th>
                      <th scope="col" className="px-4 py-3">{t("channelCol")}</th>
                      <th scope="col" className="px-4 py-3">{t("confidenceScore")}</th>
                      <th scope="col" className="px-4 py-3">{t("timeAgo")}</th>
                      <th scope="col" className="px-4 py-3 text-center">{t("action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {unansweredQuestions.map((item) => (
                      <tr key={item.id} className="transition-colors hover:bg-muted/50">
                        <td className="max-w-md truncate px-4 py-4 text-right font-medium text-foreground rtl:text-right">
                          {item.question}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                              item.channel.toLowerCase() === "telegram"
                                ? "bg-info/10 text-info ring-info/20"
                                : item.channel.toLowerCase() === "whatsapp"
                                ? "bg-success/10 text-success ring-success/20"
                                : "bg-primary/10 text-primary ring-primary/20"
                            }`}
                          >
                            {item.channel}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-mono font-bold text-danger">
                          {Math.round(item.confidence * 100)}%
                        </td>
                        <td className="px-4 py-4 text-muted-fg">{item.timeAgo}</td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleInjectAnswer(item)}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                          >
                            {t("injectAnswer")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Answer Injector Modal */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
              <h4 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <AlertTriangle className="h-5 w-5 text-primary" />
                {t("injectAnswer")}
              </h4>
              <button
                onClick={() => setSelectedQuestion(null)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-muted-fg hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-border bg-background p-4">
              <span className="text-xs font-semibold uppercase text-primary">{t("questionCol")}</span>
              <p className="mt-1 text-right text-sm leading-relaxed text-foreground rtl:text-right">
                {selectedQuestion.question}
              </p>
            </div>

            <form onSubmit={submitInjectedAnswer} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-muted-fg">
                  Define Answer (RAG Vector Injection)
                </label>
                <textarea
                  required
                  rows={4}
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  placeholder="Type the correct response for clientMORE to learn..."
                  className="w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground placeholder:text-muted-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedQuestion(null)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-fg transition-colors hover:bg-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
                >
                  Save and Train Bot
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
