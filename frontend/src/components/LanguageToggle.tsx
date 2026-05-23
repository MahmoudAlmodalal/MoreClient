import { useLanguage } from "../i18n/LanguageProvider";

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 text-sm font-medium">
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={
          language === "en"
            ? "bg-indigo-600 px-3 py-1.5 text-white"
            : "bg-white px-3 py-1.5 text-slate-600 hover:bg-slate-50"
        }
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage("ar")}
        className={
          language === "ar"
            ? "bg-indigo-600 px-3 py-1.5 text-white"
            : "bg-white px-3 py-1.5 text-slate-600 hover:bg-slate-50"
        }
      >
        ع
      </button>
    </div>
  );
}
