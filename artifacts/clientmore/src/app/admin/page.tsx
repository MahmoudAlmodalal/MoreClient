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
  setAdminKey,
  clearAdminKey,
  hasAdminKey,
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
      clearAdminKey();
      setNeedsKey(true);
      return true;
    }
    return false;
  }, []);

  const loadTenants = useCallback(async () => {
    try {
      const data = await fetchTenants({
        search: searchQuery,
        plan: selectedPlanFilter,
        status: selectedStatusFilter,
      });
      setTenants(data);
    } catch (err) {
      if (!handleAuthError(err)) console.error("Failed to load tenants", err);
    }
  }, [searchQuery, selectedPlanFilter, selectedStatusFilter, handleAuthError]);

  const loadAll = useCallback(async () => {
    // If we don't yet have an in-memory key, prompt for it instead of firing
    // off an admin request that's guaranteed to 401.
    if (!hasAdminKey()) {
      setNeedsKey(true);
      setLoading(false);
      return;
    }
    await loadTenants();
    setLoading(false);
  }, [loadTenants]);

  // Reload tenants when search or filter states change
  useAsyncOnMount(loadTenants, [loadTenants]);

  // Initial load
  useAsyncOnMount(async () => {
    await loadAll();
  }, [loadAll]);

  const handleSubmitKey = (e: React.FormEvent) => {
    e.preventDefault();
    const key = keyInput.trim();
    if (!key) {
      setKeyError(isRtl ? "مفتاح المشرف مطلوب" : "Admin key is required");
      return;
    }
    setAdminKey(key);
    setKeyInput("");
    setKeyError(null);
    setNeedsKey(false);
    setLoading(true);
    void loadAll();
  };

  // Show customized Toast notifications
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const copyTenantSnippet = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTenantSnippet(id);
    setTimeout(() => setCopiedTenantSnippet(null), 2000);
  };

  // ── CRUD Handlers ──────────────────────────────────────────────────────

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newTenantEmail) return;
    try {
      await createTenant({
        name: newTenantName,
        email: newTenantEmail,
        plan: newTenantPlan,
        limitMessages: newTenantLimit,
      });
      setIsCreateModalOpen(false);
      triggerToast(t("createSubscriptionSuccess"));
      setNewTenantName("");
      setNewTenantEmail("");
      setNewTenantPlan("pro");
      setNewTenantLimit(500);
      await loadTenants();
    } catch (err: unknown) {
      triggerToast(err instanceof Error ? err.message : "Failed to create tenant");
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      const updated = await toggleTenantStatus(id);
      triggerToast(
        updated.status === "inactive" ? t("deactivatedSuccess") : t("activatedSuccess")
      );
      await loadTenants();
    } catch (err: unknown) {
      triggerToast(err instanceof Error ? err.message : "Toggle failed");
    }
  };

  const openEditModal = (tenant: TenantOut) => {
    setCurrentTenant(tenant);
    setEditTenantName(tenant.name);
    setEditTenantEmail(tenant.email);
    setEditTenantPlan(tenant.plan);
    setEditTenantLimit(tenant.limitMessages);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;
    try {
      await updateTenant(currentTenant.id, {
        name: editTenantName,
        email: editTenantEmail,
        plan: editTenantPlan,
        limitMessages: editTenantLimit,
      });
      setIsEditModalOpen(false);
      triggerToast(t("saved"));
      await loadTenants();
    } catch (err: unknown) {
      triggerToast(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleDeleteTenant = async (id: number) => {
    if (!confirm("Are you sure you want to delete this subscription?")) return;
    try {
      await apiDeleteTenant(id);
      triggerToast("Subscription deleted.");
      await loadTenants();
    } catch (err: unknown) {
      triggerToast(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const filteredTenants = tenants;

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
          className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4"
        >
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">
              {isRtl ? "دخول لوحة المشرف" : "Admin access"}
            </h2>
          </div>
          <p className="text-xs text-muted-fg">
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
            className="w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-fg focus:border-primary focus:outline-none"
          />
          {keyError && <p className="text-xs font-semibold text-danger">{keyError}</p>}
          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-foreground hover:bg-primary shadow-md shadow-primary/20"
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
          } z-50 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-foreground shadow-lg animate-bounce`}
        >
          {toast}
        </div>
      )}

      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-card p-6 glow-purple">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {t("superAdminTitle")}
            </h2>
            <p className="mt-2 text-sm text-muted-fg max-w-2xl">
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

      <div className="space-y-6">
        {/* Filters Row */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-4 rounded-xl border border-border">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-fg" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full pl-9 pr-4 py-2 border border-border bg-background rounded-xl text-sm text-foreground placeholder:text-muted-fg focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Select dropdown filters */}
          <div className="flex gap-3 w-full md:w-auto">
            <select
              value={selectedPlanFilter}
              onChange={e => setSelectedPlanFilter(e.target.value)}
              className="bg-background border border-border rounded-xl text-xs font-semibold text-muted-fg px-3 py-2 focus:outline-none focus:border-primary"
            >
              <option value="all">{t("allPlans")}</option>
              <option value="pro">Pro Tier ($500)</option>
              <option value="ultra">Ultra Tier ($1500)</option>
              <option value="custom">Custom Tier ($3000)</option>
            </select>

            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="bg-background border border-border rounded-xl text-xs font-semibold text-muted-fg px-3 py-2 focus:outline-none focus:border-primary"
            >
              <option value="all">{t("filterStatus")}: {t("all")}</option>
              <option value="active">{t("active")}</option>
              <option value="inactive">{t("inactive")}</option>
            </select>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {filteredTenants.length === 0 ? (
            <div className="py-12 text-center">
              <AlertTriangle className="h-10 w-10 text-muted-fg mx-auto mb-2" />
              <p className="text-sm font-semibold text-muted-fg">{t("noTenants")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-muted-fg">
                <thead className="border-b border-border bg-background text-xs font-semibold uppercase text-muted-fg">
                  <tr>
                    <th className="px-6 py-3.5 text-right rtl:text-right">{t("tenantNameCol")}</th>
                    <th className="px-6 py-3.5">{t("tenantEmailCol")}</th>
                    <th className="px-6 py-3.5">{t("tenantPlanCol")}</th>
                    <th className="px-6 py-3.5">{t("tenantStatusCol")}</th>
                    <th className="px-6 py-3.5">{t("tenantUsageCol")}</th>
                    <th className="px-6 py-3.5 text-center">{t("tenantActionsCol")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTenants.map(tenant => (
                    <tr key={tenant.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-foreground text-right rtl:text-right">
                        <div>{tenant.name}</div>
                        <div className="mt-1 font-mono text-[10px] font-semibold text-muted-fg">
                          {tenant.tenantKey}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-muted-fg">
                        {tenant.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold uppercase ${
                          tenant.plan === "pro"
                            ? "bg-info/10 text-info ring-1 ring-inset ring-info/20"
                            : tenant.plan === "ultra"
                            ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20"
                            : "bg-warning/10 text-warning ring-1 ring-inset ring-warning/20"
                        }`}>
                          {tenant.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          tenant.status === "active"
                            ? "bg-success/10 text-success"
                            : "bg-danger/10 text-danger"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            tenant.status === "active" ? "bg-success animate-pulse" : "bg-danger"
                          }`} />
                          {tenant.status === "active" ? t("active") : t("inactive")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium text-muted-fg">
                            <span>{tenant.usedMessages} / {tenant.limitMessages}</span>
                            <span>{Math.round((tenant.usedMessages / tenant.limitMessages) * 100)}%</span>
                          </div>
                          <div className="h-1.5 w-24 bg-background rounded-full overflow-hidden border border-border">
                            <div
                              style={{ width: `${Math.min(100, (tenant.usedMessages / tenant.limitMessages) * 100)}%` }}
                              className={`h-full rounded-full ${
                                (tenant.usedMessages / tenant.limitMessages) > 0.8 ? "bg-danger" : "bg-primary"
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
                                ? "border-danger/20 bg-danger/5 text-danger hover:bg-danger/10"
                                : "border-success/20 bg-success/5 text-success hover:bg-success/10"
                            }`}
                          >
                            {tenant.status === "active" ? t("deactivateBtn") : t("activateBtn")}
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => openEditModal(tenant)}
                            className="rounded-lg border border-border bg-background p-1.5 text-muted-fg hover:text-foreground transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteTenant(tenant.id)}
                            className="rounded-lg border border-danger/10 bg-background p-1.5 text-danger hover:bg-danger/10 transition-colors"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-foreground mb-4">{t("createSubscription")}</h3>
            <form onSubmit={handleCreateSubscription} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-fg uppercase tracking-wider">{t("tenantNameCol")}</label>
                  <input
                    type="text"
                    required
                    value={newTenantName}
                    onChange={e => setNewTenantName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-fg uppercase tracking-wider">{t("tenantEmailCol")}</label>
                  <input
                    type="email"
                    required
                    value={newTenantEmail}
                    onChange={e => setNewTenantEmail(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-fg uppercase tracking-wider">{t("tenantPlanCol")}</label>
                  <select
                    value={newTenantPlan}
                    onChange={e => setNewTenantPlan(e.target.value as any)}
                    className="w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="pro">Pro Tier ($500)</option>
                    <option value="ultra">Ultra Tier ($1500)</option>
                    <option value="custom">Custom Tier ($3000)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-fg uppercase tracking-wider">Message Limit</label>
                  <input
                    type="number"
                    required
                    value={newTenantLimit}
                    onChange={e => setNewTenantLimit(parseInt(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col md:flex-row">
            {/* Left: Form */}
            <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-border">
              <h3 className="text-xl font-bold text-foreground mb-6">Manage Subscription</h3>
              <form onSubmit={handleSaveEdit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-fg uppercase tracking-wider">{t("tenantNameCol")}</label>
                  <input
                    type="text"
                    required
                    value={editTenantName}
                    onChange={e => setEditTenantName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-fg uppercase tracking-wider">{t("tenantEmailCol")}</label>
                  <input
                    type="email"
                    required
                    value={editTenantEmail}
                    onChange={e => setEditTenantEmail(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-fg uppercase tracking-wider">{t("tenantPlanCol")}</label>
                    <select
                      value={editTenantPlan}
                      onChange={e => setEditTenantPlan(e.target.value as any)}
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="pro">Pro Tier ($500)</option>
                      <option value="ultra">Ultra Tier ($1500)</option>
                      <option value="custom">Custom Tier ($3000)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-fg uppercase tracking-wider">Limit</label>
                    <input
                      type="number"
                      required
                      value={editTenantLimit}
                      onChange={e => setEditTenantLimit(parseInt(e.target.value))}
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
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
                <h4 className="text-xs font-bold text-muted-fg uppercase tracking-widest mb-4">Integration Code</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-fg flex items-center gap-1">
                        <Globe className="h-3 w-3" /> JS Snippet
                      </span>
                      <button
                        onClick={() => copyTenantSnippet(currentTenantScriptSnippet, "js")}
                        className="text-[10px] font-bold text-primary hover:text-primary-hover flex items-center gap-1"
                      >
                        {copiedTenantSnippet === "js" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedTenantSnippet === "js" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-2 font-mono text-[10px] text-muted-fg break-all leading-relaxed">
                      {currentTenantScriptSnippet}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-fg flex items-center gap-1">
                        <Globe className="h-3 w-3" /> Iframe Embed
                      </span>
                      <button
                        onClick={() => copyTenantSnippet(currentTenantIframeSnippet, "iframe")}
                        className="text-[10px] font-bold text-primary hover:text-primary-hover flex items-center gap-1"
                      >
                        {copiedTenantSnippet === "iframe" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedTenantSnippet === "iframe" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-2 font-mono text-[10px] text-muted-fg break-all leading-relaxed">
                      {currentTenantIframeSnippet}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <p className="text-[10px] text-muted-fg leading-relaxed italic">
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
