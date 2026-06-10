"use client";

import { useState } from "react";
import { 
  Home as HomeIcon, 
  Layers, 
  Users, 
  FileText, 
  BarChart3, 
  Settings, 
  Bell, 
  Clock, 
  Star,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export function Showcase() {
  const { language } = useLanguage();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Nodes for the Customer Journeys Flowchart
  const nodesAr = [
    { id: "home", label: "الرئيسية", desc: "الدخول: 1,850", info: "زيارات الموقع المباشرة", color: "from-blue-500 to-indigo-500" },
    { id: "features", label: "المميزات", desc: "الاستبقاء: 78%", info: "تصفح الخصائص والمقارنات", color: "from-[#7B61FF] to-purple-500" },
    { id: "signup", label: "التسجيل", desc: "التحويل: 42%", info: "إنشاء حسابات تجريبية جديدة", color: "from-amber-500 to-orange-500" },
    { id: "active", label: "نشط الآن", desc: "الترقية: 15%", info: "الربط الفعلي بقنوات المحادثة", color: "from-[#00FFCC] to-emerald-500" }
  ];

  const nodesEn = [
    { id: "home", label: "Home", desc: "Entry: 1,850", info: "Direct landing page visits", color: "from-blue-500 to-indigo-500" },
    { id: "features", label: "Features", desc: "Retention: 78%", info: "Feature grid interactions", color: "from-[#7B61FF] to-purple-500" },
    { id: "signup", label: "Sign Up", desc: "Conversion: 42%", info: "New trial account signups", color: "from-amber-500 to-orange-500" },
    { id: "active", label: "Active", desc: "Upgrade: 15%", info: "Omnichannel bot deployment", color: "from-[#00FFCC] to-emerald-500" }
  ];

  const nodes = language === "ar" ? nodesAr : nodesEn;

  return (
    <section id="showcase" className="relative py-24 bg-background border-t border-border-custom overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#7B61FF]/5 blur-[150px] pointer-events-none" />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {language === "ar" ? "جولة داخل لوحة التحكم" : "A Tour Inside"}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-foreground/70 dark:text-[#8e8eb2]">
            {language === "ar" 
              ? "شاهد كيف تبدو لوحة الإدارة الذكية لمراقبة مسارات عملائك وتوزيع المهام."
              : "Discover the responsive admin dashboard designed to monitor and optimize your customer operations in real-time."}
          </p>
        </div>

        {/* Dashboard Mock Window */}
        <div className="w-full rounded-2xl border border-border-custom bg-card shadow-[0_30px_70px_rgba(0,0,0,0.08)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col md:flex-row relative">
          
          {/* Mock Sidebar */}
          <div className="w-full md:w-16 bg-[#0f0f26] dark:bg-[#0f0f26] border-b md:border-b-0 md:border-r border-white/5 md:border-border-custom p-4 flex md:flex-col items-center justify-between md:justify-start gap-6 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#7B61FF]/15 flex items-center justify-center text-[#7B61FF] font-bold">
              M
            </div>
            <div className="flex md:flex-col gap-4.5 md:mt-8 text-white/50 dark:text-[#8e8eb2]">
              <HomeIcon size={18} className="text-[#7B61FF] cursor-pointer" />
              <Layers size={18} className="hover:text-white transition-colors cursor-pointer" />
              <Users size={18} className="hover:text-white transition-colors cursor-pointer" />
              <FileText size={18} className="hover:text-white transition-colors cursor-pointer" />
              <BarChart3 size={18} className="hover:text-white transition-colors cursor-pointer" />
            </div>
            <div className="md:mt-auto">
              <Settings size={18} className="text-white/50 dark:text-[#8e8eb2] hover:text-white transition-colors cursor-pointer" />
            </div>
          </div>

          {/* Mock Main Content Area */}
          <div className="flex-1 p-5 sm:p-7 flex flex-col gap-6 text-start bg-foreground/[0.01]">
            
            {/* Dashboard Topbar */}
            <div className="flex items-center justify-between border-b border-border-custom/50 pb-4">
              <div>
                <h3 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                  {language === "ar" ? "لوحة الإدارة - MORE Response" : "MORE Response Dashboard"}
                </h3>
                <p className="text-[10px] text-foreground/50 dark:text-[#8e8eb2] mt-0.5">
                  {language === "ar" ? "مزامنة البيانات الحية نشطة" : "Live data synchronization active"}
                </p>
              </div>
              <div className="flex items-center gap-4 text-foreground/60 dark:text-[#8e8eb2]">
                <div className="relative">
                  <Bell size={16} className="cursor-pointer" />
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-[#00FFCC]" />
                </div>
                <div className="w-7 h-7 rounded-full bg-[#7B61FF]/20 flex items-center justify-center text-[10px] text-foreground dark:text-white border border-[#7B61FF]/30 font-semibold cursor-pointer">
                  S
                </div>
              </div>
            </div>

            {/* KPI Cards Row */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              {/* Card 1: Active Conversions */}
              <div className="rounded-xl border border-border-custom bg-background/80 p-4.5 relative overflow-hidden group hover:border-[#7B61FF]/30 transition-all duration-300">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#7B61FF]/10 to-transparent pointer-events-none" />
                <span className="text-[10px] sm:text-xs font-medium text-foreground/60 dark:text-[#8e8eb2]">
                  {language === "ar" ? "التحويلات النشطة" : "Active Conversions"}
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl sm:text-2xl font-black text-foreground">1,425</span>
                  <span className="text-[9px] font-bold text-[#00FFCC] bg-[#00FFCC]/10 dark:bg-[#00FFCC]/15 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <TrendingUp size={8} /> +12.4%
                  </span>
                </div>
                {/* SVG sparkline */}
                <div className="mt-3.5 h-6 w-full opacity-60">
                  <svg className="w-full h-full" viewBox="0 0 100 25" preserveAspectRatio="none">
                    <path d="M0 20 Q15 5, 30 15 T60 8 T90 2 T100 12" fill="none" stroke="#7B61FF" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Card 2: Avg Resolution Time */}
              <div className="rounded-xl border border-border-custom bg-background/80 p-4.5 relative overflow-hidden group hover:border-[#7B61FF]/30 transition-all duration-300">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-blue-500/10 to-transparent pointer-events-none" />
                <span className="text-[10px] sm:text-xs font-medium text-foreground/60 dark:text-[#8e8eb2]">
                  {language === "ar" ? "متوسط سرعة الاستجابة" : "Avg. Resolution Time"}
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl sm:text-2xl font-black text-foreground">2 mins</span>
                  <Clock size={16} className="text-[#7B61FF]" />
                </div>
                {/* SVG sparkline */}
                <div className="mt-3.5 h-6 w-full opacity-60">
                  <svg className="w-full h-full" viewBox="0 0 100 25" preserveAspectRatio="none">
                    <path d="M0 15 Q25 22, 50 10 T90 18 T100 5" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Card 3: CSAT */}
              <div className="rounded-xl border border-border-custom bg-background/80 p-4.5 relative overflow-hidden group hover:border-[#7B61FF]/30 transition-all duration-300">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-yellow-500/10 to-transparent pointer-events-none" />
                <span className="text-[10px] sm:text-xs font-medium text-foreground/60 dark:text-[#8e8eb2]">
                  {language === "ar" ? "معدل رضا العملاء" : "Customer Satisfaction"}
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl sm:text-2xl font-black text-foreground">4.9 / 5</span>
                  <div className="flex gap-0.5 text-yellow-500">
                    <Star size={12} fill="currentColor" />
                    <Star size={12} fill="currentColor" />
                    <Star size={12} fill="currentColor" />
                    <Star size={12} fill="currentColor" />
                    <Star size={12} fill="currentColor" />
                  </div>
                </div>
                {/* SVG sparkline */}
                <div className="mt-3.5 h-6 w-full opacity-60">
                  <svg className="w-full h-full" viewBox="0 0 100 25" preserveAspectRatio="none">
                    <path d="M0 12 Q30 5, 60 10 T90 2 T100 3" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Customer Journeys Flowchart */}
            <div className="rounded-xl border border-border-custom bg-background/80 p-5.5 relative">
              <h4 className="text-xs sm:text-sm font-bold text-foreground mb-5 flex items-center justify-between">
                {language === "ar" ? "مسارات المستخدمين والاحتفاظ" : "Customer Journeys Map"}
                <span className="text-[10px] text-[#00FFCC] bg-[#7B61FF] dark:bg-[#7B61FF]/35 text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  {language === "ar" ? "الربط التفاعلي" : "Interactive Nodes"}
                </span>
              </h4>

              {/* Flowchart Layout */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4 relative py-4">
                
                {/* Flow Lines (Desktop) */}
                <div className="absolute top-1/2 left-10 right-10 -translate-y-1/2 h-[1px] bg-gradient-to-r from-blue-500 via-[#7B61FF] to-[#00FFCC] opacity-20 hidden md:block -z-10" />

                {nodes.map((node, index) => (
                  <div key={node.id} className="flex flex-col md:flex-row items-center w-full md:w-auto relative">
                    
                    {/* Node Card */}
                    <div 
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      className={`w-full md:w-36 rounded-xl border p-3.5 text-center transition-all duration-300 relative cursor-pointer ${
                        hoveredNode === node.id 
                          ? "border-[#7B61FF] bg-[#7B61FF]/5 dark:bg-[#161632] scale-105 shadow-[0_0_15px_rgba(123,97,255,0.1)]" 
                          : "border-border-custom bg-card/50"
                      }`}
                    >
                      {/* Left vertical theme line */}
                      <div className={`absolute top-0 bottom-0 left-0 w-1 rounded-l-xl bg-gradient-to-b ${node.color}`} />
                      
                      <div className="font-bold text-foreground text-xs sm:text-sm">{node.label}</div>
                      <div className="text-[10px] text-foreground/60 dark:text-[#8e8eb2] mt-1 font-medium">{node.desc}</div>
                      
                      {/* Mini-tooltip info */}
                      <div className={`absolute -bottom-12 left-1/2 -translate-x-1/2 w-44 bg-card border border-border-custom rounded-lg p-2 text-[10px] text-foreground shadow-xl transition-all duration-200 pointer-events-none z-30 ${
                        hoveredNode === node.id ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                      }`}>
                        {node.info}
                      </div>
                    </div>

                    {/* Connecting Arrow */}
                    {index < nodes.length - 1 && (
                      <div className="my-1.5 md:my-0 md:mx-2 text-[#7B61FF] opacity-40">
                        <ArrowRight className="rotate-90 md:rotate-0" size={16} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Section Subtext */}
        <div className="mt-8 text-center">
          <p className="text-xs sm:text-sm text-foreground/60 dark:text-[#8e8eb2] italic">
            {language === "ar" ? "لوحة تحكم أنيقة تناسب سرعة فريقك." : "A sleek dashboard to match your team’s speed."}
          </p>
        </div>
      </div>
    </section>
  );
}
