"use client";

import { useState } from "react";
import { Sliders, MessageSquare, Plus, Search, Filter } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export function Showcase() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"overview" | "clients" | "analytics">("overview");

  return (
    <section id="showcase" className="relative py-20 border-t border-border">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Section Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("showcaseTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-muted-fg">
            {t("showcaseSubtitle")}
          </p>
        </div>

        {/* Tab Buttons Container */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-fg hover:text-foreground hover:border-primary/30"
            }`}
          >
            {t("showcaseOverviewTab")}
          </button>
          <button
            onClick={() => setActiveTab("clients")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "clients"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-fg hover:text-foreground hover:border-primary/30"
            }`}
          >
            {t("showcaseClientsTab")}
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "analytics"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-fg hover:text-foreground hover:border-primary/30"
            }`}
          >
            {t("showcaseAnalyticsTab")}
          </button>
        </div>

        {/* Mock Window Container */}
        <div className="w-full rounded-2xl border border-border bg-card shadow-md overflow-hidden text-start">
          {/* OS Style Window Top Bar */}
          <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-5 py-3.5">
            <span className="w-2.5 h-2.5 rounded-full bg-danger" />
            <span className="w-2.5 h-2.5 rounded-full bg-warning" />
            <span className="w-2.5 h-2.5 rounded-full bg-success" />
            <span className="text-[10px] sm:text-xs font-semibold text-muted-fg ms-4">
              {activeTab === "overview" && (language === "ar" ? "لوحة التحكم - النظرة العامة" : "Dashboard - Overview")}
              {activeTab === "clients" && (language === "ar" ? "لوحة التحكم - دليل العملاء" : "Dashboard - Clients")}
              {activeTab === "analytics" && (language === "ar" ? "لوحة التحكم - الإحصائيات الفنية" : "Dashboard - Analytics")}
            </span>
          </div>

          {/* Window Content */}
          <div className="p-5 sm:p-7 min-h-[380px] flex flex-col justify-between">
            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-6 animate-fadeIn">
                {/* 4 KPI Cards */}
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <div className="text-[10px] sm:text-xs text-muted-fg">{t("showcaseKpiClients")}</div>
                    <div className="mt-1.5 text-lg sm:text-2xl font-bold text-foreground">128</div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <div className="text-[10px] sm:text-xs text-muted-fg">{t("showcaseKpiMRR")}</div>
                    <div className="mt-1.5 text-lg sm:text-2xl font-bold text-success">$14,250</div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <div className="text-[10px] sm:text-xs text-muted-fg">{t("showcaseKpiMsgs")}</div>
                    <div className="mt-1.5 text-lg sm:text-2xl font-bold text-primary">342.8K</div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <div className="text-[10px] sm:text-xs text-muted-fg">{t("showcaseKpiStability")}</div>
                    <div className="mt-1.5 text-lg sm:text-2xl font-bold text-info">99.98%</div>
                  </div>
                </div>

                {/* Recent Subscriptions Table */}
                <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
                    <span className="text-xs sm:text-sm font-bold text-foreground">{t("showcaseRecentSubscribers")}</span>
                    <span className="flex items-center gap-1.5 text-[10px] text-primary font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                      {t("showcaseLiveUpdate")}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-muted-fg text-left rtl:text-right">
                      <thead className="bg-muted/30 text-[10px] text-muted-fg uppercase tracking-wider border-b border-border">
                        <tr>
                          <th className="px-4 py-3 font-medium">{t("showcaseColName")}</th>
                          <th className="px-4 py-3 font-medium">{t("showcaseColSpecialty")}</th>
                          <th className="px-4 py-3 font-medium">{t("showcaseColPlan")}</th>
                          <th className="px-4 py-3 font-medium">{t("showcaseColStatus")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        <tr>
                          <td className="px-4 py-3 font-semibold text-foreground">Al-Amal Dental Center</td>
                          <td className="px-4 py-3">{language === "ar" ? "طبي / عيادة" : "Medical Clinic"}</td>
                          <td className="px-4 py-3"><span className="text-primary bg-primary/10 px-2 py-0.5 rounded text-[10px] font-semibold">Basic Plan</span></td>
                          <td className="px-4 py-3"><span className="text-success bg-success/10 px-2 py-0.5 rounded text-[10px] font-semibold">{language === "ar" ? "نشط" : "Active"}</span></td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-foreground">Elite E-Commerce Store</td>
                          <td className="px-4 py-3">{language === "ar" ? "متجر إلكتروني" : "E-Commerce"}</td>
                          <td className="px-4 py-3"><span className="text-info bg-info/10 px-2 py-0.5 rounded text-[10px] font-semibold">Premium Plan</span></td>
                          <td className="px-4 py-3"><span className="text-success bg-success/10 px-2 py-0.5 rounded text-[10px] font-semibold">{language === "ar" ? "نشط" : "Active"}</span></td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-semibold text-foreground">Ibn Sina Academy</td>
                          <td className="px-4 py-3">{language === "ar" ? "تعليم وأكاديمية" : "Education"}</td>
                          <td className="px-4 py-3"><span className="text-info bg-info/10 px-2 py-0.5 rounded text-[10px] font-semibold">Premium Plan</span></td>
                          <td className="px-4 py-3"><span className="text-success bg-success/10 px-2 py-0.5 rounded text-[10px] font-semibold">{language === "ar" ? "نشط" : "Active"}</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CLIENTS DIRECTORY */}
            {activeTab === "clients" && (
              <div className="space-y-4 animate-fadeIn">
                {/* Search and Filters Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative flex-1 max-w-sm">
                    <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-fg" />
                    <input
                      type="text"
                      placeholder={language === "ar" ? "البحث باسم العميل..." : "Search clients..."}
                      className="w-full bg-background border border-input rounded-lg ps-9 pe-4 py-1.5 text-xs text-foreground outline-none"
                      disabled
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 border border-border bg-muted/40 px-3 py-1.5 rounded-lg text-xs text-muted-fg hover:text-foreground" disabled>
                      <Filter size={12} />
                      {language === "ar" ? "تصفية" : "Filter"}
                    </button>
                    <button className="flex items-center gap-1 bg-primary px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover" disabled>
                      <Plus size={14} />
                      {language === "ar" ? "إضافة عميل جديد" : "Add Client"}
                    </button>
                  </div>
                </div>

                {/* Live Client Grid Table */}
                <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-muted-fg text-left rtl:text-right">
                      <thead className="bg-muted/30 text-[10px] text-muted-fg uppercase tracking-wider border-b border-border">
                        <tr>
                          <th className="px-4 py-3 font-medium">{t("showcaseColOwner")}</th>
                          <th className="px-4 py-3 font-medium">{t("showcaseColSpecialty")}</th>
                          <th className="px-4 py-3 font-medium">{t("showcaseColNode")}</th>
                          <th className="px-4 py-3 font-medium">{t("showcaseColActions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        <tr>
                          <td className="px-4 py-3">
                            <strong className="text-foreground">Elite E-Commerce Store</strong>
                            <div className="text-[10px] text-muted-fg">{language === "ar" ? "سارة جابر" : "Sarah Jaber"}</div>
                          </td>
                          <td className="px-4 py-3">{language === "ar" ? "متجر إلكتروني" : "E-Commerce"}</td>
                          <td className="px-4 py-3">node-me-1 (Bahrain)</td>
                          <td className="px-4 py-3">
                            <button className="inline-flex items-center gap-1 border border-border bg-muted/40 hover:bg-muted text-[10px] font-semibold text-primary px-2.5 py-1 rounded" disabled>
                              <Sliders size={11} />
                              {language === "ar" ? "إدارة" : "Manage"}
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3">
                            <strong className="text-foreground">Royal Logistics Group</strong>
                            <div className="text-[10px] text-muted-fg">{language === "ar" ? "فيصل الصباح" : "Faisal Al-Sabah"}</div>
                          </td>
                          <td className="px-4 py-3">{language === "ar" ? "لوجستيات وشحن" : "Logistics"}</td>
                          <td className="px-4 py-3">node-me-1 (Bahrain)</td>
                          <td className="px-4 py-3">
                            <button className="inline-flex items-center gap-1 border border-border bg-muted/40 hover:bg-muted text-[10px] font-semibold text-primary px-2.5 py-1 rounded" disabled>
                              <Sliders size={11} />
                              {language === "ar" ? "إدارة" : "Manage"}
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3">
                            <strong className="text-foreground">Al-Kindi Real Estate</strong>
                            <div className="text-[10px] text-muted-fg">{language === "ar" ? "مجد الحسن" : "Majd Al-Hassan"}</div>
                          </td>
                          <td className="px-4 py-3">{language === "ar" ? "عقارات وإنشاءات" : "Real Estate"}</td>
                          <td className="px-4 py-3">node-me-1 (Bahrain)</td>
                          <td className="px-4 py-3">
                            <span className="text-danger bg-danger/10 px-2 py-0.5 rounded text-[10px] font-semibold">
                              {language === "ar" ? "معلق" : "Suspended"}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ADVANCED ANALYTICS */}
            {activeTab === "analytics" && (
              <div className="space-y-6 animate-fadeIn">
                {/* 3 Analytics KPIs */}
                <div className="grid gap-4 grid-cols-3">
                  <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
                    <div className="text-[10px] sm:text-xs text-muted-fg">{t("showcaseKpiAvgResponse")}</div>
                    <div className="mt-1.5 text-base sm:text-2xl font-bold text-info">124 ms</div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
                    <div className="text-[10px] sm:text-xs text-muted-fg">{t("showcaseKpiFailureRate")}</div>
                    <div className="mt-1.5 text-base sm:text-2xl font-bold text-success">0.04%</div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
                    <div className="text-[10px] sm:text-xs text-muted-fg">{t("showcaseKpiPeakVolume")}</div>
                    <div className="mt-1.5 text-base sm:text-2xl font-bold text-primary">
                      {language === "ar" ? "1.8K/دقيقة" : "1.8K/min"}
                    </div>
                  </div>
                </div>

                {/* Message Volume Comparison Chart (HTML Bar Chart representation) */}
                <div className="rounded-xl border border-border bg-muted/30 p-5 flex flex-col justify-between h-[190px]">
                  <div className="text-xs sm:text-sm font-semibold text-foreground mb-2">{t("showcaseChartTitle")}</div>
                  
                  {/* Bars Graph */}
                  <div className="flex items-end justify-around h-[90px] border-b border-border pb-1.5 px-2">
                    <div className="flex flex-col items-center gap-1.5 w-full">
                      <div className="flex items-end gap-1 justify-center h-[70px]">
                        <div className="w-5.5 bg-success rounded-t" style={{ height: "45%" }} title="WhatsApp" />
                        <div className="w-5.5 bg-primary rounded-t" style={{ height: "20%" }} title="SMS" />
                        <div className="w-5.5 bg-info rounded-t" style={{ height: "15%" }} title="Email" />
                      </div>
                      <span className="text-[10px] text-muted-fg font-medium">{t("showcaseChartMonth3")}</span>
                    </div>

                    <div className="flex flex-col items-center gap-1.5 w-full">
                      <div className="flex items-end gap-1 justify-center h-[70px]">
                        <div className="w-5.5 bg-success rounded-t" style={{ height: "70%" }} title="WhatsApp" />
                        <div className="w-5.5 bg-primary rounded-t" style={{ height: "25%" }} title="SMS" />
                        <div className="w-5.5 bg-info rounded-t" style={{ height: "20%" }} title="Email" />
                      </div>
                      <span className="text-[10px] text-muted-fg font-medium">{t("showcaseChartMonth4")}</span>
                    </div>

                    <div className="flex flex-col items-center gap-1.5 w-full">
                      <div className="flex items-end gap-1 justify-center h-[70px]">
                        <div className="w-5.5 bg-success rounded-t" style={{ height: "95%" }} title="WhatsApp" />
                        <div className="w-5.5 bg-primary rounded-t" style={{ height: "35%" }} title="SMS" />
                        <div className="w-5.5 bg-info rounded-t" style={{ height: "22%" }} title="Email" />
                      </div>
                      <span className="text-[10px] text-muted-fg font-medium">{t("showcaseChartMonth5")}</span>
                    </div>
                  </div>

                  {/* Legend / Info */}
                  <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 mt-3 text-[10px] text-muted-fg">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-success" />
                      WhatsApp API
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-primary" />
                      {t("showcaseChartSms")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-info" />
                      {t("showcaseChartEmail")}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
