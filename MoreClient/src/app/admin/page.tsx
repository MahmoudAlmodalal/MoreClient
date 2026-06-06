"use client";

import React, { useState, useSyncExternalStore, useCallback } from "react";
import { useLanguage } from "@/components/language-provider";
import { useAsyncOnMount } from "@/lib/use-async-effect";
import type { TenantOut } from "@/lib/api";
import {
  fetchTenants,
  createTenant,
  updateTenant,
  deleteTenant as apiDeleteTenant,
  toggleTenantStatus,
  ApiError,
  ADMIN_KEY_STORAGE,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  AlertTriangle,
  Server,
  Edit2,
  Trash2,
  Globe,
  Copy,
  Check,
} from "lucide-react";

const fallbackOrigin = "http://localhost:5000";
const subscribeToClientReady = () => () => {};
const getClientReady = () => true;
const getServerReady = () => false;
const subscribeOrigin = () => () => {};
const getClientOrigin = () =>
  typeof window === "undefined" ? fallbackOrigin : window.location.origin;
const getServerOrigin = () => fallbackOrigin;

const buildTenantScriptSnippet = (origin: string, tenantKey: string) =>
  `<script src="${origin}/embed.js" data-tenant-key="${tenantKey}"></script>`;

const buildTenantIframeSnippet = (origin: string, tenantKey: string) =>
  `<iframe src="${origin}/widget?tenantKey=${encodeURIComponent(tenantKey)}" width="380" height="600" style="border:none; border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></iframe>`;

export default function SuperAdminPage() {
  const { t, isRtl } = useLanguage();
  
  const isClient = useSyncExternalStore(
    subscribeToClientReady,
    getClientReady,
    getServerReady
  );
  const currentOrigin = useSyncExternalStore(
    subscribeOrigin,
    getClientOrigin,
    getServerOrigin
  );

  // States
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  // Admin key gate
  const [needsKey, setNeedsKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Real data from backend
  const [tenants, setTenants] = useState<TenantOut[]>([]);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTenant, setCurrentTenant] = useState<TenantOut | null>(null);
  const [copiedTenantSnippet, setCopiedTenantSnippet] = useState<string | null>(null);

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

  // ── Data fetching ───────────────────────────────────────────────────────

  const handleAuthError = useCallback((err: unknown): boolean => {
    if (err instanceof ApiError && err.status === 401) {
      if (typeof window !== "undefined") window.sessionStorage.removeItem(ADMIN_KEY_STORAGE);
      setNeedsKey(true);
      return true;
    }
    return false;
  }, []);

  const loadData = useCallback(async () => {
    try {
      const list = await fetchTenants();
      setTenants(list);
      setNeedsKey(false);
      setKeyError(null);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useAsyncOnMount(loadData, [loadData]);

  const handleSubmitKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(ADMIN_KEY_STORAGE, keyInput.trim());
    }

    setLoading(true);
    setKeyError(null);

    try {
      const list = await fetchTenants();
      setTenants(list);
      setNeedsKey(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setKeyError(isRtl ? "مفتاح مشرف غير صالح" : "Invalid admin key.");
      } else {
        setKeyError(err instanceof Error ? err.message : "Connection failed.");
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(ADMIN_KEY_STORAGE);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createTenant({
        name: newTenantName.trim(),
        email: newTenantEmail.trim(),
        plan: newTenantPlan,
        limitMessages: newTenantLimit,
      });

      setTenants(prev => [...prev, created]);
      setIsCreateModalOpen(false);

      // Reset Create Form
      setNewTenantName("");
      setNewTenantEmail("");
      setNewTenantPlan("pro");
      setNewTenantLimit(500);

      triggerToast(isRtl ? "تم إنشاء الاشتراك بنجاح" : "Subscription created successfully.");
    } catch (err) {
      if (!handleAuthError(err)) {
        triggerToast(err instanceof Error ? err.message : "Failed to create subscription.");
      }
    }
  };

  const openEditModal = (tenant: TenantOut) => {
    setCurrentTenant(tenant);
    setEditTenantName(tenant.name);
    setEditTenantEmail(tenant.email);
    setEditTenantPlan(tenant.plan as any);
    setEditTenantLimit(tenant.limitMessages);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    try {
      const updated = await updateTenant(currentTenant.id, {
        name: editTenantName.trim(),
        email: editTenantEmail.trim(),
        plan: editTenantPlan,
        limitMessages: editTenantLimit,
      });

      setTenants(prev => prev.map(t => (t.id === updated.id ? updated : t)));
      setIsEditModalOpen(false);
      triggerToast(isRtl ? "تم تحديث البيانات بنجاح" : "Subscription updated successfully.");
    } catch (err) {
      if (!handleAuthError(err)) {
        triggerToast(err instanceof Error ? err.message : "Failed to update subscription.");
      }
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      const updated = await toggleTenantStatus(id);
      setTenants(prev => prev.map(t => (t.id === updated.id ? updated : t)));
      triggerToast(
        isRtl
          ? `تم ${updated.status === "active" ? "تفعيل" : "تعطيل"} الاشتراك`
          : `Subscription has been ${updated.status === "active" ? "activated" : "deactivated"}.`
      );
    } catch (err) {
      if (!handleAuthError(err)) {
        triggerToast(err instanceof Error ? err.message : "Failed to toggle status.");
      }
    }
  };

  const handleDeleteTenant = async (id: number) => {
    const confirmMsg = isRtl
      ? "هل أنت متأكد من حذف هذا الاشتراك نهائياً؟ لا يمكن التراجع عن هذا الإجراء."
      : "Are you sure you want to permanently delete this subscription? This action cannot be undone.";

    if (!window.confirm(confirmMsg)) return;

    try {
      await apiDeleteTenant(id);
      setTenants(prev => prev.filter(t => t.id !== id));
      triggerToast(isRtl ? "تم حذف الاشتراك بنجاح" : "Subscription deleted successfully.");
    } catch (err) {
      if (!handleAuthError(err)) {
        triggerToast(err instanceof Error ? err.message : "Failed to delete subscription.");
      }
    }
  };

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const copyTenantSnippet = (text: string, type: "js" | "iframe") => {
    navigator.clipboard.writeText(text);
    setCopiedTenantSnippet(type);
    setTimeout(() => setCopiedTenantSnippet(null), 2000);
  };

  // ── Filters & Search ────────────────────────────────────────────────────

  const filteredTenants = tenants.filter(t => {
    const matchesQuery =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tenantKey.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPlan = selectedPlanFilter === "all" || t.plan === selectedPlanFilter;
    const matchesStatus = selectedStatusFilter === "all" || t.status === selectedStatusFilter;

    return matchesQuery && matchesPlan && matchesStatus;
  });

  const currentTenantScriptSnippet = currentTenant
    ? buildTenantScriptSnippet(currentOrigin, currentTenant.tenantKey)
    : "";
  const currentTenantIframeSnippet = currentTenant
    ? buildTenantIframeSnippet(currentOrigin, currentTenant.tenantKey)
    : "";

  if (isClient && needsKey) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4" dir={isRtl ? "rtl" : "ltr"}>
        <form
          onSubmit={handleSubmitKey}
          className="w-full max-w-sm rounded-2xl border border-border-custom bg-card p-6 shadow-lg space-y-4"
        >
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-lg font-bold text-foreground">
              {isRtl ? "دخول لوحة المشرف" : "Admin access"}
            </h2>
          </div>
          <p className="text-xs text-text-muted">
            {isRtl
              ? "أدخل مفتاح المشرف للوصول إلى لوحة التحكم."
              : "Enter the admin key to access the console."}
          </p>
          <input
            type="password"
            autoFocus
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder={isRtl ? "مفتاح المشرف" : "Admin key"}
            className="w-full rounded-xl border border-border-custom bg-background p-2.5 text-sm text-foreground placeholder-text-muted/50 focus:border-brand-500 focus:outline-none"
          />
          {keyError && <p className="text-xs font-semibold text-red-600 dark:text-red-400">{keyError}</p>}
          <button
            type="submit"
            className="w-full rounded-xl bg-accent hover:bg-accent-hover px-5 py-2 text-sm font-semibold text-white shadow-sm active:scale-[0.98] transition-all"
          >
            {isRtl ? "دخول" : "Unlock"}
          </button>
        </form>
      </div>
    );
  }

  if (!isClient || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 text-foreground" dir={isRtl ? "rtl" : "ltr"}>
      {toast && (
        <div className={`fixed top-4 ${isRtl ? "left-4" : "right-4"} z-50 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-md animate-bounce`}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {isRtl ? "لوحة المشرف العام (SuperAdmin)" : "SuperAdmin Tenancy Panel"}
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            {isRtl
              ? "إنشاء وإدارة اشتراكات المستأجرين (Tenants)، تعيين خطط التشغيل، وتوليد نصوص برمجية للربط."
              : "Provision and manage tenant accounts, assign pricing plan tiers, and check message quota usage."}
          </p>
        </div>
        <div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            variant="primary"
            className="flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>{isRtl ? "إضافة اشتراك جديد" : "Provision Tenant"}</span>
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Filters Row */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-4 rounded-xl border border-border-custom shadow-sm">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-text-muted" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full pl-9 pr-4 py-2 border border-border-custom bg-background rounded-xl text-sm text-foreground placeholder-text-muted/50 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Select dropdown filters */}
          <div className="flex gap-3 w-full md:w-auto">
            <select
              value={selectedPlanFilter}
              onChange={e => setSelectedPlanFilter(e.target.value)}
              className="bg-background border border-border-custom rounded-xl text-xs font-semibold text-foreground/80 px-3 py-2 focus:outline-none focus:border-brand-500"
            >
              <option value="all">{t("allPlans")}</option>
              <option value="pro">Pro Tier ($500)</option>
              <option value="ultra">Ultra Tier ($1500)</option>
              <option value="custom">Custom Tier ($3000)</option>
            </select>

            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="bg-background border border-border-custom rounded-xl text-xs font-semibold text-foreground/80 px-3 py-2 focus:outline-none focus:border-brand-500"
            >
              <option value="all">{t("filterStatus")}: {t("all")}</option>
              <option value="active">{t("active")}</option>
              <option value="inactive">{t("inactive")}</option>
            </select>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="rounded-xl border border-border-custom bg-card overflow-hidden shadow-sm">
          {filteredTenants.length === 0 ? (
            <div className="py-12 text-center">
              <AlertTriangle className="h-10 w-10 text-text-muted mx-auto mb-2" />
              <p className="text-sm font-semibold text-text-muted">{t("noTenants")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-foreground/80">
                <thead className="border-b border-border-custom bg-background text-xs font-semibold uppercase text-text-muted">
                  <tr>
                    <th className="px-6 py-3.5 text-right rtl:text-right">{t("tenantNameCol")}</th>
                    <th className="px-6 py-3.5">{t("tenantEmailCol")}</th>
                    <th className="px-6 py-3.5">{t("tenantPlanCol")}</th>
                    <th className="px-6 py-3.5">{t("tenantStatusCol")}</th>
                    <th className="px-6 py-3.5">{t("tenantUsageCol")}</th>
                    <th className="px-6 py-3.5 text-center">{t("tenantActionsCol")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom">
                  {filteredTenants.map(tenant => (
                    <tr key={tenant.id} className="hover:bg-foreground/5 transition-colors">
                      <td className="px-6 py-4 font-bold text-foreground text-right rtl:text-right">
                        <div>{tenant.name}</div>
                        <div className="mt-1 font-mono text-[10px] font-semibold text-text-muted">
                          {tenant.tenantKey}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">{tenant.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold uppercase border ${
                          tenant.plan === "custom"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            : tenant.plan === "ultra"
                            ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                        }`}>
                          {tenant.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold border ${
                          tenant.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                        }`}>
                          {tenant.status === "active" ? t("active") : t("inactive")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium text-text-muted">
                            <span>{tenant.usedMessages} / {tenant.limitMessages}</span>
                            <span>{Math.round((tenant.usedMessages / tenant.limitMessages) * 100)}%</span>
                          </div>
                          <div className="h-1.5 w-24 bg-background rounded-full overflow-hidden border border-border-custom">
                            <div
                              style={{ width: `${Math.min(100, (tenant.usedMessages / tenant.limitMessages) * 100)}%` }}
                              className={`h-full rounded-full ${
                                (tenant.usedMessages / tenant.limitMessages) > 0.8 ? "bg-red-500" : "bg-accent"
                              }`}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleToggleStatus(tenant.id)}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all border active:scale-95 cursor-pointer ${
                              tenant.status === "active"
                                ? "border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                : "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                            }`}
                          >
                            {tenant.status === "active" ? t("deactivateBtn") : t("activateBtn")}
                          </button>

                          <button
                            onClick={() => openEditModal(tenant)}
                            className="rounded-lg border border-border-custom bg-background p-1.5 text-text-muted hover:text-foreground hover:bg-foreground/5 transition-colors active:scale-95 cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteTenant(tenant.id)}
                            className="rounded-lg border border-red-500/10 bg-background p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors active:scale-95 cursor-pointer"
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

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border-custom bg-card p-6 shadow-lg animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-foreground mb-4">{t("createSubscription")}</h3>
            <form onSubmit={handleCreateSubscription} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">{t("tenantNameCol")}</label>
                  <input
                    type="text"
                    required
                    value={newTenantName}
                    onChange={e => setNewTenantName(e.target.value)}
                    className="w-full rounded-xl border border-border-custom bg-background p-2.5 text-sm text-foreground focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">{t("tenantEmailCol")}</label>
                  <input
                    type="email"
                    required
                    value={newTenantEmail}
                    onChange={e => setNewTenantEmail(e.target.value)}
                    className="w-full rounded-xl border border-border-custom bg-background p-2.5 text-sm text-foreground focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">{t("tenantPlanCol")}</label>
                  <select
                    value={newTenantPlan}
                    onChange={e => setNewTenantPlan(e.target.value as any)}
                    className="w-full rounded-xl border border-border-custom bg-background p-2.5 text-sm text-foreground focus:border-brand-500 focus:outline-none"
                  >
                    <option value="pro">Pro Tier ($500)</option>
                    <option value="ultra">Ultra Tier ($1500)</option>
                    <option value="custom">Custom Tier ($3000)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Message Limit</label>
                  <input
                    type="number"
                    required
                    value={newTenantLimit}
                    onChange={e => setNewTenantLimit(parseInt(e.target.value))}
                    className="w-full rounded-xl border border-border-custom bg-background p-2.5 text-sm text-foreground focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>{t("cancel")}</Button>
                <Button type="submit" variant="primary">{t("createBtn")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && currentTenant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-border-custom bg-card shadow-lg overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-200">
            {/* Left: Form */}
            <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-border-custom">
              <h3 className="text-xl font-bold text-foreground mb-6">Manage Subscription</h3>
              <form onSubmit={handleSaveEdit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">{t("tenantNameCol")}</label>
                  <input
                    type="text"
                    required
                    value={editTenantName}
                    onChange={e => setEditTenantName(e.target.value)}
                    className="w-full rounded-xl border border-border-custom bg-background p-2.5 text-sm text-foreground focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">{t("tenantEmailCol")}</label>
                  <input
                    type="email"
                    required
                    value={editTenantEmail}
                    onChange={e => setEditTenantEmail(e.target.value)}
                    className="w-full rounded-xl border border-border-custom bg-background p-2.5 text-sm text-foreground focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">{t("tenantPlanCol")}</label>
                    <select
                      value={editTenantPlan}
                      onChange={e => setEditTenantPlan(e.target.value as any)}
                      className="w-full rounded-xl border border-border-custom bg-background p-2.5 text-sm text-foreground focus:border-brand-500 focus:outline-none"
                    >
                      <option value="pro">Pro Tier ($500)</option>
                      <option value="ultra">Ultra Tier ($1500)</option>
                      <option value="custom">Custom Tier ($3000)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Limit</label>
                    <input
                      type="number"
                      required
                      value={editTenantLimit}
                      onChange={e => setEditTenantLimit(parseInt(e.target.value))}
                      className="w-full rounded-xl border border-border-custom bg-background p-2.5 text-sm text-foreground focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>{t("cancel")}</Button>
                  <Button type="submit" variant="primary">{t("saveBtn")}</Button>
                </div>
              </form>
            </div>

            {/* Right: Snippets */}
            <div className="w-full md:w-80 bg-background p-6 space-y-6">
              <div>
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4">Integration Code</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-text-muted flex items-center gap-1">
                        <Globe className="h-3 w-3" /> JS Snippet
                      </span>
                      <button
                        onClick={() => copyTenantSnippet(currentTenantScriptSnippet, "js")}
                        className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:text-brand-500 flex items-center gap-1"
                      >
                        {copiedTenantSnippet === "js" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedTenantSnippet === "js" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div className="bg-card border border-border-custom rounded-lg p-2 font-mono text-[10px] text-brand-700 dark:text-brand-300 break-all leading-relaxed">
                      {currentTenantScriptSnippet}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-text-muted flex items-center gap-1">
                        <Globe className="h-3 w-3" /> Iframe Embed
                      </span>
                      <button
                        onClick={() => copyTenantSnippet(currentTenantIframeSnippet, "iframe")}
                        className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:text-brand-500 flex items-center gap-1"
                      >
                        {copiedTenantSnippet === "iframe" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedTenantSnippet === "iframe" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div className="bg-card border border-border-custom rounded-lg p-2 font-mono text-[10px] text-brand-700 dark:text-brand-300 break-all leading-relaxed">
                      {currentTenantIframeSnippet}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border-custom">
                <p className="text-[10px] text-text-muted leading-relaxed italic">
                  * Use the JS snippet for a floating widget, or the iframe for a dedicated support page.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
