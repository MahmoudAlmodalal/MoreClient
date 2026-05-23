import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import {
  translationsEn,
  translationsAr,
  type Language,
  type Translations,
} from "./translations";

const STORAGE_KEY = "lang";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations, variables?: Record<string, string | number>) => string;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function initialLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "ar" ? "ar" : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const isRtl = language === "ar";

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    window.localStorage.setItem(STORAGE_KEY, lang);
  };

  // Apply direction + lang to <html> so Tailwind's rtl:/ltr: variants and the
  // browser's logical-property layout follow the active language.
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("dir", isRtl ? "rtl" : "ltr");
    html.setAttribute("lang", language);
    html.classList.toggle("rtl", isRtl);
    html.classList.toggle("ltr", !isRtl);
  }, [isRtl, language]);

  const t = (
    key: keyof Translations,
    variables?: Record<string, string | number>,
  ): string => {
    const dict = language === "ar" ? translationsAr : translationsEn;
    let translation = dict[key] || translationsEn[key] || String(key);
    if (variables) {
      for (const [k, v] of Object.entries(variables)) {
        translation = translation.replace(`{${k}}`, String(v));
      }
    }
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
