"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    <div className="min-h-screen w-full flex overflow-hidden bg-white text-gray-900" dir={isRtl ? "rtl" : "ltr"}>
      {/* Left Purple Banner - Desktop Only */}
      <div className="hidden lg:flex w-[45%] xl:w-[40%] bg-gradient-to-br from-[#4F00C8] via-[#3B00A0] to-[#1E0078] relative items-center justify-center p-12 overflow-hidden select-none">
        {/* Background Glowing Blobs */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-purple-400/25 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl animate-pulse" style={{ animationDuration: '12s' }} />
        
        {/* Decorative Overlay Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />

        {/* Injected Login Carousel */}
        <div className="z-10 w-full">
          <LoginCarousel />
        </div>
      </div>

      {/* Right Content Panel */}
      <div className="flex-1 flex flex-col justify-between p-6 md:p-12 relative bg-white">
        
        {/* Language Toggler */}
        <button
          onClick={handleLanguageToggle}
          className={`absolute top-6 ${isRtl ? "left-6" : "right-6"} flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm cursor-pointer z-20`}
        >
          <Languages className="h-4 w-4 text-[#4F00C8]" />
          <span>{language === "en" ? "العربية (AR)" : "English (EN)"}</span>
        </button>

        {/* Empty Header Spacer */}
        <div className="h-10" />

        {/* Portal Options Section */}
        <div className="w-full max-w-md mx-auto flex flex-col justify-center flex-1 py-12">
          
          {/* Welcome Text */}
          <div className="text-center md:text-right mb-10">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 mb-4 font-cairo">
              {t.welcomePrefix}
              <span className="text-[#4F00C8] font-black">{t.welcomeSuffix}</span>
            </h1>
            <p className="text-gray-500 text-sm md:text-base leading-relaxed font-cairo">
              {t.subtitle}
            </p>
          </div>

          {/* Buttons Panel */}
          <div className="space-y-4">
            
            {/* Button 1: Sign In */}
            <button
              onClick={handleTourClick}
              className="w-full bg-[#4F00C8] hover:bg-[#3B00A0] text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg shadow-purple-600/20 hover:shadow-purple-600/30 hover:scale-[1.01] cursor-pointer"
            >
              <LogIn className={`h-5 w-5 ${isRtl ? "transform rotate-180" : ""}`} />
              <span className="font-cairo text-base">{t.signIn}</span>
            </button>

            {/* Button 2: Sign Up */}
            <button
              onClick={handleTourClick}
              className="w-full border-2 border-[#4F00C8] text-[#4F00C8] hover:bg-purple-50/50 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.01] cursor-pointer"
            >
              <UserPlus className="h-5 w-5" />
              <span className="font-cairo text-base">{t.signUp}</span>
            </button>

            {/* Divider: Or Explore */}
            <div className="relative my-8 flex items-center">
              <div className="flex-grow border-t border-gray-200" />
              <span className="flex-shrink mx-4 text-xs font-semibold text-gray-400 uppercase tracking-widest font-cairo bg-white px-2">
                {t.explore}
              </span>
              <div className="flex-grow border-t border-gray-200" />
            </div>

            {/* Button 3: Guided Tour */}
            <button
              onClick={handleTourClick}
              className="w-full bg-[#F8F9FC] border border-[#E2E8F0] hover:bg-[#F1F5F9] hover:border-gray-300 text-gray-700 font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all duration-200 hover:scale-[1.01] cursor-pointer"
            >
              <Flag className="h-5 w-5 text-gray-500" />
              <span className="font-cairo text-base">{t.tour}</span>
            </button>

          </div>
        </div>

        {/* Footer Section */}
        <footer className="text-center py-4 text-xs text-gray-400 font-cairo flex items-center justify-center gap-3">
          <Link href="/privacy" className="hover:text-[#4F00C8] transition-colors">
            {t.privacy}
          </Link>
          <span className="text-gray-300">•</span>
          <Link href="/terms" className="hover:text-[#4F00C8] transition-colors">
            {t.terms}
          </Link>
        </footer>

      </div>
    </div>
  );
}
