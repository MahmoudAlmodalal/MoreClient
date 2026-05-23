"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import {
  LayoutDashboard,
  FileText,
  MessageSquareShare,
  Settings as SettingsIcon,
  Eye,
  LogOut,
  Menu,
  X,
  Languages,
  Activity
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { language, setLanguage, t, isRtl, companyName, companyLogo } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navigation = [
    { name: t("dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { name: t("files"), href: "/dashboard/files", icon: FileText },
    { name: t("handoffs"), href: "/dashboard/handoffs", icon: MessageSquareShare },
    { name: t("settings"), href: "/dashboard/settings", icon: SettingsIcon },
    { name: t("widgetPreview"), href: "/widget", icon: Eye, target: "_blank" },
  ];

  const handleLanguageToggle = () => {
    setLanguage(language === "en" ? "ar" : "en");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050508]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#1f1f2e] bg-[#07070b]/80 px-4 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-gray-400 hover:text-gray-100 md:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={companyLogo}
              alt="Logo"
              className="h-9 w-9 rounded-xl object-cover border border-purple-500/30"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                {companyName}
                <span className="inline-flex items-center rounded-md bg-purple-500/10 px-1.5 py-0.5 text-xs font-medium text-purple-400 ring-1 ring-inset ring-purple-500/20">
                  {t("adminPanel")}
                </span>
              </h1>
              <p className="text-[10px] text-gray-500 hidden sm:block">
                {t("builtInGaza")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Language Switcher */}
          <button
            onClick={handleLanguageToggle}
            className="flex items-center gap-2 rounded-lg border border-[#1f1f2e] bg-[#0d0d15] px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-[#1a1a26] transition-colors"
          >
            <Languages className="h-4 w-4 text-purple-400" />
            <span>{language === "en" ? "العربية (AR)" : "English (EN)"}</span>
          </button>

          {/* Quick Status Light */}
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden xs:inline">{t("connected")}</span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 flex-col border-r border-[#1f1f2e] bg-[#07070b] p-4 md:flex">
          <nav className="flex-1 space-y-1.5">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  target={item.target}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/15"
                      : "text-gray-400 hover:bg-[#0d0d15] hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer Logo of Naseh */}
          <div className="mt-auto border-t border-[#1f1f2e] pt-4">
            <div className="flex items-center gap-2 px-2 text-xs text-gray-500">
              <Activity className="h-4 w-4 text-purple-500 animate-pulse" />
              <span>Naseh Support v1.0.0</span>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="relative z-50 md:hidden">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
            <div className={`fixed inset-y-0 ${isRtl ? "right-0" : "left-0"} z-50 w-full max-w-xs bg-[#07070b] p-6 shadow-xl`}>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-bold text-white">{t("adminPanel")}</h2>
                <button
                  type="button"
                  className="rounded-md p-1.5 text-gray-400 hover:bg-[#1a1a26] hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-6 w-6" />
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
                      target={item.target}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-all ${
                        isActive
                          ? "bg-purple-600 text-white"
                          : "text-gray-400 hover:bg-[#0d0d15]"
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="absolute bottom-6 left-6 right-6">
                <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/10">
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
