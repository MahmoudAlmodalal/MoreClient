"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { useLanguage } from "@/components/language-provider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  DollarSign,
  MessageSquare,
  Activity,
  Plus,
  Search,
  CheckCircle,
  AlertTriangle,
  Server,
  Database,
  Cpu,
  TrendingUp,
  Sliders,
  Play,
  Square,
  RefreshCw,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight
} from "lucide-react";

interface TenantSubscription {
  id: string;
  name: string;
  email: string;
  plan: "pro" | "ultra" | "custom";
  status: "active" | "inactive";
  usedMessages: number;
  limitMessages: number;
  createdDate: string;
}

const subscribeToClientReady = () => () => {};
const getClientReady = () => true;
const getServerReady = () => false;

export default function SuperAdminPage() {
  const { t, isRtl, language } = useLanguage();
  
  const isClient = useSyncExternalStore(
    subscribeToClientReady,
    getClientReady,
    getServerReady
  );

  // States
  const [activeTab, setActiveTab] = useState<"overview" | "subscriptions">("overview");
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  // Simulated System Load State
  const [trafficMode, setTrafficMode] = useState<"normal" | "high" | "idle">("normal");
  const [cpuUsage, setCpuUsage] = useState(32);
  const [memUsage, setMemUsage] = useState(48);
  const [dbLatency, setDbLatency] = useState(14);
  const [llmLatency, setLlmLatency] = useState(180);

  // Tenant Subscriptions Mock Database
  const [tenants, setTenants] = useState<TenantSubscription[]>([
    {
      id: "1",
      name: "Acme Corporates",
      email: "admin@acme.com",
      plan: "pro",
      status: "active",
      usedMessages: 382,
      limitMessages: 500,
      createdDate: "2026-03-01"
    },
    {
      id: "2",
      name: "EduTraker Systems",
      email: "tech@edutraker.edu",
      plan: "ultra",
      status: "active",
      usedMessages: 1120,
      limitMessages: 1500,
      createdDate: "2026-04-12"
    },
    {
      id: "3",
      name: "Noor Al-Huda Quran Center",
      email: "contact@nooralhuda.org",
      plan: "pro",
      status: "active",
      usedMessages: 145,
      limitMessages: 500,
      createdDate: "2026-04-20"
    },
    {
      id: "4",
      name: "TechStart Hub",
      email: "billing@techstart.io",
      plan: "custom",
      status: "inactive",
      usedMessages: 0,
      limitMessages: 10000,
      createdDate: "2026-05-02"
    },
    {
      id: "5",
      name: "GazaDevs Agency",
      email: "dev@gazadevs.ps",
      plan: "pro",
      status: "active",
      usedMessages: 490,
      limitMessages: 500,
      createdDate: "2026-05-18"
    }
  ]);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTenant, setCurrentTenant] = useState<TenantSubscription | null>(null);

  // Form States for Creation
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantEmail, setNewTenantEmail] = useState("");
  const [newTenantPlan, setNewTenantPlan] = useState<"pro" | "ultra" | "custom">("pro");
  const [newTenantLimit, setNewTenantLimit] = useState(500);

  // Form States for Editing
  const [editTenantName, setEditTenantName] = useState("");
  const [editTenantEmail, setEditTenantEmail] = useState("");
  const [editTenantPlan, setEditTenantPlan] = useState<"pro" | "ultra" | "custom">("pro");
  const [editTenantLimit, setEditTenantLimit] = useState(500);

  // Dynamically update system load stats based on Traffic Mode
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (trafficMode === "high") {
      setCpuUsage(84);
      setMemUsage(78);
      setDbLatency(42);
      setLlmLatency(420);
      interval = setInterval(() => {
        setCpuUsage(prev => Math.min(95, Math.max(78, prev + Math.floor(Math.random() * 5) - 2)));
        setDbLatency(prev => Math.min(60, Math.max(35, prev + Math.floor(Math.random() * 7) - 3)));
        setLlmLatency(prev => Math.min(480, Math.max(380, prev + Math.floor(Math.random() * 20) - 10)));
      }, 3000);
    } else if (trafficMode === "idle") {
      setCpuUsage(12);
      setMemUsage(24);
      setDbLatency(4);
      setLlmLatency(110);
      interval = setInterval(() => {
        setCpuUsage(prev => Math.min(18, Math.max(8, prev + Math.floor(Math.random() * 3) - 1)));
        setDbLatency(prev => Math.min(7, Math.max(2, prev + Math.floor(Math.random() * 3) - 1)));
        setLlmLatency(prev => Math.min(130, Math.max(95, prev + Math.floor(Math.random() * 10) - 5)));
      }, 3000);
    } else {
      // Normal Traffic
      setCpuUsage(34);
      setMemUsage(42);
      setDbLatency(12);
      setLlmLatency(175);
      interval = setInterval(() => {
        setCpuUsage(prev => Math.min(45, Math.max(25, prev + Math.floor(Math.random() * 5) - 2)));
        setDbLatency(prev => Math.min(18, Math.max(8, prev + Math.floor(Math.random() * 4) - 2)));
        setLlmLatency(prev => Math.min(210, Math.max(150, prev + Math.floor(Math.random() * 14) - 7)));
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [trafficMode]);

  // Show customized Toast notifications
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // KPIs
  const activeTenantsCount = tenants.filter(t => t.status === "active").length;
  const globalAIMessages = tenants.reduce((sum, t) => sum + t.usedMessages, 0);

  const calculateMRR = () => {
    return tenants
      .filter(t => t.status === "active")
      .reduce((sum, t) => {
        if (t.plan === "pro") return sum + 500;
        if (t.plan === "ultra") return sum + 1500;
        return sum + 3000; // Custom
      }, 0);
  };

  const totalMRR = calculateMRR();

  // Create Subscription Action
  const handleCreateSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newTenantEmail) return;

    const newTenant: TenantSubscription = {
      id: Date.now().toString(),
      name: newTenantName,
      email: newTenantEmail,
      plan: newTenantPlan,
      status: "active",
      usedMessages: 0,
      limitMessages: newTenantLimit,
      createdDate: new Date().toISOString().split("T")[0]
    };

    setTenants(prev => [...prev, newTenant]);
    setIsCreateModalOpen(false);
    triggerToast(t("createSubscriptionSuccess"));
    
    // Clear forms
    setNewTenantName("");
    setNewTenantEmail("");
    setNewTenantPlan("pro");
    setNewTenantLimit(500);
  };

  // Toggle Activation/Deactivation
  const handleToggleStatus = (id: string) => {
    let updatedStatus = "";
    setTenants(prev =>
      prev.map(t => {
        if (t.id === id) {
          const nextStatus = t.status === "active" ? "inactive" : "active";
          updatedStatus = nextStatus;
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );

    if (updatedStatus === "inactive") {
      triggerToast(t("deactivatedSuccess"));
    } else {
      triggerToast(t("activatedSuccess"));
    }
  };

  // Open Edit Dialog
  const openEditModal = (tenant: TenantSubscription) => {
    setCurrentTenant(tenant);
    setEditTenantName(tenant.name);
    setEditTenantEmail(tenant.email);
    setEditTenantPlan(tenant.plan);
    setEditTenantLimit(tenant.limitMessages);
    setIsEditModalOpen(true);
  };

  // Save Edit Action
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    setTenants(prev =>
      prev.map(t => {
        if (t.id === currentTenant.id) {
          return {
            ...t,
            name: editTenantName,
            email: editTenantEmail,
            plan: editTenantPlan,
            limitMessages: editTenantLimit
          };
        }
        return t;
      })
    );

    setIsEditModalOpen(false);
    triggerToast(t("saved"));
  };

  // Delete Action
  const handleDeleteTenant = (id: string) => {
    if (confirm("Are you sure you want to delete this subscription?")) {
      setTenants(prev => prev.filter(t => t.id !== id));
      triggerToast("Subscription deleted.");
    }
  };

  // Filtering Subscribers
  const filteredTenants = tenants.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPlan = selectedPlanFilter === "all" || t.plan === selectedPlanFilter;
    const matchesStatus =
      selectedStatusFilter === "all" ||
      (selectedStatusFilter === "active" && t.status === "active") ||
      (selectedStatusFilter === "inactive" && t.status === "inactive");

    return matchesSearch && matchesPlan && matchesStatus;
  });

  // KPI UI Metadata
  const kpis = [
    {
      name: t("metricTotalTenants"),
      value: activeTenantsCount,
      subText: `${tenants.length} registered total`,
      icon: Users,
      color: "from-blue-500/10 to-indigo-500/10 border-blue-500/30",
      iconColor: "text-blue-400"
    },
    {
      name: t("metricTotalMRR"),
      value: `$${totalMRR.toLocaleString()}`,
      subText: "SaaS Monthly Recurrent Revenue",
      icon: DollarSign,
      color: "from-emerald-500/10 to-green-500/10 border-emerald-500/30",
      iconColor: "text-emerald-400"
    },
    {
      name: t("metricGlobalMessages"),
      value: globalAIMessages.toLocaleString(),
      subText: "AI requests handled this month",
      icon: MessageSquare,
      color: "from-purple-500/10 to-violet-500/10 border-purple-500/30",
      iconColor: "text-purple-400"
    },
    {
      name: t("metricSystemHealth"),
      value: trafficMode === "high" ? "API Alert" : "100% OK",
      subText: trafficMode === "high" ? "Heavy LLM Traffic" : t("healthHealthy"),
      icon: Activity,
      color:
        trafficMode === "high"
          ? "from-amber-500/10 to-orange-500/10 border-amber-500/30 animate-pulse"
          : "from-purple-500/10 to-pink-500/10 border-purple-500/30",
      iconColor: trafficMode === "high" ? "text-amber-400" : "text-purple-400"
    }
  ];

  if (!isClient) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Toast popup */}
      {toast && (
        <div
          className={`fixed top-4 ${
            isRtl ? "left-4" : "right-4"
          } z-50 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg animate-bounce`}
        >
          {toast}
        </div>
      )}

      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/10 bg-[#0d0d15] p-6 glow-purple">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-purple-500/5 blur-3xl" />
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              {t("superAdminTitle")}
            </h2>
            <p className="mt-2 text-sm text-gray-400 max-w-2xl">
              {t("superAdminSubtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              variant="primary"
              size="md"
              className="flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>{t("createSubscription")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`relative overflow-hidden rounded-xl border bg-gradient-to-br p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 ${kpi.color}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">{kpi.name}</span>
                <Icon className={`h-5 w-5 ${kpi.iconColor}`} />
              </div>
              <div className="mt-3 flex flex-col justify-end">
                <span className="text-2xl font-bold tracking-tight text-white">{kpi.value}</span>
                <span className="text-[11px] text-gray-500 mt-1 font-medium">{kpi.subText}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-[#1f1f2e] gap-4">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 px-1 ${
            activeTab === "overview"
              ? "border-purple-500 text-white"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          {t("tabOverview")}
        </button>
        <button
          onClick={() => setActiveTab("subscriptions")}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 px-1 ${
            activeTab === "subscriptions"
              ? "border-purple-500 text-white"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          {t("tabSubscriptions")}
        </button>
      </div>

      {/* View Content */}
      {activeTab === "overview" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Performance Dials */}
          <div className="lg:col-span-2 rounded-xl border border-[#1f1f2e] bg-[#0d0d15] p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white">System Performance Meters</h3>
                <p className="text-xs text-gray-500 mt-0.5">Real-time resource utilization indicators</p>
              </div>
              <div className="flex items-center gap-1 bg-[#050508] border border-[#1f1f2e] rounded-lg p-1">
                <button
                  onClick={() => setTrafficMode("idle")}
                  className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${
                    trafficMode === "idle" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Idle
                </button>
                <button
                  onClick={() => setTrafficMode("normal")}
                  className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${
                    trafficMode === "normal" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Normal
                </button>
                <button
                  onClick={() => setTrafficMode("high")}
                  className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${
                    trafficMode === "high" ? "bg-red-600 text-white animate-pulse" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Peak Load
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* CPU Meter */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Cpu className="h-4 w-4 text-purple-400" />
                    {t("cpuUsage")}
                  </span>
                  <span className="text-white">{cpuUsage}%</span>
                </div>
                <div className="h-3 w-full bg-[#050508] border border-[#1f1f2e] rounded-full overflow-hidden">
                  <div
                    style={{ width: `${cpuUsage}%` }}
                    className={`h-full rounded-full transition-all duration-1000 ${
                      cpuUsage > 80 ? "bg-red-500 animate-pulse" : cpuUsage > 60 ? "bg-amber-500" : "bg-purple-500"
                    }`}
                  />
                </div>
              </div>

              {/* Memory Meter */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Server className="h-4 w-4 text-blue-400" />
                    {t("memoryUsage")}
                  </span>
                  <span className="text-white">{memUsage}%</span>
                </div>
                <div className="h-3 w-full bg-[#050508] border border-[#1f1f2e] rounded-full overflow-hidden">
                  <div
                    style={{ width: `${memUsage}%` }}
                    className={`h-full rounded-full transition-all duration-1000 ${
                      memUsage > 80 ? "bg-red-500" : memUsage > 60 ? "bg-amber-500" : "bg-blue-500"
                    }`}
                  />
                </div>
              </div>

              {/* Database Latency */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-emerald-400" />
                    {t("dbLatency")}
                  </span>
                  <span className="text-white">{dbLatency} ms</span>
                </div>
                <div className="h-3 w-full bg-[#050508] border border-[#1f1f2e] rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, (dbLatency / 60) * 100)}%` }}
                    className={`h-full rounded-full transition-all duration-1000 ${
                      dbLatency > 40 ? "bg-red-500" : dbLatency > 20 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                  />
                </div>
              </div>

              {/* LLM Response Latency */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-pink-400" />
                    {t("llmLatency")}
                  </span>
                  <span className="text-white">{llmLatency} ms</span>
                </div>
                <div className="h-3 w-full bg-[#050508] border border-[#1f1f2e] rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, (llmLatency / 500) * 100)}%` }}
                    className={`h-full rounded-full transition-all duration-1000 ${
                      llmLatency > 400 ? "bg-red-500" : llmLatency > 300 ? "bg-amber-500" : "bg-pink-500"
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-[#1f1f2e] pt-4 mt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="bg-[#050508] border border-[#1f1f2e] rounded-xl p-3">
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Web Servers</p>
                  <span className="inline-flex items-center gap-1 mt-1 text-emerald-400 text-xs font-bold">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Healthy (2/2)
                  </span>
                </div>
                <div className="bg-[#050508] border border-[#1f1f2e] rounded-xl p-3">
                  <p className="text-[10px] text-gray-500 font-bold uppercase">ChromaDB Cluster</p>
                  <span className="inline-flex items-center gap-1 mt-1 text-emerald-400 text-xs font-bold">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Healthy (3/3)
                  </span>
                </div>
                <div className="bg-[#050508] border border-[#1f1f2e] rounded-xl p-3">
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Redis Cache</p>
                  <span className="inline-flex items-center gap-1 mt-1 text-emerald-400 text-xs font-bold">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Active (100%)
                  </span>
                </div>
                <div className="bg-[#050508] border border-[#1f1f2e] rounded-xl p-3">
                  <p className="text-[10px] text-gray-500 font-bold uppercase">LLM Provider API</p>
                  <span className={`inline-flex items-center gap-1 mt-1 text-xs font-bold ${
                    trafficMode === "high" ? "text-amber-400" : "text-emerald-400"
                  }`}>
                    <span className={`h-2 w-2 rounded-full ${
                      trafficMode === "high" ? "bg-amber-400 animate-ping" : "bg-emerald-400 animate-pulse"
                    }`} />
                    {trafficMode === "high" ? "Latency Alert" : "Responsive"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* System Overview Side Card */}
          <div className="rounded-xl border border-[#1f1f2e] bg-[#0d0d15] p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-purple-400" />
                Active Incidents
              </h3>
              <p className="text-xs text-gray-500 mt-1">SaaS infrastructure incident alerts</p>
              
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-purple-500/5 border border-purple-500/20 p-3 flex gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">SSL Renewal Completed</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">Certificates for *.clientmore.com successfully verified.</p>
                  </div>
                </div>

                <div className={`rounded-xl border p-3 flex gap-3 transition-colors ${
                  trafficMode === "high" 
                    ? "bg-amber-500/5 border-amber-500/30" 
                    : "bg-[#050508]/40 border-[#1f1f2e]"
                }`}>
                  <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${
                    trafficMode === "high" ? "text-amber-400 animate-bounce" : "text-gray-600"
                  }`} />
                  <div>
                    <h4 className={`text-xs font-bold ${trafficMode === "high" ? "text-white" : "text-gray-500"}`}>
                      LLM Model Latency Check
                    </h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {trafficMode === "high" 
                        ? "Gemini-3.5 API response is taking longer than 400ms threshold." 
                        : "Response metrics within normal B2B limits."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#1f1f2e]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-semibold">Database backup status:</span>
                <span className="text-emerald-400 font-bold">Daily Scheduled (Passed)</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filters Row */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#0d0d15] p-4 rounded-xl border border-[#1f1f2e]">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-500" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full pl-9 pr-4 py-2 border border-[#1f1f2e] bg-[#050508] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Select dropdown filters */}
            <div className="flex gap-3 w-full md:w-auto">
              <select
                value={selectedPlanFilter}
                onChange={e => setSelectedPlanFilter(e.target.value)}
                className="bg-[#050508] border border-[#1f1f2e] rounded-xl text-xs font-semibold text-gray-300 px-3 py-2 focus:outline-none focus:border-purple-500"
              >
                <option value="all">{t("allPlans")}</option>
                <option value="pro">Pro Tier ($500)</option>
                <option value="ultra">Ultra Tier ($1500)</option>
                <option value="custom">Custom Tier ($3000)</option>
              </select>

              <select
                value={selectedStatusFilter}
                onChange={e => setSelectedStatusFilter(e.target.value)}
                className="bg-[#050508] border border-[#1f1f2e] rounded-xl text-xs font-semibold text-gray-300 px-3 py-2 focus:outline-none focus:border-purple-500"
              >
                <option value="all">{t("filterStatus")}: {t("all")}</option>
                <option value="active">{t("active")}</option>
                <option value="inactive">{t("inactive")}</option>
              </select>
            </div>
          </div>

          {/* Tenants Table */}
          <div className="rounded-xl border border-[#1f1f2e] bg-[#0d0d15] overflow-hidden">
            {filteredTenants.length === 0 ? (
              <div className="py-12 text-center">
                <AlertTriangle className="h-10 w-10 text-gray-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-400">{t("noTenants")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="border-b border-[#1f1f2e] bg-[#07070b] text-xs font-semibold uppercase text-gray-400">
                    <tr>
                      <th className="px-6 py-3.5 text-right rtl:text-right">{t("tenantNameCol")}</th>
                      <th className="px-6 py-3.5">{t("tenantEmailCol")}</th>
                      <th className="px-6 py-3.5">{t("tenantPlanCol")}</th>
                      <th className="px-6 py-3.5">{t("tenantStatusCol")}</th>
                      <th className="px-6 py-3.5">{t("tenantUsageCol")}</th>
                      <th className="px-6 py-3.5 text-center">{t("tenantActionsCol")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f2e]">
                    {filteredTenants.map(tenant => (
                      <tr key={tenant.id} className="hover:bg-[#1a1a26]/10 transition-colors">
                        <td className="px-6 py-4 font-bold text-white text-right rtl:text-right">
                          {tenant.name}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-400">
                          {tenant.email}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold uppercase ${
                            tenant.plan === "pro"
                              ? "bg-blue-500/10 text-blue-400 ring-1 ring-inset ring-blue-500/20"
                              : tenant.plan === "ultra"
                              ? "bg-purple-500/10 text-purple-400 ring-1 ring-inset ring-purple-500/20"
                              : "bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20"
                          }`}>
                            {tenant.plan}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            tenant.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              tenant.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                            }`} />
                            {tenant.status === "active" ? t("active") : t("inactive")}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-medium text-gray-500">
                              <span>{tenant.usedMessages} / {tenant.limitMessages}</span>
                              <span>{Math.round((tenant.usedMessages / tenant.limitMessages) * 100)}%</span>
                            </div>
                            <div className="h-1.5 w-24 bg-[#050508] rounded-full overflow-hidden border border-[#1f1f2e]">
                              <div
                                style={{ width: `${Math.min(100, (tenant.usedMessages / tenant.limitMessages) * 100)}%` }}
                                className={`h-full rounded-full ${
                                  (tenant.usedMessages / tenant.limitMessages) > 0.8 ? "bg-red-400" : "bg-purple-500"
                                }`}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Toggle Activation Button */}
                            <button
                              onClick={() => handleToggleStatus(tenant.id)}
                              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all border ${
                                tenant.status === "active"
                                  ? "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10"
                                  : "border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10"
                              }`}
                            >
                              {tenant.status === "active" ? t("deactivateBtn") : t("activateBtn")}
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => openEditModal(tenant)}
                              className="rounded-lg border border-[#1f1f2e] bg-[#050508] p-1.5 text-gray-400 hover:text-white transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteTenant(tenant.id)}
                              className="rounded-lg border border-red-500/10 bg-[#050508] p-1.5 text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE SUBSCRIPTION MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[#1f1f2e] bg-[#0d0d15] p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-[#1f1f2e] pb-4 mb-4">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-purple-400" />
                {t("createSubscription")}
              </h4>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-[#1f1f2e] hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubscription} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">
                  {t("companyName")}
                </label>
                <input
                  required
                  type="text"
                  value={newTenantName}
                  onChange={e => setNewTenantName(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="w-full rounded-xl border border-[#1f1f2e] bg-[#050508] p-2.5 text-sm text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">
                  {t("tenantEmailCol")}
                </label>
                <input
                  required
                  type="email"
                  value={newTenantEmail}
                  onChange={e => setNewTenantEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="w-full rounded-xl border border-[#1f1f2e] bg-[#050508] p-2.5 text-sm text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">
                    {t("tenantPlanCol")}
                  </label>
                  <select
                    value={newTenantPlan}
                    onChange={e => {
                      const val = e.target.value as "pro" | "ultra" | "custom";
                      setNewTenantPlan(val);
                      if (val === "pro") setNewTenantLimit(500);
                      else if (val === "ultra") setNewTenantLimit(1500);
                      else setNewTenantLimit(5000);
                    }}
                    className="w-full rounded-xl border border-[#1f1f2e] bg-[#050508] p-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="pro">Pro Plan ($500)</option>
                    <option value="ultra">Ultra Plan ($1500)</option>
                    <option value="custom">Custom Plan (Negotiated)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">
                    Monthly Message Limit
                  </label>
                  <input
                    required
                    type="number"
                    value={newTenantLimit}
                    onChange={e => setNewTenantLimit(parseInt(e.target.value) || 0)}
                    className="w-full rounded-xl border border-[#1f1f2e] bg-[#050508] p-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#1f1f2e] mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-[#1f1f2e] px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-[#1a1a26]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-500 shadow-md shadow-purple-600/10"
                >
                  Provision Subscriber
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SUBSCRIPTION MODAL */}
      {isEditModalOpen && currentTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[#1f1f2e] bg-[#0d0d15] p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-[#1f1f2e] pb-4 mb-4">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-purple-400" />
                Manage {currentTenant.name}
              </h4>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-[#1f1f2e] hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">
                  {t("companyName")}
                </label>
                <input
                  required
                  type="text"
                  value={editTenantName}
                  onChange={e => setEditTenantName(e.target.value)}
                  className="w-full rounded-xl border border-[#1f1f2e] bg-[#050508] p-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">
                  {t("tenantEmailCol")}
                </label>
                <input
                  required
                  type="email"
                  value={editTenantEmail}
                  onChange={e => setEditTenantEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#1f1f2e] bg-[#050508] p-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">
                    {t("tenantPlanCol")}
                  </label>
                  <select
                    value={editTenantPlan}
                    onChange={e => {
                      const val = e.target.value as "pro" | "ultra" | "custom";
                      setEditTenantPlan(val);
                      if (val === "pro") setEditTenantLimit(500);
                      else if (val === "ultra") setEditTenantLimit(1500);
                      else setEditTenantLimit(10000);
                    }}
                    className="w-full rounded-xl border border-[#1f1f2e] bg-[#050508] p-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="pro">Pro Plan ($500)</option>
                    <option value="ultra">Ultra Plan ($1500)</option>
                    <option value="custom">Custom Plan (Negotiated)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">
                    Monthly Message Limit
                  </label>
                  <input
                    required
                    type="number"
                    value={editTenantLimit}
                    onChange={e => setEditTenantLimit(parseInt(e.target.value) || 0)}
                    className="w-full rounded-xl border border-[#1f1f2e] bg-[#050508] p-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#1f1f2e] mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl border border-[#1f1f2e] px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-[#1a1a26]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-500 shadow-md shadow-purple-600/10"
                >
                  Save Subscriber Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
