"use client";

import React from "react";
import Link from "@/lib/next-shim/link";
import { useRouter } from "@/lib/next-shim/navigation";
import { useLanguage } from "@/components/language-provider";
import { LoginCarousel } from "./login-carousel";
import { LogIn, UserPlus, Flag, Languages } from "lucide-react";

const content = {
  ar: {
    welcomePrefix: "مرحباً بك في ",
    welcomeSuffix: "MORE",
    subtitle: "أتمت خدمة عملائك بذكاء اصطناعي متطور. ابدأ رحلتك نحو كفاءة أعلى ورضا عملاء لا مثيل له.",
    signIn: "تسجيل الدخول",
    signUp: "إنشاء حساب جديد",
    explore: "أو استكشف المنصة",
    tour: "خذ جولة تعريفية",
    privacy: "سياسة الخصوصية",
    terms: "شروط الخدمة",
  },
  en: {
    welcomePrefix: "Welcome to ",
    welcomeSuffix: "MORE",
    subtitle: "Automate your customer service with advanced AI. Start your journey towards higher efficiency and unmatched customer satisfaction.",
    signIn: "Sign In",
    signUp: "Create New Account",
    explore: "Or explore the platform",
    tour: "Take a Guided Tour",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
  },
};

export function LoginView() {
  const { language, setLanguage, isRtl } = useLanguage();
  const router = useRouter();

  const t = content[language];

  const handleLanguageToggle = () => {
    setLanguage(language === "en" ? "ar" : "en");
  };

  const handleTourClick = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen w-full flex overflow-hidden bg-background text-foreground" dir={isRtl ? "rtl" : "ltr"}>
      {/* Left Brand Banner - Desktop Only */}
      <div className="hidden lg:flex w-[45%] xl:w-[40%] gradient-brand relative items-center justify-center p-12 overflow-hidden select-none">
        {/* Background Glowing Blobs */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-white/20 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-brand-300/30 blur-3xl animate-pulse" style={{ animationDuration: '12s' }} />
        
        {/* Decorative Overlay Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />

        {/* Injected Login Carousel */}
        <div className="z-10 w-full">
          <LoginCarousel />
        </div>
      </div>

      {/* Right Content Panel */}
      <div className="flex-1 flex flex-col justify-between p-6 md:p-12 relative bg-background">

        {/* Language Toggler */}
        <button
          onClick={handleLanguageToggle}
          className={`absolute top-6 ${isRtl ? "left-6" : "right-6"} flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-all duration-200 shadow-sm cursor-pointer z-20`}
        >
          <Languages className="h-4 w-4 text-primary" />
          <span>{language === "en" ? "العربية (AR)" : "English (EN)"}</span>
        </button>

        {/* Empty Header Spacer */}
        <div className="h-10" />

        {/* Portal Options Section */}
        <div className="w-full max-w-md mx-auto flex flex-col justify-center flex-1 py-12">
          
          {/* Welcome Text */}
          <div className="text-center md:text-right mb-10">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4 font-cairo">
              {t.welcomePrefix}
              <span className="text-primary font-black">{t.welcomeSuffix}</span>
            </h1>
            <p className="text-muted-fg text-sm md:text-base leading-relaxed font-cairo">
              {t.subtitle}
            </p>
          </div>

          {/* Buttons Panel */}
          <div className="space-y-4">
            
            {/* Button 1: Sign In */}
            <button
              onClick={handleTourClick}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all duration-200 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 cursor-pointer"
            >
              <LogIn className={`h-5 w-5 ${isRtl ? "transform rotate-180" : ""}`} />
              <span className="font-cairo text-base">{t.signIn}</span>
            </button>

            {/* Button 2: Sign Up */}
            <button
              onClick={handleTourClick}
              className="w-full border-2 border-primary text-primary hover:bg-primary/10 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer"
            >
              <UserPlus className="h-5 w-5" />
              <span className="font-cairo text-base">{t.signUp}</span>
            </button>

            {/* Divider: Or Explore */}
            <div className="relative my-8 flex items-center">
              <div className="flex-grow border-t border-border" />
              <span className="flex-shrink mx-4 text-xs font-semibold text-muted-fg uppercase tracking-widest font-cairo bg-background px-2">
                {t.explore}
              </span>
              <div className="flex-grow border-t border-border" />
            </div>

            {/* Button 3: Guided Tour */}
            <button
              onClick={handleTourClick}
              className="w-full bg-muted border border-border hover:bg-accent text-foreground font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer"
            >
              <Flag className="h-5 w-5 text-muted-fg" />
              <span className="font-cairo text-base">{t.tour}</span>
            </button>

          </div>
        </div>

        {/* Footer Section */}
        <footer className="text-center py-4 text-xs text-muted-fg font-cairo flex items-center justify-center gap-3">
          <Link href="/privacy" className="hover:text-primary transition-colors">
            {t.privacy}
          </Link>
          <span className="text-border">•</span>
          <Link href="/terms" className="hover:text-primary transition-colors">
            {t.terms}
          </Link>
        </footer>

      </div>
    </div>
  );
}
