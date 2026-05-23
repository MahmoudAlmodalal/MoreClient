"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Activity, CreditCard } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export function AdminNav() {
  const { t } = useLanguage();
  const pathname = usePathname();

  const tabs = [
    { name: t("adminTalent"), href: "/dashboard/admin/talent", icon: Users },
    { name: t("adminMonitoring"), href: "/dashboard/admin/monitoring", icon: Activity },
    { name: t("adminBilling"), href: "/dashboard/admin/billing", icon: CreditCard },
  ];

  return (
    <nav className="flex flex-wrap gap-2 border-b border-[#1f1f2e] pb-3">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              isActive
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/15"
                : "text-gray-400 hover:bg-[#0d0d15] hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{tab.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
