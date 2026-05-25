"use client";

import React, { useState, useEffect } from "react";

interface Slide {
  title: string;
  description: string;
}

const slides: Slide[] = [
  {
    title: "مستقبل خدمة العملاء",
    description: "أطلق العنان لقوة الذكاء الاصطناعي لتقديم تجارب استثنائية لعملائك، على مدار الساعة.",
  },
  {
    title: "ربط قنوات متكامل",
    description: "تواصل مع عملائك عبر قنواتهم المفضلة كـ WhatsApp و Telegram بنقرة واحدة.",
  },
  {
    title: "تحليلات متقدمة ودقيقة",
    description: "لوحات معلومات تفصيلية لمراقبة الأداء، معدلات التحويل، وحجم التوفير الفعلي.",
  },
];

export function LoginCarousel() {
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Glassmorphic Card Container */}
      <div className="bg-white/10 backdrop-blur-lg border border-white/15 rounded-3xl p-8 md:p-10 shadow-2xl transition-all duration-500 hover:border-white/25">
        
        {/* Logo Container */}
        <div className="bg-white rounded-xl px-8 py-5 flex flex-col items-center justify-center shadow-xl w-48 mx-auto mb-10 select-none transform hover:scale-105 transition-transform duration-300">
          <span className="text-gray-800 font-medium text-xs tracking-[0.25em] leading-none uppercase">client</span>
          <span className="text-[#5b21b6] font-black text-2xl tracking-[0.08em] leading-none mt-1.5 uppercase">MORE</span>
        </div>

        {/* Carousel Content */}
        <div className="relative min-h-[140px] overflow-hidden">
          {slides.map((slide, idx) => (
            <div
              key={idx}
              className={`transition-all duration-700 ease-in-out absolute inset-0 flex flex-col items-center justify-center text-center ${
                idx === currentIdx
                  ? "opacity-100 translate-x-0 scale-100 pointer-events-auto"
                  : "opacity-0 translate-x-12 scale-95 pointer-events-none"
              }`}
            >
              <h3 className="text-white text-2xl font-bold mb-4 font-cairo">
                {slide.title}
              </h3>
              <p className="text-white/80 text-sm md:text-base leading-relaxed max-w-sm font-cairo">
                {slide.description}
              </p>
            </div>
          ))}
        </div>

        {/* Navigation Indicator Dots */}
        <div className="flex justify-center items-center gap-2 mt-8">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIdx(idx)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentIdx ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
