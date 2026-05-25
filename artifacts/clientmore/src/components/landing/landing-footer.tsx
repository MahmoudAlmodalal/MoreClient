"use client";

import { Mail, Phone, MapPin } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

function FooterLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 60" className="h-[46px] w-[84px] select-none">
      <defs>
        <linearGradient id="logoGradFooter" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <text x="55" y="16" textAnchor="middle" fontFamily="'Inter', sans-serif" fontWeight="300" fontSize="11" fill="#9ca3af" letterSpacing="3" style={{ textTransform: "lowercase" }}>response</text>
      <g transform="translate(16, 22)">
        <text x="0" y="24" fontFamily="'Outfit', sans-serif" fontWeight="800" fontSize="26" fill="url(#logoGradFooter)">M</text>
        <g transform="translate(23, 5)">
          <circle cx="10" cy="10" r="10" fill="url(#logoGradFooter)" />
          <path d="M 6 8 A 1.8 1.8 0 0 1 9 8" fill="none" stroke="#07070b" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 11 8 A 1.8 1.8 0 0 1 14 8" fill="none" stroke="#07070b" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 6 12 A 4 4 0 0 0 14 12" fill="none" stroke="#07070b" strokeWidth="2.0" strokeLinecap="round" />
        </g>
        <text x="47" y="24" fontFamily="'Outfit', sans-serif" fontWeight="800" fontSize="26" fill="url(#logoGradFooter)" letterSpacing="1">RE</text>
      </g>
    </svg>
  );
}

export function LandingFooter() {
  const { language } = useLanguage();

  return (
    <footer className="border-t border-white/5 bg-[#07070b] py-14 text-start">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr] pb-10 border-b border-white/5">
          {/* Logo / Description */}
          <div className="space-y-4">
            <FooterLogo />
            <p className="max-w-xs text-xs sm:text-sm leading-relaxed text-gray-500">
              {language === "ar"
                ? "المنصة الأولى لأتمتة خدمة وخطوط اتصالات العملاء للشركات والمؤسسات بذكاء مدمج وتكامل سحابي متفوق."
                : "The leading platform for automating customer service and communication lines for businesses and institutions with integrated intelligence and superior cloud integration."}
            </p>
          </div>

          {/* Col 1: Quick Links */}
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              {language === "ar" ? "الروابط السريعة" : "Quick Links"}
            </h4>
            <ul className="mt-4 space-y-2.5">
              {[
                { href: "#hero", label: language === "ar" ? "الرئيسية" : "Home" },
                { href: "#about", label: language === "ar" ? "من نحن" : "About Us" },
                { href: "#features", label: language === "ar" ? "المميزات" : "Features" },
                { href: "#pricing", label: language === "ar" ? "خطط الأسعار" : "Pricing Plans" },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-xs sm:text-sm text-gray-500 hover:text-purple-400 transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 2: Support & Help */}
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
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
                  <a href={l.href} className="text-xs sm:text-sm text-gray-500 hover:text-purple-400 transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Contact info */}
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              {language === "ar" ? "تواصل معنا" : "Contact Us"}
            </h4>
            <ul className="mt-4 space-y-3.5">
              <li className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-500">
                <Mail size={14} className="text-purple-400 shrink-0" />
                <a href="mailto:support@moreresponse.com" className="hover:text-purple-400 transition-colors">
                  support@moreresponse.com
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-500">
                <Phone size={14} className="text-purple-400 shrink-0" />
                <a href="tel:+962790000000" className="hover:text-purple-400 transition-colors">
                  +962 7 9000 0000
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-500">
                <MapPin size={14} className="text-purple-400 shrink-0" />
                <span>
                  {language === "ar" ? "المنامة، مملكة البحرين" : "Manama, Kingdom of Bahrain"}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-gray-600">
          <span>
            {language === "ar"
              ? "حقوق الطبع والنشر © 2026 منصة More Response. جميع الحقوق محفوظة."
              : "Copyright © 2026 More Response. All rights reserved."}
          </span>
          <div className="flex gap-5">
            <a href="#" className="hover:text-purple-400 transition-colors">
              {language === "ar" ? "شروط الخدمة" : "Terms of Service"}
            </a>
            <a href="#" className="hover:text-purple-400 transition-colors">
              {language === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
