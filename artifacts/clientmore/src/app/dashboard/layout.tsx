"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import Link from "@/lib/next-shim/link";
import { usePathname, useRouter } from "@/lib/next-shim/navigation";
import { useLanguage } from "@/components/language-provider";
import { useSessionRole } from "@/lib/use-session-role";
import { logout } from "@/lib/api";
import { NotificationBell } from "@/components/notification-bell";
import {
  LayoutDashboard,
  FileText,
  MessageSquareShare,
  Settings as SettingsIcon,
  CreditCard,
  LogOut,
  Menu,
  X,
  Languages,
  Sun,
  Moon,
  ShieldAlert,
} from "lucide-react";

/* Theme toggle — guarded against hydration mismatch with a mounted flag. */
function ThemeToggle({ label }: { label: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted-fg transition-colors hover:bg-muted hover:text-foreground"
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    language,
    setLanguage,
    t,
    isRtl,
    companyName,
    companyLogo,
    subscriptionPlan,
    usedMessages,
  } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = useSessionRole() === "admin";

  const navigation = [
    { name: t("dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { name: t("files"), href: "/dashboard/files", icon: FileText },
    { name: t("handoffs"), href: "/dashboard/handoffs", icon: MessageSquareShare },
    { name: t("billingNav"), href: "/dashboard/upgrade", icon: CreditCard },
    { name: t("settings"), href: "/dashboard/settings", icon: SettingsIcon },
    ...(isAdmin ? [{ name: t("superAdminTitle"), href: "/admin", icon: ShieldAlert }] : []),
  ];

  const messageLimit = subscriptionPlan === "ultra" ? 1500 : 500;
  const usagePct = Math.min(100, Math.round((usedMessages / messageLimit) * 100));

  // While the mobile drawer is open, close it on Escape and lock background
  // scroll so the page behind the overlay doesn't move under the user's finger.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileMenuOpen]);

  const handleLanguageToggle = () => setLanguage(language === "en" ? "ar" : "en");

  const handleLogout = () => {
    logout();
    router.push("/welcome");
  };

  /* Shared brand block (sidebar header + mobile drawer header). */
  const Brand = (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={companyLogo}
        alt=""
        className="h-10 w-10 rounded-xl border border-border object-cover"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{companyName}</p>
        <p className="truncate text-[11px] text-muted-fg">{t("builtInGaza")}</p>
      </div>
    </div>
  );

  /* Shared nav list. */
  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-fg hover:bg-muted hover:text-foreground"
            }`}
          >
            <span
              className={`absolute inset-y-1.5 start-0 w-1 rounded-full bg-primary transition-opacity ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden="true"
            />
            <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-primary" : ""}`} />
            <span className="truncate">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );

  /* Usage meter shown in the sidebar footer. */
  const UsagePanel = (
    <div className="rounded-xl border border-border bg-surface p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-fg">{t("billingNav")}</span>
        <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          {subscriptionPlan}
        </span>
      </div>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${
            usagePct >= 90 ? "bg-danger" : usagePct >= 75 ? "bg-warning" : "bg-primary"
          }`}
          style={{ width: `${usagePct}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-muted-fg">
        {t("usageRatio", { used: usedMessages, limit: messageLimit })}
      </p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-e border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">{Brand}</div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavList />
        </div>
        <div className="space-y-3 border-t border-sidebar-border p-3">
          {UsagePanel}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-fg transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span>{t("logout")}</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile drawer ───────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="relative z-50 md:hidden">
          <button
            type="button"
            aria-label={isRtl ? "إغلاق القائمة" : "Close menu"}
            className="fixed inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("adminPanel")}
            className="fixed inset-y-0 start-0 z-50 flex w-full max-w-xs flex-col border-e border-sidebar-border bg-sidebar shadow-2xl"
          >
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
              {Brand}
              <button
                type="button"
                aria-label={isRtl ? "إغلاق القائمة" : "Close menu"}
                className="rounded-lg p-1.5 text-muted-fg hover:bg-muted hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <NavList onNavigate={() => setMobileMenuOpen(false)} />
            </div>
            <div className="space-y-3 border-t border-sidebar-border p-3">
              {UsagePanel}
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-fg transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <LogOut className="h-[18px] w-[18px] shrink-0" />
                <span>{t("logout")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main column ─────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={isRtl ? "فتح القائمة" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              className="rounded-lg p-1.5 text-muted-fg hover:bg-muted hover:text-foreground md:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            {/* Brand repeats on mobile where the sidebar is hidden */}
            <div className="md:hidden">{Brand}</div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success ring-1 ring-inset ring-success/20 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              {t("connected")}
            </div>
            <ThemeToggle label={isRtl ? "تبديل السمة" : "Toggle theme"} />
            <button
              onClick={handleLanguageToggle}
              className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-muted-fg transition-colors hover:bg-muted hover:text-foreground"
            >
              <Languages className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">{language === "en" ? "العربية" : "English"}</span>
            </button>
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
