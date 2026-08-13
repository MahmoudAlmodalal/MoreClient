"use client";

import React, { useCallback, useState } from "react";
import { MapPin, PackageCheck, RefreshCw, ShoppingBag } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useAsyncOnMount } from "@/lib/use-async-effect";
import {
  ApiError,
  fetchPurchases,
  updatePurchaseStatus,
  type PurchaseOrderOut,
} from "@/lib/api";

const STATUS_OPTIONS = ["all", "pending", "confirmed", "forwarded", "completed", "cancelled"] as const;
type PurchaseStatus = (typeof STATUS_OPTIONS)[number];

function formatOrderDate(value: string, language: string): string {
  try {
    return new Intl.DateTimeFormat(language === "ar" ? "ar" : "en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusLabel(status: string, isRtl: boolean): string {
  const labels: Record<string, [string, string]> = {
    pending: ["Pending", "قيد الانتظار"],
    confirmed: ["Confirmed", "مؤكد"],
    forwarded: ["Forwarded", "محوّل للدعم"],
    completed: ["Completed", "مكتمل"],
    cancelled: ["Cancelled", "ملغى"],
  };
  return labels[status]?.[isRtl ? 1 : 0] ?? status;
}

function statusClass(status: string): string {
  if (status === "completed") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "cancelled") return "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300";
  if (status === "confirmed" || status === "forwarded") return "border-brand-500/20 bg-brand-500/10 text-brand-700 dark:text-brand-300";
  return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

export default function PurchasesPage() {
  const { language, isRtl } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus>("all");
  const [orders, setOrders] = useState<PurchaseOrderOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = {
    title: isRtl ? "طلبات الشراء" : "Purchase Orders",
    subtitle: isRtl
      ? "تابع الطلبات التي جمعها المساعد، حدّث حالتها، وراجع بيانات العميل قبل التنفيذ."
      : "Track orders collected by the assistant, update their status, and review customer details before fulfillment.",
    refresh: isRtl ? "تحديث" : "Refresh",
    filter: isRtl ? "تصفية الحالة" : "Filter status",
    all: isRtl ? "كل الطلبات" : "All orders",
    noOrders: isRtl ? "لا توجد طلبات في هذه الحالة." : "No orders found for this status.",
    product: isRtl ? "المنتج" : "Product",
    customer: isRtl ? "العميل" : "Customer",
    delivery: isRtl ? "التوصيل" : "Delivery",
    status: isRtl ? "الحالة" : "Status",
    created: isRtl ? "تاريخ الطلب" : "Created",
    quantity: isRtl ? "الكمية" : "Quantity",
    unknownCustomer: isRtl ? "عميل غير معروف" : "Unknown customer",
    noAddress: isRtl ? "لم يُجمع العنوان بعد" : "Address not collected yet",
    updateFailed: isRtl ? "تعذر تحديث حالة الطلب." : "Could not update order status.",
    loadFailed: isRtl ? "تعذر تحميل الطلبات." : "Could not load purchase orders.",
  };

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await fetchPurchases(statusFilter));
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError(copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [copy.loadFailed, statusFilter]);

  useAsyncOnMount(loadOrders, [loadOrders]);

  const handleStatusChange = async (orderId: number, status: string) => {
    setUpdatingId(orderId);
    try {
      const updated = await updatePurchaseStatus(orderId, status);
      setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : copy.updateFailed);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 text-foreground" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-brand-600 dark:text-brand-400">
            <ShoppingBag className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.18em]">clientMORE Commerce</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{copy.title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">{copy.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadOrders()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-custom bg-card px-3 py-2 text-sm font-semibold hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {copy.refresh}
        </button>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => void loadOrders()} className="font-semibold underline underline-offset-4">
            {copy.refresh}
          </button>
        </div>
      )}

      <section className="rounded-xl border border-border-custom bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <PackageCheck className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <span>{copy.filter}</span>
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as PurchaseStatus)}
            className="rounded-lg border border-border-custom bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? copy.all : statusLabel(status, isRtl)}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border-custom bg-card shadow-sm">
        {loading ? (
          <div className="flex min-h-56 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-brand-600 dark:text-brand-400" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-2 px-6 text-center">
            <ShoppingBag className="h-9 w-9 text-text-muted" />
            <p className="text-sm font-semibold text-text-muted">{copy.noOrders}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-border-custom bg-background text-xs font-semibold text-text-muted">
                <tr>
                  <th className="px-5 py-3 text-start">#{isRtl ? "الطلب" : "Order"}</th>
                  <th className="px-5 py-3 text-start">{copy.product}</th>
                  <th className="px-5 py-3 text-start">{copy.customer}</th>
                  <th className="px-5 py-3 text-start">{copy.delivery}</th>
                  <th className="px-5 py-3 text-start">{copy.status}</th>
                  <th className="px-5 py-3 text-start">{copy.created}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom">
                {orders.map((order) => (
                  <tr key={order.id} className="align-top transition-colors hover:bg-foreground/5">
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-text-muted">#{order.id}</td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-foreground">{order.productName || (isRtl ? "منتج غير محدد" : "Unnamed product")}</p>
                      <p className="mt-1 text-xs text-text-muted">{copy.quantity}: {order.quantity ?? "—"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-foreground">{order.customerRef || copy.unknownCustomer}</p>
                      <p className="mt-1 text-xs text-text-muted">Conversation #{order.conversationId}</p>
                    </td>
                    <td className="max-w-[230px] px-5 py-4">
                      <p className="flex items-start gap-1.5 text-xs text-text-muted">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{order.deliveryAddress || copy.noAddress}</span>
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={order.status}
                        disabled={updatingId === order.id}
                        onChange={(event) => void handleStatusChange(order.id, event.target.value)}
                        className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold outline-none disabled:opacity-60 ${statusClass(order.status)}`}
                      >
                        {STATUS_OPTIONS.filter((status) => status !== "all").map((status) => (
                          <option key={status} value={status}>{statusLabel(status, isRtl)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-text-muted">
                      {formatOrderDate(order.createdAt, language)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
