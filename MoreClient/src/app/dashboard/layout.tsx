"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { useTheme } from "@/components/theme-provider";
import { useSessionRole } from "@/lib/use-session-role";
import { JWT_TOKEN_STORAGE, logout, restoreAuthSession } from "@/lib/api";
import { NotificationBell } from "@/components/notification-bell";
import {
  LayoutDashboard,
  FileText,
  MessageSquareShare,
  Settings as SettingsIcon,
  CreditCard,
  ShoppingBag,
  LogOut,
  Menu,
  X,
  Languages,
  Activity,
  ShieldAlert,
  Sun,
  Moon
} from "lucide-react";

const AUTH_SESSION_PENDING = "__auth_session_pending__";

const subscribeAuthSession = (onStoreChange: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
};
const getClientAuthToken = () =>
  typeof window === "undefined" ? null : window.localStorage.getItem(JWT_TOKEN_STORAGE);
const getServerAuthToken = () => AUTH_SESSION_PENDING;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { language, setLanguage, t, isRtl, companyName, companyLogo } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const authToken = useSyncExternalStore(
    subscribeAuthSession,
    getClientAuthToken,
    getServerAuthToken,
  );
  const isAdmin = useSessionRole() === "admin";

  useEffect(() => {
    if (authToken === null) router.replace("/welcome");
  }, [authToken, router]);

  useEffect(() => {
    if (!authToken || authToken === AUTH_SESSION_PENDING) return;
    void restoreAuthSession().catch(() => {
      logout();
      router.replace("/welcome");
    });
  }, [authToken, router]);

  const navigation = [
    { name: t("dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { name: t("files"), href: "/dashboard/files", icon: FileText },
    { name: t("handoffs"), href: "/dashboard/handoffs", icon: MessageSquareShare },
    { name: language === "ar" ? "الطلبات" : "Orders", href: "/dashboard/purchases", icon: ShoppingBag },
    { name: t("billingNav"), href: "/dashboard/upgrade", icon: CreditCard },
    { name: t("settings"), href: "/dashboard/settings", icon: SettingsIcon },
    ...(isAdmin ? [{ name: t("superAdminTitle"), href: "/admin", icon: ShieldAlert }] : []),
  ];

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

  const handleLanguageToggle = () => {
    setLanguage(language === "en" ? "ar" : "en");
  };

  const handleLogout = () => {
    logout();
    router.push("/welcome");
  };

  if (!authToken || authToken === AUTH_SESSION_PENDING) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground" aria-live="polite">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-label="Redirecting to sign in" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border-custom bg-card/80 px-4 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={isRtl ? "فتح القائمة" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            className="text-text-muted hover:text-foreground md:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
          
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={companyLogo}
              alt="Logo"
              className="h-9 w-9 rounded-xl object-cover border border-brand-500/30"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-1.5">
                {companyName}
                <span className="inline-flex items-center rounded-md bg-brand-500/10 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold text-brand-600 dark:text-brand-400 border border-brand-500/20">
                  {t("adminPanel")}
                </span>
              </h1>
              <p className="text-[10px] text-text-muted hidden sm:block">
                {t("builtInGaza")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center h-9 w-9 rounded-lg border border-border-custom bg-card text-foreground/80 hover:bg-foreground/5 transition-all"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Language Switcher */}
          <button
            onClick={handleLanguageToggle}
            className="flex items-center gap-2 rounded-lg border border-border-custom bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-foreground/5 transition-colors"
          >
            <Languages className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <span className="hidden sm:inline">{language === "en" ? "العربية (AR)" : "English (EN)"}</span>
            <span className="sm:hidden">{language === "en" ? "AR" : "EN"}</span>
          </button>

          {/* Notification Bell */}
          <NotificationBell />

          {/* Quick Status Light */}
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden xs:inline">{t("connected")}</span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 flex-col border-r border-border-custom bg-card p-4 md:flex">
          <nav className="flex-1 space-y-1.5">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 active:scale-98 ${
                    isActive
                      ? "bg-accent text-white shadow-sm"
                      : "text-text-muted hover:bg-foreground/5 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout & Footer */}
          <div className="mt-auto border-t border-border-custom pt-4 space-y-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-500/10 hover:text-red-700 transition-all duration-200 active:scale-98"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>{t("logout")}</span>
            </button>
            <div className="flex items-center gap-2 px-2 text-xs text-text-muted">
              <Activity className="h-4 w-4 text-brand-600 dark:text-brand-400 animate-pulse" />
              <span>clientMORE v1.0.0</span>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="relative z-50 md:hidden">
            <button
              type="button"
              aria-label={isRtl ? "إغلاق القائمة" : "Close menu"}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t("adminPanel")}
              className={`fixed inset-y-0 ${isRtl ? "right-0" : "left-0"} z-50 w-full max-w-xs bg-card p-6 border-r border-border-custom shadow-lg`}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-bold text-foreground">{t("adminPanel")}</h2>
                <button
                  type="button"
                  aria-label={isRtl ? "إغلاق القائمة" : "Close menu"}
                  className="rounded-md p-1.5 text-text-muted hover:bg-foreground/5 hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              <nav className="space-y-2">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-all active:scale-98 ${
                        isActive
                          ? "bg-accent text-white"
                          : "text-text-muted hover:bg-foreground/5"
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="absolute bottom-6 left-6 right-6">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 py-3 text-sm font-semibold text-red-500 hover:bg-red-500/10 active:scale-98"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t("logout")}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Content Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
