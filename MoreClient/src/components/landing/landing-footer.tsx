"use client";

import { Mail, Phone, MapPin } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useTheme } from "@/components/theme-provider";

function FooterLogo() {
  return (
    <div className="flex items-center gap-2 select-none">
      <div className="relative w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7B61FF] to-[#00FFCC] p-[1.5px] flex items-center justify-center shadow-[0_0_15px_rgba(123,97,255,0.25)]">
        <div className="w-full h-full bg-[#101020] rounded-[7px] flex items-center justify-center">
          <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 17V8L12 14L20 8V17" stroke="url(#logoGradFooter)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="logoGradFooter" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7B61FF" />
                <stop offset="100%" stopColor="#00FFCC" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      <span className="font-outfit text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center">
        MORE<span className="text-[#00FFCC] ml-1 font-medium text-xs tracking-wider bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20">Response</span>
      </span>
    </div>
  );
}

export function LandingFooter() {
  const { language } = useLanguage();

  return (
    <footer className="border-t border-white/5 bg-[#0f0f26]/40 py-14 text-start">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr] pb-10 border-b border-white/5">
          {/* Logo / Description */}
          <div className="space-y-4">
            <FooterLogo />
            <p className="max-w-xs text-xs sm:text-sm leading-relaxed text-text-muted">
              {language === "ar"
                ? "المنصة الأولى لأتمتة خدمة وخطوط اتصالات العملاء للشركات والمؤسسات بذكاء مدمج وتكامل سحابي متفوق."
                : "The leading platform for automating customer service and communication lines for businesses and institutions with integrated intelligence and superior cloud integration."}
            </p>
          </div>

          {/* Col 1: Quick Links */}
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider">
              {language === "ar" ? "الروابط السريعة" : "Quick Links"}
            </h4>
            <ul className="mt-4 space-y-2.5">
              {[
                { href: "#hero", label: language === "ar" ? "الرئيسية" : "Home" },
                { href: "#features", label: language === "ar" ? "المميزات" : "Features" },
                { href: "#showcase", label: language === "ar" ? "المنصة" : "Showcase" },
                { href: "#pricing", label: language === "ar" ? "خطط الأسعار" : "Pricing Plans" },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-xs sm:text-sm text-text-muted hover:text-[#00FFCC] transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 2: Support & Help */}
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider">
              {language === "ar" ? "الدعم والمساعدة" : "Support & Help"}
            </h4>
            <ul className="mt-4 space-y-2.5">
              {[
                { href: "#faq", label: language === "ar" ? "الأسئلة الشائعة" : "FAQs" },
                { href: "#", label: language === "ar" ? "توثيقات الـ API" : "API Docs" },
                { href: "#", label: language === "ar" ? "مركز المساعدة" : "Help Center" },
                { href: "#", label: language === "ar" ? "حالة النظام" : "System Status" },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-xs sm:text-sm text-text-muted hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Contact info */}
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider">
              {language === "ar" ? "تواصل معنا" : "Contact Us"}
            </h4>
            <ul className="mt-4 space-y-3.5">
              <li className="flex items-center gap-2.5 text-xs sm:text-sm text-text-muted">
                <Mail size={14} className="text-brand-600 dark:text-brand-400 shrink-0" />
                <a href="mailto:support@moreresponse.com" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  support@moreresponse.com
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-xs sm:text-sm text-text-muted">
                <Phone size={14} className="text-brand-600 dark:text-brand-400 shrink-0" />
                <a href="tel:+962790000000" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  +962 7 9000 0000
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-xs sm:text-sm text-text-muted">
                <MapPin size={14} className="text-brand-600 dark:text-brand-400 shrink-0" />
                <span>
                  {language === "ar" ? "المنامة، مملكة البحرين" : "Manama, Kingdom of Bahrain"}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-text-muted">
          <span>
            {language === "ar"
              ? "حقوق الطبع والنشر © 2026 منصة More Response. جميع الحقوق محفوظة."
              : "Copyright © 2026 More Response. All rights reserved."}
          </span>
          <div className="flex gap-5">
            <a href="#" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              {language === "ar" ? "شروط الخدمة" : "Terms of Service"}
            </a>
            <a href="#" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              {language === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
