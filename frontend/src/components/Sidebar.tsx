import { NavLink } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageProvider";
import type { Translations } from "../i18n/translations";

const NAV: { to: string; key: keyof Translations; icon: string }[] = [
  { to: "/dashboard", key: "dashboard", icon: "📊" },
  { to: "/files", key: "files", icon: "📁" },
  { to: "/handoffs", key: "handoffs", icon: "💬" },
  { to: "/settings", key: "settings", icon: "⚙️" },
];

export default function Sidebar() {
  const { t } = useLanguage();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-e border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="text-xl font-bold text-indigo-600">{t("appName")}</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`
            }
          >
            <span aria-hidden>{item.icon}</span>
            <span>{t(item.key)}</span>
          </NavLink>
        ))}
      </nav>
      <p className="px-5 py-4 text-xs text-slate-400">{t("builtInGaza")}</p>
    </aside>
  );
}
