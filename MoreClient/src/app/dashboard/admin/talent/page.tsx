"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Search, X, BadgeCheck } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  apiGet,
  apiSend,
  ApiError,
  type AdminTalent,
  type TalentListResponse,
} from "../_components/api";

const statusTone: Record<AdminTalent["status"], "brand" | "neutral" | "solid"> = {
  active: "brand",
  suspended: "neutral",
  banned: "neutral",
  paused: "neutral",
};

export default function AdminTalentPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<AdminTalent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(
    async (opts: { reset?: boolean; nextCursor?: string | null; q?: string } = {}) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (opts.q) params.set("q", opts.q);
        if (opts.nextCursor) params.set("cursor", opts.nextCursor);
        const data = await apiGet<TalentListResponse>(
          `/api/v1/admin/talent?${params.toString()}`,
        );
        setItems((prev) => (opts.reset ? data.items : [...prev, ...data.items]));
        setHasMore(data.hasMore);
        setCursor(data.nextCursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load({ reset: true });
  }, [load]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void load({ reset: true, q: search.trim() || undefined });
  };

  const onDelete = async (id: string) => {
    if (!window.confirm(t("confirmDeleteTalent"))) return;
    setDeletingId(id);
    try {
      await apiSend(`/api/v1/admin/talent/${id}`, "DELETE");
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">{t("adminTalentTitle")}</h1>
          <p className="text-sm text-gray-500">{t("adminTalentSub")}</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          {t("createTalent")}
        </Button>
      </div>

      <form onSubmit={onSearch} className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchTalent")}
            className="w-full rounded-xl border border-[#1f1f2e] bg-[#0d0d15] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-gray-600 focus:border-purple-500/50 focus:outline-none"
          />
        </div>
        <Button variant="outline" size="sm" type="submit">
          {t("adminTalent")}
        </Button>
      </form>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Card tone="dark" className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1f1f2e] text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3 font-medium">{t("displayName")}</th>
              <th className="px-4 py-3 font-medium">{t("handle")}</th>
              <th className="px-4 py-3 font-medium">{t("country")}</th>
              <th className="px-4 py-3 font-medium">{t("status")}</th>
              <th className="px-4 py-3 font-medium">{t("verification")}</th>
              <th className="px-4 py-3 font-medium">{t("plan")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("action")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((talent) => (
              <tr key={talent.id} className="border-b border-[#1f1f2e]/60 hover:bg-[#0d0d15]">
                <td className="px-4 py-3 font-medium text-white">{talent.displayName}</td>
                <td className="px-4 py-3 text-gray-400">@{talent.handle}</td>
                <td className="px-4 py-3 text-gray-400">{talent.country}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone[talent.status]}>{talent.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    {talent.verificationStatus === "verified" && (
                      <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                    {talent.verificationStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">{talent.planCode}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onDelete(talent.id)}
                    disabled={deletingId === talent.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deletingId === talent.id ? t("deleting") : t("deleteTalent")}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                  {t("noTalentFound")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="flex items-center justify-center">
        {loading && <p className="text-sm text-gray-500">{t("loading")}</p>}
        {!loading && hasMore && (
          <Button variant="outline" size="sm" onClick={() => void load({ nextCursor: cursor, q: search.trim() || undefined })}>
            {t("loadMore")}
          </Button>
        )}
      </div>

      {showCreate && (
        <CreateTalentModal
          onClose={() => setShowCreate(false)}
          onCreated={(talent) => {
            setItems((prev) => [talent, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

function CreateTalentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (talent: AdminTalent) => void;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ displayName: "", handle: "", country: "", headline: "", locale: "en" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        displayName: form.displayName.trim(),
        handle: form.handle.trim().toLowerCase(),
        country: form.country.trim().toUpperCase(),
        headline: form.headline.trim() || undefined,
        locale: form.locale,
      };
      const created = await apiSend<AdminTalent>("/api/v1/admin/talent", "POST", payload);
      // The create endpoint returns the bare Talent; normalize counts for the list row.
      onCreated({ ...created, _count: { proposals: 0, contracts: 0 } } as AdminTalent);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const field = "w-full rounded-xl border border-[#1f1f2e] bg-[#0d0d15] px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-purple-500/50 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <Card tone="dark" className="relative z-10 w-full max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{t("createTalent")}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">{t("displayName")}</label>
            <input required minLength={2} maxLength={100} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className={field} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">{t("handle")}</label>
            <input required value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="jane-doe" className={field} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">{t("country")}</label>
              <input required maxLength={2} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="US" className={field} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">{t("language")}</label>
              <select value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value })} className={field}>
                <option value="en">EN</option>
                <option value="ar">AR</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">{t("headline")}</label>
            <input maxLength={200} value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} className={field} />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={submitting}>
              {submitting ? t("creating") : t("create")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
