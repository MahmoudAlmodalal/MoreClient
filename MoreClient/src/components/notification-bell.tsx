"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { apiGet, createWebSocketUrl, createAuthenticatedWebSocketUrl, type HandoffOut, type DashboardSocketMessage } from "@/lib/api";
import { useAsyncOnMount } from "@/lib/use-async-effect";

interface NotificationItem {
  id: string;           // "handoff-{id}"
  handoffId: number;    // numeric id for unread tracking
  eventType: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

const LAST_SEEN_KEY = "bellLastSeenHandoffId";

function getLastSeenId(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(window.localStorage.getItem(LAST_SEEN_KEY) ?? "0", 10) || 0;
}

function setLastSeenId(id: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_SEEN_KEY, String(id));
}

function handoffToNotification(
  h: HandoffOut,
  t: (key: string) => string,
): NotificationItem {
  const reasonKey: Record<string, string> = {
    low_confidence: "handoffNotificationLowConfidence",
    complaint: "handoffNotificationComplaint",
    support_request: "handoffNotificationSupportRequest",
    unsafe_or_unanswered: "handoffNotificationUnsafe",
  };
  const titleKey = reasonKey[h.reason] ?? "handoffNotificationLowConfidence";
  const lastSeenId = getLastSeenId();
  return {
    id: `handoff-${h.id}`,
    handoffId: h.id,
    eventType: "handoff.created",
    title: t(titleKey),
    body: h.messages.find((m) => m.role === "user")?.content ?? null,
    linkUrl: "/dashboard/handoffs",
    readAt: h.id <= lastSeenId ? new Date().toISOString() : null,
    createdAt: h.createdAt ?? new Date().toISOString(),
  };
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
  const [items, setItems] = useState<NotificationItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Unread = handoff id is above the last-seen watermark.
  const unread = items.filter((item) => !item.readAt).length;

  // Seed on mount from /api/handoffs (pending handoffs, newest first).
  const loadHandoffs = useCallback(async () => {
    try {
      const handoffs = await apiGet<HandoffOut[]>("/api/handoffs");
      setItems(
        handoffs.map((h) => handoffToNotification(h, t)).reverse()
      );
    } catch {
      /* network error — bell stays empty, no crash */
    }
  }, [t]);

  useAsyncOnMount(loadHandoffs, [loadHandoffs]);

  // Live updates via the shared /ws/dashboard socket.
  useEffect(() => {
    let ws: WebSocket | null = null;
    let stopped = false;

    const connect = () => {
      ws = new WebSocket(createAuthenticatedWebSocketUrl("/ws/dashboard"));

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as DashboardSocketMessage;
          if (msg.type !== "handoff.created") return;
          const { id, conversationId: _cid, channel: _ch, reason, question, createdAt } = msg.data;
          void _cid; void _ch;
          const lastSeenId = getLastSeenId();
          const newItem: NotificationItem = {
            id: `handoff-${id}`,
            handoffId: id,
            eventType: "handoff.created",
            title: t(
              ({
                low_confidence: "handoffNotificationLowConfidence",
                complaint: "handoffNotificationComplaint",
                support_request: "handoffNotificationSupportRequest",
                unsafe_or_unanswered: "handoffNotificationUnsafe",
              } as Record<string, string>)[reason] ?? "handoffNotificationLowConfidence"
            ),
            body: question || null,
            linkUrl: "/dashboard/handoffs",
            readAt: id <= lastSeenId ? new Date().toISOString() : null,
            createdAt: createdAt ?? new Date().toISOString(),
          };
          setItems((prev) => {
            // De-dup: skip if we already have this handoff id.
            if (prev.some((n) => n.handoffId === id)) return prev;
            return [newItem, ...prev];
          });
        } catch {
          /* ignore malformed frames */
        }
      };

      ws.onclose = () => {
        if (stopped) return;
        // Reconnect with a 3s delay on unexpected close.
        setTimeout(connect, 3000);
      };

      ws.onerror = () => ws?.close();
    };

    connect();
    return () => {
      stopped = true;
      ws?.close();
    };
  }, [t]);

  // Close dropdown on outside click.
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
    const maxId = items.reduce((m, n) => Math.max(m, n.handoffId), 0);
    if (maxId > 0) setLastSeenId(maxId);
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
