"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

interface NotificationItem {
  id: string;
  eventType: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

function createDemoNotifications(): NotificationItem[] {
  const now = Date.now();

  return [
    {
      id: "demo-1",
      eventType: "handoff.created",
      title: "New handoff needs review",
      body: "A WhatsApp conversation was escalated after a low-confidence answer.",
      linkUrl: "/dashboard/handoffs",
      readAt: null,
      createdAt: new Date(now - 6 * 60_000).toISOString(),
    },
    {
      id: "demo-2",
      eventType: "file.processed",
      title: "Knowledge file processed",
      body: "returns_policy_v2.txt is ready in the demo knowledge base.",
      linkUrl: "/dashboard/files",
      readAt: null,
      createdAt: new Date(now - 43 * 60_000).toISOString(),
    },
    {
      id: "demo-3",
      eventType: "settings.saved",
      title: "Widget settings saved",
      body: "Branding and bot tone changes are stored locally in this demo session.",
      linkUrl: "/dashboard/settings",
      readAt: new Date(now - 2 * 60 * 60_000).toISOString(),
      createdAt: new Date(now - 2 * 60 * 60_000).toISOString(),
    },
  ];
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function NotificationBell() {
  const { t, isRtl } = useLanguage();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>(createDemoNotifications);
  const containerRef = useRef<HTMLDivElement>(null);
  const unread = items.filter((item) => !item.readAt).length;

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markAllRead = () => {
    const readAt = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? readAt })));
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("notifications")}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#1f1f2e] bg-[#0d0d15] text-gray-300 transition-colors hover:bg-[#1a1a26]"
      >
        <Bell className="h-4 w-4 text-purple-400" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-600 px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute top-11 z-50 w-80 overflow-hidden rounded-xl border border-[#1f1f2e] bg-[#0a0a12] shadow-xl ${
            isRtl ? "left-0" : "right-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#1f1f2e] px-4 py-3">
            <span className="text-sm font-semibold text-white">{t("notifications")}</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-purple-400 hover:text-purple-300"
              >
                {t("markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">{t("noNotifications")}</p>
            ) : (
              items.map((n) => {
                const inner = (
                  <>
                    <div className="flex items-start gap-2">
                      {!n.readAt && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-500" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-100">{n.title}</p>
                        {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-gray-400">{n.body}</p>}
                        <p className="mt-1 text-[10px] text-gray-600">{relativeTime(n.createdAt)}</p>
                      </div>
                    </div>
                  </>
                );
                const cls = `block border-b border-[#15151f] px-4 py-3 transition-colors hover:bg-[#10101a] ${
                  n.readAt ? "" : "bg-purple-500/5"
                }`;
                return n.linkUrl ? (
                  <a key={n.id} href={n.linkUrl} className={cls}>
                    {inner}
                  </a>
                ) : (
                  <div key={n.id} className={cls}>
                    {inner}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
