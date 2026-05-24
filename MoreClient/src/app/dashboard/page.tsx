"use client";

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLanguage } from "@/components/language-provider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  apiGet,
  apiSend,
  createWebSocketUrl,
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
  AlertTriangle
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
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

/** Mirrors the analytics layout (KPI row → charts → queue) so the page doesn't
 *  flash zero-value cards before the backend fetch resolves. */
function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-8">
      <span className="sr-only">Loading analytics…</span>
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#1f1f2e] bg-[#0d0d15] p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-5 rounded-md" />
            </div>
            <Skeleton className="mt-4 h-7 w-20" />
          </div>
        ))}
      </div>
      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-[#1f1f2e] bg-[#0d0d15] p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-6 h-64 w-full rounded-xl" />
        </div>
        <div className="rounded-xl border border-[#1f1f2e] bg-[#0d0d15] p-6">
          <Skeleton className="h-5 w-32" />
          <div className="mt-8 flex justify-center">
            <Skeleton className="h-40 w-40 rounded-full" />
          </div>
        </div>
      </div>
      {/* Queue */}
      <div className="rounded-xl border border-[#1f1f2e] bg-[#0d0d15] p-6">
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
      const socket = new WebSocket(createWebSocketUrl("/ws/dashboard"));
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
      color: "from-blue-500/10 to-indigo-500/10 border-blue-500/30",
      iconColor: "text-blue-400"
    },
    {
      name: t("kpiDeflectionRate"),
      value: `${(kpis.deflection_rate * 100).toFixed(1)}%`,
      change: "+3.2%",
      icon: CheckCircle,
      color: "from-purple-500/10 to-violet-500/10 border-purple-500/30",
      iconColor: "text-purple-400"
    },
    {
      name: t("kpiCostSavings"),
      value: `$${kpis.cost_savings}`,
      change: "+$620",
      icon: DollarSign,
      color: "from-emerald-500/10 to-green-500/10 border-emerald-500/30",
      iconColor: "text-emerald-400"
    },
    {
      name: t("kpiFeedbackScore"),
      value: `${kpis.feedback_score} / 5`,
      change: "+0.15",
      icon: ThumbsUp,
      color: "from-amber-500/10 to-orange-500/10 border-amber-500/30",
      iconColor: "text-amber-400"
    }
  ];

  // Recharts data, sourced from the backend ([{name,count}] and [{name,value}]).
  const repeatedQuestionsData = topQuestions;

  const pieColors = ["#8b5cf6", "#10b981", "#3b82f6", "#f59e0b", "#ef4444"];
  const sourceShareData = channelDistribution.map((slice, i) => ({
    ...slice,
    color: pieColors[i % pieColors.length]
  }));

  if (!isClient) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 ${isRtl ? "left-4" : "right-4"} z-50 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg animate-bounce`}>
          {toastMessage}
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/10 bg-[#0d0d15] p-6 glow-purple">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-purple-500/5 blur-3xl" />
        <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          {t("analyticsTitle")}
        </h2>
        <p className="mt-2 text-sm text-gray-400 max-w-2xl">
          {t("analyticsSub")}
        </p>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
      <>
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className={`relative overflow-hidden rounded-xl border bg-gradient-to-br p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-purple-500/5 ${stat.color}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">{stat.name}</span>
                <Icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-white">{stat.value}</span>
                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                  stat.change.startsWith("+")
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-purple-500/10 text-purple-400"
                }`}>
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top Repeated Questions Bar Chart */}
        <div className="lg:col-span-2 rounded-xl border border-[#1f1f2e] bg-[#0d0d15] p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">{t("topQuestions")}</h3>
              <p className="text-xs text-gray-500">Most frequent user search parameters</p>
            </div>
            <TrendingUp className="h-5 w-5 text-purple-400" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={repeatedQuestionsData}
                layout={isRtl ? "vertical" : "horizontal"}
                margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
              >
                <XAxis
                  dataKey={isRtl ? "count" : "name"}
                  stroke="#4b5563"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  dataKey={isRtl ? "name" : "count"}
                  stroke="#4b5563"
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(139, 92, 246, 0.05)" }}
                  contentStyle={{
                    backgroundColor: "#0d0d15",
                    borderColor: "#1f1f2e",
                    color: "#f3f4f6",
                    borderRadius: "8px"
                  }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Source Share Chart */}
        <div className="rounded-xl border border-[#1f1f2e] bg-[#0d0d15] p-6 flex flex-col">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">{t("sourceDistribution")}</h3>
              <p className="text-xs text-gray-500">Breakdown of support query entry points</p>
            </div>
            <Clock className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="h-48 w-full flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceShareData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sourceShareData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0d0d15",
                    borderColor: "#1f1f2e",
                    color: "#f3f4f6",
                    borderRadius: "8px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            {sourceShareData.map((channel) => (
              <div key={channel.name} className="flex flex-col items-center">
                <span className="h-2 w-2 rounded-full mb-1" style={{ backgroundColor: channel.color }} />
                <span className="text-gray-400 truncate max-w-full font-medium">{channel.name}</span>
                <span className="text-white font-bold mt-0.5">{channel.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unanswered List Queue */}
      <div className="rounded-xl border border-[#1f1f2e] bg-[#0d0d15] p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {t("unansweredListTitle")}
              <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400 ring-1 ring-inset ring-red-500/20">
                {unansweredQuestions.length}
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("unansweredListSub")}
            </p>
          </div>
        </div>

        {unansweredQuestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-10 w-10 text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-white">{t("unansweredEmpty")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="border-b border-[#1f1f2e] bg-[#07070b] text-xs font-semibold uppercase text-gray-400">
                <tr>
                  <th scope="col" className="px-4 py-3 text-right rtl:text-right">{t("questionCol")}</th>
                  <th scope="col" className="px-4 py-3">{t("channelCol")}</th>
                  <th scope="col" className="px-4 py-3">{t("confidenceScore")}</th>
                  <th scope="col" className="px-4 py-3">{t("timeAgo")}</th>
                  <th scope="col" className="px-4 py-3 text-center">{t("action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f2e]">
                {unansweredQuestions.map((item) => (
                  <tr key={item.id} className="hover:bg-[#1a1a26]/20 transition-colors">
                    <td className="px-4 py-4 font-medium text-white max-w-md truncate text-right rtl:text-right">
                      {item.question}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                        item.channel.toLowerCase() === "telegram"
                          ? "bg-blue-500/10 text-blue-400 ring-1 ring-inset ring-blue-500/20"
                          : item.channel.toLowerCase() === "whatsapp"
                          ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20"
                          : "bg-purple-500/10 text-purple-400 ring-1 ring-inset ring-purple-500/20"
                      }`}>
                        {item.channel}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono font-bold text-red-400">
                      {Math.round(item.confidence * 100)}%
                    </td>
                    <td className="px-4 py-4 text-gray-500">
                      {item.timeAgo}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleInjectAnswer(item)}
                        className="rounded-lg bg-purple-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-600 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-[#1f1f2e] bg-[#0d0d15] p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-[#1f1f2e] pb-4 mb-4">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-purple-400" />
                {t("injectAnswer")}
              </h4>
              <button
                onClick={() => setSelectedQuestion(null)}
                className="rounded-md p-1 text-gray-400 hover:bg-[#1f1f2e] hover:text-white"
              >
                &times;
              </button>
            </div>

            <div className="mb-4 rounded-xl bg-[#07070b] p-4 border border-[#1f1f2e]">
              <span className="text-xs font-semibold text-purple-400 uppercase">{t("questionCol")}</span>
              <p className="text-sm text-white mt-1 leading-relaxed text-right rtl:text-right">
                {selectedQuestion.question}
              </p>
            </div>

            <form onSubmit={submitInjectedAnswer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                  Define Answer (RAG Vector Injection)
                </label>
                <textarea
                  required
                  rows={4}
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  placeholder="Type the correct response for clientMORE to learn..."
                  className="w-full rounded-xl border border-[#1f1f2e] bg-[#07070b] p-3 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedQuestion(null)}
                  className="rounded-xl border border-[#1f1f2e] px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-[#1a1a26]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-500 shadow-md shadow-purple-600/10"
                >
                  Save and Train Bot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
