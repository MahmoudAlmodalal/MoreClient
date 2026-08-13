"use client";

import { Mail, Phone, MapPin } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

function FooterLogo() {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-custom bg-card text-accent shadow-sm">
        <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M4 17V8L12 14L20 8V17" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="font-outfit text-base font-extrabold tracking-tight text-foreground sm:text-lg">
        MORE <span className="font-medium text-foreground/65">Response</span>
      </span>
    </div>
  );
}

export function LandingFooter() {
  const { language } = useLanguage();
  const quickLinks = [
    { href: "#hero", label: language === "ar" ? "الرئيسية" : "Home" },
    { href: "#features", label: language === "ar" ? "المميزات" : "Features" },
    { href: "#showcase", label: language === "ar" ? "المنصة" : "Showcase" },
    { href: "#pricing", label: language === "ar" ? "خطط الأسعار" : "Pricing Plans" },
  ];
  const supportLinks = [
    { href: "#faq", label: language === "ar" ? "الأسئلة الشائعة" : "FAQs" },
    { href: "#", label: language === "ar" ? "توثيقات الـ API" : "API Docs" },
    { href: "#", label: language === "ar" ? "مركز المساعدة" : "Help Center" },
    { href: "#", label: language === "ar" ? "حالة النظام" : "System Status" },
  ];

  return (
    <footer className="bg-sidebar py-14 text-start sm:py-16">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 border-b border-border-custom pb-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <FooterLogo />
            <p className="max-w-xs text-sm leading-6 text-foreground/60">
              {language === "ar"
                ? "منصة عملية لإدارة محادثات العملاء وأتمتة التواصل عبر قنواتك الأساسية من مكان واحد."
                : "A practical platform for managing customer conversations and automating communication across your core channels."}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-foreground">{language === "ar" ? "الروابط السريعة" : "Quick links"}</h4>
            <ul className="mt-4 space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.label}><a href={link.href} className="text-sm text-foreground/60 transition-colors hover:text-accent">{link.label}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-foreground">{language === "ar" ? "الدعم والمساعدة" : "Support"}</h4>
            <ul className="mt-4 space-y-2.5">
              {supportLinks.map((link) => (
                <li key={link.label}><a href={link.href} className="text-sm text-foreground/60 transition-colors hover:text-accent">{link.label}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-foreground">{language === "ar" ? "تواصل معنا" : "Contact"}</h4>
            <ul className="mt-4 space-y-3 text-sm text-foreground/60">
              <li className="flex items-center gap-2.5"><Mail size={14} className="shrink-0 text-accent" /><a href="mailto:support@moreresponse.com" className="hover:text-accent">support@moreresponse.com</a></li>
              <li className="flex items-center gap-2.5"><Phone size={14} className="shrink-0 text-accent" /><a href="tel:+962790000000" className="hover:text-accent">+962 7 9000 0000</a></li>
              <li className="flex items-center gap-2.5"><MapPin size={14} className="shrink-0 text-accent" /><span>{language === "ar" ? "المنامة، مملكة البحرين" : "Manama, Kingdom of Bahrain"}</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 text-xs text-foreground/55 sm:flex-row sm:items-center sm:justify-between">
          <span>{language === "ar" ? "حقوق الطبع والنشر © 2026 منصة More Response. جميع الحقوق محفوظة." : "Copyright © 2026 More Response. All rights reserved."}</span>
          <div className="flex gap-5">
            <a href="#" className="hover:text-accent">{language === "ar" ? "شروط الخدمة" : "Terms of Service"}</a>
            <a href="#" className="hover:text-accent">{language === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
