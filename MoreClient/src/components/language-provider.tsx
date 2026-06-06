"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { apiGet, type SettingsOut } from "@/lib/api";

type Language = "en" | "ar";

type Translations = typeof translationsEn;

const translationsEn = {
  // Sidebar & Navigation
  dashboard: "Dashboard",
  files: "Knowledge Base",
  handoffs: "Handoff Queue",
  billingNav: "Billing",
  settings: "Settings & Profile",
  widgetPreview: "Widget Live Preview",
  adminPanel: "clientMORE Admin",
  builtInGaza: "Built in Gaza · Deployed Globally",
  logout: "Logout",
  cancel : "Cancel"


  // Notifications
  notifications: "Notifications",
  markAllRead: "Mark all read",
  noNotifications: "No notifications yet",
  unread: "unread",
  handoffNotificationLowConfidence: "Low-confidence question needs review",
  handoffNotificationComplaint: "Customer complaint escalated",
  handoffNotificationSupportRequest: "Support request escalated",
  handoffNotificationUnsafe: "Unsafe or unanswered question escalated",

  // General Status
  active: "Active",
  inactive: "Inactive",
  connected: "Connected",
  disconnected: "Disconnected",
  loading: "Loading...",
  saving: "Saving...",
  saved: "Saved Successfully",
  save: "Save Changes",
  status: "Status",
  action: "Action",
  resolved: "Resolved",
  open: "Open",
  pending: "Pending",
  failed: "Failed",
  completed: "Completed",
  processing: "Processing",
  all: "All",

  // Dashboard Page
  analyticsTitle: "Business Analytics & KPIs",
  analyticsSub: "Monitor deflection rates, channel usage, and savings to make support decisions.",
  kpiTotalQuestions: "Total Questions",
  kpiAnswerRate: "AI Resolution Rate",
  kpiUnanswered: "Unanswered Queries",
  kpiHandoffs: "Human Escalations",
  kpiDeflectionRate: "Deflection Rate",
  kpiCostSavings: "Estimated Savings",
  kpiFeedbackScore: "Customer CSAT",
  kpiUnrepliedHandoffs: "Unreplied Handoffs",
  sourceDistribution: "Channel Source Share",
  topQuestions: "Top Repeated Questions",
  unansweredListTitle: "Recent Unanswered Questions",
  unansweredListSub: "These queries fell below confidence threshold and need manual Q&A injection.",
  questionCol: "User Question",
  detectedLangCol: "Language",
  channelCol: "Channel",
  injectAnswer: "Teach Bot / Approve Answer",
  unansweredEmpty: "Perfect! No unanswered questions in the queue.",
  confidenceScore: "Confidence Score",
  timeAgo: "Time Received",

  // Files Ingestion Page
  filesTitle: "Knowledge Base Ingestion",
  filesSub: "Upload PDFs, DOCX, TXT, or XLSX spreadsheets. clientMORE converts them to Markdown, chunks, and embeds them into ChromaDB.",
  dropzoneTitle: "Drag & drop files here, or click to browse",
  dropzoneSub: "Supports PDF, DOCX, TXT, XLSX (Max 10MB)",
  fileListTitle: "Parsed Documents",
  fileListSub: "Currently ingested knowledge assets used for RAG response generation.",
  fileName: "File Name",
  fileSize: "Size",
  chunksCreated: "Vector Chunks",
  uploadDate: "Date Ingested",
  deleteFile: "Delete",
  uploadSuccess: "File uploaded and processed successfully!",

  // Handoff Page
  handoffsTitle: "Human Support Queue",
  handoffsSub: "Real-time chat takeover from Telegram, WhatsApp, and Web Widget.",
  unrepliedOnly: "Show Unreplied Only",
  noHandoffs: "No active handoff requests in this channel.",
  chatHistory: "Chat History",
  reason: "Escalation Reason",
  userLanguage: "Preferred Language",
  replyPlaceholder: "Type your message to send back to the user...",
  sendReply: "Send Message",
  resolveHandoff: "Resolve & Close Session",
  addToKb: "Add to Knowledge Base",
  addedToKb: "Added to knowledge base — the bot will answer this next time.",
  lowConfidence: "Low AI Confidence",
  userRequested: "User Requested Human",
  keywordTriggered: "Keyword Escalate",
  channelTelegram: "Telegram Bot",
  channelWhatsapp: "WhatsApp",
  channelWidget: "Web Widget",
  activeChat: "Active chat with {name}",
  purchaseComplete: "Purchase Order",
  complaintReason: "Customer Complaint",
  supportRequestReason: "Support Request",
  purchaseDetails: "Purchase Details",
  productName: "Product",
  quantity: "Quantity",
  deliveryAddress: "Delivery Address",
  orderStatus: "Order Status",

  // Settings & Tenant Config Page
  settingsTitle: "clientMORE Control Panel",
  settingsSub: "Customize bot behavior, active integrations, and manage your B2B subscription.",
  tenantSection: "Tenant & Bot Profile",
  companyName: "Company Name",
  botName: "Bot Name",
  companyLogo: "Company Logo",
  uploadLogo: "Upload Logo",
  dragDropOrClick: "Drag & drop your logo here, or click to browse",
  fileRequirements: "Supports PNG, JPEG, SVG, WebP (Max 2MB)",
  logoSizeError: "Logo file size must be less than 2MB",
  logoTypeError: "Only image files (PNG, JPEG, SVG, WebP) are allowed",
  useUrlInstead: "Use URL instead",
  useUploadInstead: "Upload image instead",
  removeLogo: "Remove logo",
  botTone: "Conversation Tone",
  toneProfessional: "Professional & Precise",
  toneFriendly: "Friendly & Enthusiastic",
  toneFormal: "Formal & Corporate",
  systemPromptExtra: "Custom System Prompt Instructions",
  systemPromptExtraPlaceholder: "e.g. Always greet with 'Marhaba', prioritize refund instructions first...",
  purchaseFlowTitle: "Purchase Flow Automation",
  purchaseFlowSub: "Detect buying intent, collect order details, and forward confirmed purchases to support.",
  purchaseFlowEnabled: "Enable purchase flow",
  purchaseCollectQuantity: "Collect quantity",
  purchaseCollectAddress: "Collect delivery address",
  purchaseAutoForward: "Forward confirmed orders to support",
  purchaseConfirmationRequired: "Require customer confirmation",
  purchaseSessionMinutes: "Session timeout minutes",
  purchaseCurrencyLabel: "Currency label",
  intentLlmEnabled: "Use LLM for ambiguous intent",
  intentConfidenceThreshold: "Intent confidence threshold",
  autoHandoffOnComplaint: "Auto-handoff complaints",

  // Integrations Section
  integrationsTitle: "Channel Integrations",
  telegramConfig: "Telegram Integration Setup",
  telegramToken: "Telegram Bot Token",
  whatsappConfig: "WhatsApp Business Setup (Twilio)",
  twilioSid: "Twilio Account SID",
  twilioToken: "Twilio Auth Token",
  twilioNumber: "Twilio WhatsApp Number",
  whatsappActive: "WhatsApp Channel Active",
  telegramActive: "Telegram Bot Active",

  // Billing / Subscription
  billingTitle: "B2B Subscription Plan",
  billingSub: "Manage message limits and usage caps.",
  upgradeTitle: "Upgrade Your Plan",
  upgradeSubtitle: "Unlock more messages, channels, and priority support as your team grows.",
  compareAllPlans: "Compare all plans",
  currentPlanTitle: "Current subscription",
  currentPlanSub: "Your plan controls monthly AI message capacity and priority support features.",
  proPlanCta: "Subscribe to Pro",
  planSaved: "Subscription updated.",
  planSaveError: "Could not update subscription. Please try again.",
  planFreeName: "Free",
  planFreePrice: "$0 / month",
  planFreeDesc: "For trying clientMORE with a small knowledge base.",
  pricingStartFree: "Start free",
  planFreeLimit: "50 AI Messages/month",
  planPro: "Pro Tier",
  planUltra: "Ultra Tier",
  activePlan: "Active Plan",
  proPrice: "$500 / month",
  ultraPrice: "$1,500 / month",
  proLimit: "500 AI Messages/month",
  ultraLimit: "1,500 AI Messages/month",
  planProDesc: "For growing businesses that need full omnichannel support.",
  pricingGetPro: "Get Pro",
  planUltraDesc: "For high-volume teams with priority needs.",
  pricingGetUltra: "Get Ultra",
  featBilingualRag: "Bilingual Arabic & English RAG",
  featOmnichannel: "Omnichannel: Web, WhatsApp & Telegram",
  featChromaVector: "ChromaDB vector knowledge base",
  featHumanHandoff: "Seamless human handoff",
  featAnalyticsDash: "Analytics dashboard",
  featAllProBenefits: "All Pro benefits",
  featSlaGuarantee: "SLA uptime guarantee",
  featPriorityHandoff: "Priority human handoff routing",
  pricingPageTitle: "Plans that scale with your support",
  pricingPageSubtitle: "Start free, then upgrade as your conversations grow. No hidden fees.",
  pricingFooterNote: "All plans include bilingual support and a 14-day money-back guarantee.",
  usageRatio: "Usage this month: {used} of {limit} messages",
  upgradeToUltra: "Upgrade to Ultra",
  downgradeToPro: "Switch to Pro",

  // Chat Widget
  widgetGreeting: "Hello! I am clientMORE, your AI support advisor. How can I help you today?",
  widgetGreetingAr: "مرحباً! أنا نصيح، مستشارك الذكي للدعم الفني. كيف يمكنني مساعدتك اليوم؟",
  widgetPlaceholder: "Ask a question about our services...",
  widgetInputPlaceholderAr: "اكتب سؤالك هنا عن خدماتنا...",
  aiSearching: "clientMORE is retrieving info...",
  aiSearchingAr: "نصيح يبحث في قاعدة المعرفة...",
  widgetTriggerMessage: "Chat with clientMORE",
  widgetEscalated: "You have been connected to a human agent. We will respond shortly.",
  widgetEscalatedAr: "تم تحويلك إلى موظف الدعم البشري. سنرد عليك قريباً.",
  botBadge: "AI Agent",
  humanBadge: "Human Agent",

  // Web Widget Integration Section
  widgetIntegrationTitle: "Web Widget Integration",
  widgetIntegrationSub: "Inject the AI support assistant into any external website by copy-pasting the script below.",
  widgetScriptLabel: "Recommended: Floating Widget Script (CDN Mode)",
  widgetIframeLabel: "Alternative: Inline Iframe (Fixed container)",
  copySnippet: "Copy Integration Snippet",
  copied: "Copied!",
  widgetIntegrationInstructions: "Paste this snippet right before the closing </body> tag of your target HTML page. The script will automatically add a floating chat bubble in the bottom-right corner of your site.",

  // ─── Landing — Navigation ───
  navHome: "Home",
  navFeatures: "Features",
  navHowItWorks: "How it works",
  navPricing: "Pricing",
  navFaq: "FAQ",
  navLogin: "Log in",
  navGetStarted: "Get started",

  // ─── Landing — Hero ───
  heroBadge: "AI support that never sleeps",
  heroTitle: "Reply to your customers instantly, around the clock, with effortless efficiency.",
  heroSubtitle: "An AI platform that learns from your documents and answers your customers in Arabic and English — across every channel, in seconds.",
  heroCtaPrimary: "Start free with clientMORE",
  heroCtaSecondary: "See how it works",
  heroTrustedBy: "Built for web chat, WhatsApp, Telegram, and support teams",
  heroResponseTime: "Median response time",

  // ─── Landing — Features ───
  featuresEyebrow: "Built to scale your support",
  featuresTitle: "Features designed to lift your team and delight your customers.",
  featuresSubtitle: "Everything you need to turn customer questions into resolved conversations.",
  featInstantTitle: "Always-on instant replies",
  featInstantDesc: "Your AI agent answers in seconds, 24/7, so no customer waits in a queue again.",
  featOmnichannelTitle: "Omnichannel reach",
  featOmnichannelDesc: "One brain across web widget, WhatsApp, and Telegram — consistent answers everywhere.",
  featHandoffTitle: "Seamless human handoff",
  featHandoffDesc: "When confidence drops, conversations escalate smoothly to your team with full context.",
  featAnalyticsTitle: "Actionable analytics",
  featAnalyticsDesc: "Track deflection, CSAT, and savings to make smarter support decisions.",
  featUxTitle: "Polished UX/UI",
  featUxDesc: "A clean, fast, bilingual experience your customers actually enjoy using.",
  featSecurityTitle: "Enterprise-grade security",
  featSecurityDesc: "Tenant isolation, audit trails, and privacy by design protect your data.",

  // ─── Landing — How it works ───
  howEyebrow: "Live in days, not months",
  howTitle: "Go live in three simple, no-code steps.",
  howStep1Title: "Integrate",
  howStep1Desc: "Connect your channels and embed the widget with a single snippet.",
  howStep2Title: "Train",
  howStep2Desc: "Upload your documents — clientMORE learns your business automatically.",
  howStep3Title: "Launch",
  howStep3Desc: "Go live and start resolving customer questions instantly.",

  // ─── Landing — Pricing ───
  pricingEyebrow: "Simple, transparent pricing",
  pricingTitle: "Invest in growth that scales with you.",
  pricingSubtitle: "Choose the plan that fits your stage. Upgrade anytime.",
  pricingPerMonth: "/ month",
  pricingMostPopular: "Most popular",
  planStarterName: "Starter",
  planStarterPrice: "$49",
  planStarterDesc: "For small teams getting started with AI support.",
  planGrowthName: "Growth",
  planGrowthPrice: "$99",
  planGrowthDesc: "For growing teams that need more power and channels.",
  planEnterpriseName: "Enterprise",
  planEnterprisePrice: "Custom",
  planEnterpriseDesc: "For organizations with advanced security and scale needs.",
  pricingFeatInstant: "Instant AI replies",
  pricingFeatChannels: "Multi-channel support",
  pricingFeatAnalytics: "Advanced analytics",
  pricingFeatHandoff: "Human handoff",
  pricingFeatPriority: "Priority support",
  pricingFeatSso: "SSO & dedicated success manager",
  pricingChoosePlan: "Choose plan",
  pricingContactSales: "Contact sales",

  // ─── Landing — FAQ ───
  faqEyebrow: "Answers, made transparent",
  faqTitle: "Questions we get asked the most.",
  faqQ1: "How long does it take to go live?",
  faqA1: "Most teams are up and running within a day — connect a channel, upload your docs, and launch.",
  faqQ2: "Which channels are supported?",
  faqA2: "Web widget, WhatsApp, and Telegram today, with more on the way.",
  faqQ3: "Does it support Arabic?",
  faqA3: "Yes — clientMORE is natively bilingual (Arabic & English) with full RTL support.",
  faqQ4: "How is my data handled?",
  faqA4: "Your data is tenant-isolated, encrypted, and never used to train shared models.",

  // ─── Landing — Final CTA ───
  ctaTitle: "Ready to level up your customer service?",
  ctaSubtitle: "Join the teams delivering instant, on-brand support with clientMORE.",
  ctaButton: "Get started now",

  // ─── Landing — Footer ───
  footerTagline: "The bilingual AI customer-support agent that scales with your business.",
  footerProduct: "Product",
  footerLegal: "Legal",
  footerContact: "Contact us",
  footerPrivacy: "Privacy Policy",
  footerTerms: "Terms of Service",
  footerRights: "All rights reserved.",

  // ─── Welcome / Auth ───
  welcomeTitle: "Welcome to MORE",
  welcomeSubtitle: "Automate your customer service with advanced AI. Start your journey toward higher efficiency and unmatched satisfaction.",
  signInBtn: "Sign in",
  createAccountBtn: "Create a new account",
  orExplore: "or explore the platform",
  takeTour: "Take a guided tour",
  welcomeSlideTitle: "The future of customer service",
  welcomeSlideText: "Unleash the power of AI to deliver exceptional experiences to your customers, around the clock.",
  authNotConfiguredTitle: "Authentication isn't configured",
  authNotConfiguredText: "Sign-in is unavailable in this environment. You can still explore the platform.",
  backToWelcome: "Back to welcome",
  goToDashboard: "Explore the dashboard",

  // Super Admin Portal
  superAdminTitle: "Super Admin Portal",
  superAdminSubtitle: "Global system monitoring, tenant subscription provisioning, and system resource health.",
  tabOverview: "Monitoring & KPI",
  tabSubscriptions: "Tenants & Subscriptions",
  metricTotalTenants: "Active Tenants",
  metricTotalMRR: "Estimated MRR",
  metricGlobalMessages: "Total AI Messages",
  metricSystemHealth: "System Health",
  healthHealthy: "All Systems Operational",
  healthWarning: "System Alert Active",
  cpuUsage: "CPU Utilization",
  memoryUsage: "Memory Allocation",
  dbLatency: "DB Query Latency",
  llmLatency: "LLM API Latency",
  createSubscription: "Create Subscription",
  deactivateBtn: "Deactivate",
  activateBtn: "Activate",
  tenantNameCol: "Tenant / Company Name",
  tenantEmailCol: "Admin Email",
  tenantPlanCol: "Plan Tier",
  tenantStatusCol: "Status",
  tenantUsageCol: "Usage (This Month)",
  tenantActionsCol: "Actions",
  createSubscriptionSuccess: "Subscription created successfully!",
  deactivatedSuccess: "Subscription deactivated.",
  activatedSuccess: "Subscription activated.",
  noTenants: "No subscriptions found matching filters.",
  allPlans: "All Plans",
  filterStatus: "Filter Status",
  searchPlaceholder: "Search tenants by name or email...",

  // Auth Forms
  emailLabel: "Email Address",
  passwordLabel: "Password",
  confirmPasswordLabel: "Confirm Password",
  nameLabel: "Full Name",
  continueWithGoogle: "Continue with Google",
  continueWithApple: "Continue with Apple",
  signUpWithGoogle: "Sign up with Google",
  signUpWithApple: "Sign up with Apple",
  signInSuccess: "Signing in...",
  signUpSuccess: "Creating account...",
  dontHaveAccount: "Don't have an account? Create one",
  alreadyHaveAccount: "Already have an account? Sign in",
  requiredFields: "Please fill in all fields",
  passwordsDontMatch: "Passwords do not match",

  // ─── More Response Landing Additions ───
  navAbout: "About Us",
  navShowcase: "Showcase",
  aboutTitle: "Who We Are",
  aboutSubtitle: "Discover the leading platform in managing and automating digital replies for businesses",
  aboutTextP1: "More Response is an integrated cloud SaaS system designed to bridge the gap between businesses and their customers. We designed this platform to enable entrepreneurs, medical clinic owners, schools, and e-commerce stores to configure 100% automated instant reply channels.",
  aboutTextP2: "Through advanced AI algorithms and direct gateway integrations with WhatsApp API and SMS gateways, we process thousands of customer inquiries, bookings, and instant replies with high accuracy and speed without distracting your team.",
  aboutCardTitle: "Secure and stable by 99.98%",
  aboutCardDesc: "Our infrastructure relies on distributing databases across multiple sharding nodes to ensure maximum privacy and speed in different countries and sectors.",
  showcaseTitle: "A Tour inside the Control Panel",
  showcaseSubtitle: "See how the smart admin dashboard looks for managing your client subscriptions and allocating tasks",
  showcaseOverviewTab: "General Dashboard",
  showcaseClientsTab: "Clients Directory",
  showcaseAnalyticsTab: "Advanced Analytics",
  showcaseKpiClients: "Total Clients",
  showcaseKpiMRR: "Monthly Recurring Revenue",
  showcaseKpiMsgs: "Consumed Messages",
  showcaseKpiStability: "Automation Server Stability",
  showcaseRecentSubscribers: "Latest Subscribers on the Platform",
  showcaseLiveUpdate: "Live Update",
  showcaseColName: "Company / Client Name",
  showcaseColSpecialty: "Sector",
  showcaseColPlan: "Subscription Plan",
  showcaseColStatus: "Account Status",
  showcaseColOwner: "Owner / Manager",
  showcaseColNode: "Shared Server",
  showcaseColActions: "Support Actions",
  showcaseKpiAvgResponse: "Average API Response",
  showcaseKpiFailureRate: "Delivery Failure Rate",
  showcaseKpiPeakVolume: "Peak Message Volume",
  showcaseChartTitle: "Message Channel Consumption (Recent Months)",
  showcaseChartMonth3: "March",
  showcaseChartMonth4: "April",
  showcaseChartMonth5: "May",
  showcaseChartSms: "SMS",
  showcaseChartEmail: "Email",
  pricingPlanBasic: "Basic Plan",
  pricingPlanPremium: "Premium Plan",
  pricingPlanEnterprise: "Enterprise Plan",
  pricingBasicPrice: "$99",
  pricingPremiumPrice: "$199",
  pricingEnterprisePrice: "$399",
  pricingBasicDesc: "For small teams starting out with AI customer support.",
  pricingPremiumDesc: "For growing teams that need more channels and advanced AI capabilities.",
  pricingEnterpriseDesc: "For large organizations requiring custom scaling and hosting.",
  pricingFeatureMsgs: "{limit} automated messages / month",
  pricingFeatureAdmins: "{count} support channel managers",
  pricingFeatureDashboard: "Dashboard and general statistics",
  pricingFeatureNodes: "Connection of one database server node",
  pricingFeatureAdvancedChatbot: "Advanced AI-powered interactive chatbot",
  pricingFeaturePrioritySupport: "Advanced analytics and dedicated support channel",
  pricingFeatureUnlimitedAdmins: "Unlimited support channel managers",
  pricingFeatureDedicatedServer: "Fully dedicated hosting and server",
  pricingFeatureCustomApi: "Custom API & webhook integrations",
  faqQ5: "Where are chat logs and customer databases hosted?",
  faqA5: "We host and distribute data securely across regional database nodes (such as Frankfurt, Amman, and Manama). This helps minimize response latency to 124ms and ensures full compliance with local data protection regulations.",
};

// Arabic may omit keys; the `t()` lookup falls back to English for any missing key.
const translationsAr: Partial<Translations> = {
  // Sidebar & Navigation
  dashboard: "لوحة التحكم",
  files: "قاعدة المعرفة",
  handoffs: "طلبات التحويل للبشر",
  billingNav: "الفوترة",
  settings: "الإعدادات والملف الشخصي",
  widgetPreview: "معاينة المساعد الذكي",
  adminPanel: "لوحة تحكم نصيح",
  builtInGaza: "صُنع في غزة · وُزّع عالمياً",
  logout: "تسجيل الخروج",

  // Notifications
  notifications: "الإشعارات",
  markAllRead: "تعليم الكل كمقروء",
  noNotifications: "لا توجد إشعارات بعد",
  unread: "غير مقروء",
  handoffNotificationLowConfidence: "سؤال بثقة منخفضة يحتاج مراجعة",
  handoffNotificationComplaint: "شكوى عميل تم تصعيدها",
  handoffNotificationSupportRequest: "طلب دعم تم تصعيده",
  handoffNotificationUnsafe: "سؤال غير آمن أو غير مجاب تم تصعيده",

  // General Status
  active: "نشط",
  inactive: "غير نشط",
  connected: "متصل",
  disconnected: "غير متصل",
  loading: "جاري التحميل...",
  saving: "جاري الحفظ...",
  saved: "تم الحفظ بنجاح",
  save: "حفظ التغييرات",
  status: "الحالة",
  action: "الإجراء",
  resolved: "تم الحل",
  open: "مفتوح",
  pending: "معلق",
  failed: "فشل",
  completed: "مكتمل",
  processing: "جاري المعالجة",
  all: "الكل",

  // Dashboard Page
  analyticsTitle: "تحليلات الأعمال ومؤشرات الأداء",
  analyticsSub: "راقب معدلات توجيه الأسئلة واستخدام القنوات والتوفير المالي لاتخاذ قرارات الدعم.",
  kpiTotalQuestions: "إجمالي الأسئلة",
  kpiAnswerRate: "معدل حل الذكاء الاصطناعي",
  kpiUnanswered: "أسئلة لم يتم الإجابة عليها",
  kpiHandoffs: "التحويلات للدعم البشري",
  kpiDeflectionRate: "معدل توفير الخدمة ذاتياً",
  kpiCostSavings: "التوفير المالي التقديري",
  kpiFeedbackScore: "تقييم رضا العملاء",
  kpiUnrepliedHandoffs: "طلبات معلقة بدون رد",
  sourceDistribution: "توزيع القنوات المستخدمة",
  topQuestions: "الأسئلة الأكثر تكراراً",
  unansweredListTitle: "الأسئلة الأخيرة غير المجابة",
  unansweredListSub: "هذه الاستفسارات انخفضت ثقة البوت بها وتحتاج لحقن إجابات جديدة يدوياً.",
  questionCol: "سؤال المستخدم",
  detectedLangCol: "اللغة المكتشفة",
  channelCol: "القناة",
  injectAnswer: "تعليم البوت / اعتماد الإجابة",
  unansweredEmpty: "ممتاز! لا توجد أسئلة غير مجابة في قائمة الانتظار.",
  confidenceScore: "درجة الثقة",
  timeAgo: "وقت الاستلام",

  // Files Ingestion Page
  filesTitle: "حقن ملفات قاعدة المعرفة",
  filesSub: "قم برفع ملفات PDF أو DOCX أو TXT أو جداول بيانات XLSX. يقوم نصيح بتحويلها إلى Markdown وتقسيمها وتخزينها كمتجهات في ChromaDB.",
  dropzoneTitle: "اسحب وأفلت الملفات هنا، أو انقر للتصفح",
  dropzoneSub: "يدعم PDF، DOCX، TXT، XLSX (الحد الأقصى 10 ميجابايت)",
  fileListTitle: "المستندات التي تمت معالجتها",
  fileListSub: "ملفات المعرفة المستخدمة حالياً لتوليد الإجابات الذكية (RAG).",
  fileName: "اسم الملف",
  fileSize: "الحجم",
  chunksCreated: "أجزاء المتجهات Chunks",
  uploadDate: "تاريخ الحقن",
  deleteFile: "حذف",
  uploadSuccess: "تم رفع الملف ومعالجته بنجاح!",

  // Handoff Page
  handoffsTitle: "طابور الدعم البشري",
  handoffsSub: "متابعة المحادثات والتدخل البشري المباشر مع مستخدمي تليجرام، واتساب، والموقع الإلكتروني.",
  unrepliedOnly: "عرض غير المجاب عليه فقط",
  noHandoffs: "لا توجد طلبات تحويل نشطة في هذه القناة.",
  chatHistory: "سجل المحادثة",
  reason: "سبب التحويل",
  userLanguage: "اللغة المفضلة",
  replyPlaceholder: "اكتب رسالتك لإرسالها مباشرة إلى المستخدم...",
  sendReply: "إرسال الرسالة",
  resolveHandoff: "حل المشكلة وإغلاق الجلسة",
  addToKb: "أضف إلى قاعدة المعرفة",
  addedToKb: "تمت الإضافة إلى قاعدة المعرفة — سيجيب البوت على هذا في المرة القادمة.",
  lowConfidence: "ثقة منخفضة للذكاء الاصطناعي",
  userRequested: "طلب المستخدم التحدث مع بشري",
  keywordTriggered: "كلمة مفتاحية استدعت التدخل",
  channelTelegram: "بوت تليجرام",
  channelWhatsapp: "واتساب Business",
  channelWidget: "المساعد للموقع",
  activeChat: "محادثة نشطة مع {name}",
  purchaseComplete: "طلب شراء",
  complaintReason: "شكوى عميل",
  supportRequestReason: "طلب دعم",
  purchaseDetails: "تفاصيل الطلب",
  productName: "المنتج",
  quantity: "الكمية",
  deliveryAddress: "عنوان التوصيل",
  orderStatus: "حالة الطلب",

  // Settings & Tenant Config Page
  settingsTitle: "لوحة تحكم المساعد نصيح",
  settingsSub: "قم بتخصيص سلوك البوت، إعداد قنوات الاتصال النشطة، وإدارة اشتراكك التجاري.",
  tenantSection: "ملف المنشأة والمساعد الذكي",
  companyName: "اسم الشركة",
  botName: "اسم المساعد الذكي",
  companyLogo: "شعار الشركة",
  uploadLogo: "تحميل الشعار",
  dragDropOrClick: "اسحب وأفلت شعارك هنا، أو انقر للتصفح",
  fileRequirements: "يدعم صيغ PNG, JPEG, SVG, WebP (الحد الأقصى 2 ميجابايت)",
  logoSizeError: "يجب أن يكون حجم الشعار أقل من 2 ميجابايت",
  logoTypeError: "يسمح فقط بملفات الصور (PNG, JPEG, SVG, WebP)",
  useUrlInstead: "استخدام رابط بدلاً من ذلك",
  useUploadInstead: "تحميل صورة بدلاً من ذلك",
  removeLogo: "إزالة الشعار",
  botTone: "نبرة المحادثة",
  toneProfessional: "مهني ودقيق",
  toneFriendly: "ودود ومتحمس",
  toneFormal: "رسمي وشركاتي",
  systemPromptExtra: "تعليمات إضافية للمساعد (System Prompt)",
  systemPromptExtraPlaceholder: "مثال: رحب دائماً بـ 'مرحباً'، أعطِ الأولوية لتعليمات الاسترجاع والدعم الفني أولاً...",
  purchaseFlowTitle: "أتمتة مسار الشراء",
  purchaseFlowSub: "اكتشف نية الشراء، اجمع تفاصيل الطلب، وحوّل الطلبات المؤكدة للدعم.",
  purchaseFlowEnabled: "تفعيل مسار الشراء",
  purchaseCollectQuantity: "جمع الكمية",
  purchaseCollectAddress: "جمع عنوان التوصيل",
  purchaseAutoForward: "تحويل الطلبات المؤكدة للدعم",
  purchaseConfirmationRequired: "طلب تأكيد العميل",
  purchaseSessionMinutes: "مهلة الجلسة بالدقائق",
  purchaseCurrencyLabel: "اسم العملة",
  intentLlmEnabled: "استخدام نموذج اللغة للنوايا الغامضة",
  intentConfidenceThreshold: "حد ثقة النية",
  autoHandoffOnComplaint: "تحويل الشكاوى تلقائياً",

  // Integrations Section
  integrationsTitle: "قنوات الربط والاتصال",
  telegramConfig: "إعداد ربط تليجرام (Telegram Bot)",
  telegramToken: "رمز البوت (Bot Token)",
  whatsappConfig: "إعداد ربط واتساب (Twilio)",
  twilioSid: "معرف الحساب (Account SID)",
  twilioToken: "رمز المصادقة (Auth Token)",
  twilioNumber: "رقم واتساب Twilio المعتمد",
  whatsappActive: "تفعيل قناة واتساب",
  telegramActive: "تفعيل بوت تليجرام",

  // Billing / Subscription
  billingTitle: "باقات اشتراك الأعمال B2B",
  billingSub: "إدارة حدود الرسائل والترقية الفورية.",
  upgradeTitle: "ترقية باقتك",
  upgradeSubtitle: "احصل على رسائل وقنوات ودعم ذي أولوية أكثر مع نمو فريقك.",
  compareAllPlans: "قارن جميع الباقات",
  currentPlanTitle: "الاشتراك الحالي",
  currentPlanSub: "تحدد باقتك سعة رسائل الذكاء الاصطناعي الشهرية ومزايا الدعم ذات الأولوية.",
  proPlanCta: "الاشتراك في Pro",
  planSaved: "تم تحديث الاشتراك.",
  planSaveError: "تعذر تحديث الاشتراك. حاول مرة أخرى.",
  planFreeName: "المجانية (Free)",
  planFreePrice: "$0",
  planFreeDesc: "لتجربة clientMORE مع قاعدة معرفة صغيرة.",
  pricingStartFree: "ابدأ مجاناً",
  planFreeLimit: "50 رسالة ذكاء اصطناعي/شهرياً",
  planPro: "الباقة الاحترافية (Pro)",
  planUltra: "الباقة القصوى (Ultra)",
  activePlan: "الباقة المفعلة حالياً",
  proPrice: "$500 / شهرياً",
  ultraPrice: "$1,500 / شهرياً",
  proLimit: "500 رسالة ذكاء اصطناعي/شهرياً",
  ultraLimit: "1,500 رسالة ذكاء اصطناعي/شهرياً",
  planProDesc: "للأعمال المتنامية التي تحتاج دعماً متعدد القنوات بالكامل.",
  pricingGetPro: "اشترك في الاحترافية",
  planUltraDesc: "للفرق ذات الحجم الكبير والاحتياجات ذات الأولوية.",
  pricingGetUltra: "اشترك في القصوى",
  featBilingualRag: "ذكاء اصطناعي ثنائي اللغة (عربي وإنجليزي)",
  featOmnichannel: "متعدد القنوات: الموقع وواتساب وتليجرام",
  featChromaVector: "قاعدة معرفة متجهية ChromaDB",
  featHumanHandoff: "تحويل سلس للموظف البشري",
  featAnalyticsDash: "لوحة تحليلات",
  featAllProBenefits: "جميع مزايا الباقة الاحترافية",
  featSlaGuarantee: "ضمان مستوى خدمة (SLA)",
  featPriorityHandoff: "توجيه التحويل البشري ذو الأولوية",
  pricingPageTitle: "باقات تتوسّع مع حجم دعمك",
  pricingPageSubtitle: "ابدأ مجاناً، ثم ترقَّ مع نمو محادثاتك. بدون رسوم خفية.",
  pricingFooterNote: "جميع الباقات تشمل دعماً ثنائي اللغة وضمان استرداد خلال 14 يوماً.",
  usageRatio: "معدل الاستخدام هذا الشهر: {used} من أصل {limit} رسالة",
  upgradeToUltra: "الترقية للباقة القصوى",
  downgradeToPro: "التحويل للباقة الاحترافية",

  // Chat Widget
  widgetGreeting: "مرحباً! أنا نصيح، مستشارك الذكي للدعم الفني. كيف يمكنني مساعدتك اليوم؟",
  widgetGreetingAr: "مرحباً! أنا نصيح، مستشارك الذكي للدعم الفني. كيف يمكنني مساعدتك اليوم؟",
  widgetPlaceholder: "طرح سؤال حول خدماتنا...",
  widgetInputPlaceholderAr: "اكتب سؤالك هنا عن خدماتنا...",
  aiSearching: "نصيح يبحث في قاعدة المعرفة...",
  aiSearchingAr: "نصيح يبحث في قاعدة المعرفة...",
  widgetTriggerMessage: "تحدث مع نصيح",
  widgetEscalated: "تم تحويلك إلى موظف الدعم البشري. سنرد عليك قريباً.",
  widgetEscalatedAr: "تم تحويلك إلى موظف الدعم البشري. سنرد عليك قريباً.",
  botBadge: "مساعد ذكي",
  humanBadge: "دعم بشري",

  // Web Widget Integration Section
  widgetIntegrationTitle: "ربط المساعد في الموقع الإلكتروني",
  widgetIntegrationSub: "قم بربط مساعد الدعم الذكي في أي موقع خارجي بنسخ ولصق الكود البرمجي أدناه.",
  widgetScriptLabel: "موصى به: كود المساعد العائم (وضع CDN)",
  widgetIframeLabel: "بديل: كود الإطار المباشر (Iframe)",
  copySnippet: "نسخ كود الربط",
  copied: "تم النسخ!",
  widgetIntegrationInstructions: "ضع هذا الكود مباشرة قبل وسم الإغلاق </body> في صفحة موقعك. سيقوم الكود تلقائياً بإضافة زر الدردشة العائم في الزاوية السفلية اليمنى لموقعك.",

  // ─── Landing — Navigation ───
  navHome: "الرئيسية",
  navFeatures: "المميزات",
  navHowItWorks: "آلية العمل",
  navPricing: "الأسعار",
  navFaq: "الأسئلة الشائعة",
  navLogin: "تسجيل الدخول",
  navGetStarted: "ابدأ الآن",

  // ─── Landing — Hero ───
  heroBadge: "ذكاء اصطناعي لا ينام",
  heroTitle: "ردّ فوري لعملائك، على مدار الساعة، وبأعلى كفاءة تشغيلية.",
  heroSubtitle: "منصة ذكاء اصطناعي تتعلّم من مستنداتك وتُجيب عملاءك بالعربية والإنجليزية — عبر جميع القنوات، في ثوانٍ.",
  heroCtaPrimary: "ابدأ مجاناً مع clientMORE",
  heroCtaSecondary: "تعرّف على آلية العمل",
  heroTrustedBy: "مصمم لدردشة الموقع وواتساب وتليجرام وفرق الدعم",
  heroResponseTime: "متوسط زمن الرد",

  // ─── Landing — Features ───
  featuresEyebrow: "مصمم لينمو مع دعمك",
  featuresTitle: "مميزات صُممت لرفع كفاءة فريقك وإسعاد عملائك.",
  featuresSubtitle: "كل ما تحتاجه لتحويل أسئلة العملاء إلى محادثات تم حلها.",
  featInstantTitle: "ردود فورية مستمرة",
  featInstantDesc: "يجيب مساعدك الذكي خلال ثوانٍ، على مدار الساعة، فلا ينتظر أي عميل في طابور.",
  featOmnichannelTitle: "حضور متعدد القنوات",
  featOmnichannelDesc: "عقل واحد عبر المساعد على الموقع وواتساب وتليجرام — إجابات متّسقة في كل مكان.",
  featHandoffTitle: "تحويل سلس للموظف البشري",
  featHandoffDesc: "عند انخفاض الثقة، تُحوَّل المحادثات بسلاسة إلى فريقك مع كامل سياق المحادثة.",
  featAnalyticsTitle: "تحليلات قابلة للتنفيذ",
  featAnalyticsDesc: "تتبّع معدلات التوفير ورضا العملاء والوفورات لاتخاذ قرارات دعم أذكى.",
  featUxTitle: "تجربة استخدام متقنة",
  featUxDesc: "تجربة نظيفة وسريعة وثنائية اللغة يستمتع عملاؤك باستخدامها فعلاً.",
  featSecurityTitle: "أمان بمستوى المؤسسات",
  featSecurityDesc: "عزل المستأجرين وسجلّات التدقيق والخصوصية بالتصميم تحمي بياناتك.",

  // ─── Landing — How it works ───
  howEyebrow: "انطلق خلال أيام لا شهور",
  howTitle: "انطلق في ثلاث خطوات بسيطة دون أي برمجة.",
  howStep1Title: "الربط",
  howStep1Desc: "اربط قنواتك وأضف المساعد إلى موقعك بسطر واحد فقط.",
  howStep2Title: "التدريب",
  howStep2Desc: "ارفع مستنداتك — يتعلّم clientMORE تفاصيل عملك تلقائياً.",
  howStep3Title: "الإطلاق",
  howStep3Desc: "انطلق مباشرةً وابدأ بحلّ أسئلة العملاء فوراً.",

  // ─── Landing — Pricing ───
  pricingEyebrow: "أسعار بسيطة وشفافة",
  pricingTitle: "استثمر في نمو يتوسّع مع حجم أعمالك.",
  pricingSubtitle: "اختر الباقة التي تناسب مرحلتك. يمكنك الترقية في أي وقت.",
  pricingPerMonth: "/ شهرياً",
  pricingMostPopular: "الأكثر شيوعاً",
  planStarterName: "الأساسية (Starter)",
  planStarterPrice: "$49",
  planStarterDesc: "للفرق الصغيرة التي تبدأ رحلتها مع دعم الذكاء الاصطناعي.",
  planGrowthName: "النمو (Growth)",
  planGrowthPrice: "$99",
  planGrowthDesc: "للفرق المتنامية التي تحتاج قوة وقنوات أكثر.",
  planEnterpriseName: "الشركات (Enterprise)",
  planEnterprisePrice: "مخصّص",
  planEnterpriseDesc: "للمؤسسات ذات احتياجات الأمان والتوسّع المتقدمة.",
  pricingFeatInstant: "ردود ذكاء اصطناعي فورية",
  pricingFeatChannels: "دعم متعدد القنوات",
  pricingFeatAnalytics: "تحليلات متقدمة",
  pricingFeatHandoff: "تحويل للموظف البشري",
  pricingFeatPriority: "دعم ذو أولوية",
  pricingFeatSso: "تسجيل دخول موحّد ومدير نجاح مخصّص",
  pricingChoosePlan: "اختر الباقة",
  pricingContactSales: "تواصل مع المبيعات",

  // ─── Landing — FAQ ───
  faqEyebrow: "إجابات بكل شفافية",
  faqTitle: "الأسئلة التي تُطرح علينا أكثر من غيرها.",
  faqQ1: "كم يستغرق الإطلاق حتى نبدأ العمل؟",
  faqA1: "معظم الفرق تنطلق خلال يوم واحد — اربط قناة، ارفع مستنداتك، ثم أطلق.",
  faqQ2: "ما القنوات التي يدعمها؟",
  faqA2: "المساعد على الموقع وواتساب وتليجرام حالياً، والمزيد قادم.",
  faqQ3: "هل يدعم اللغة العربية بشكل كامل؟",
  faqA3: "نعم — clientMORE ثنائي اللغة أصلاً (عربي وإنجليزي) مع دعم كامل للكتابة من اليمين لليسار.",
  faqQ4: "كيف يتم التعامل مع بياناتي؟",
  faqA4: "بياناتك معزولة لكل مستأجر ومشفّرة، ولا تُستخدم أبداً لتدريب نماذج مشتركة.",

  // ─── Landing — Final CTA ───
  ctaTitle: "مستعد للارتقاء بمستوى خدمة عملائك؟",
  ctaSubtitle: "انضم إلى الفرق التي تقدّم دعماً فورياً بهوية علامتها مع clientMORE.",
  ctaButton: "ابدأ الآن",

  // ─── Landing — Footer ───
  footerTagline: "مساعد خدمة العملاء الذكي ثنائي اللغة الذي ينمو مع أعمالك.",
  footerProduct: "روابط سريعة",
  footerLegal: "قانوني",
  footerContact: "تواصل معنا",
  footerPrivacy: "سياسة الخصوصية",
  footerTerms: "شروط الخدمة",
  footerRights: "جميع الحقوق محفوظة.",

  // ─── Welcome / Auth ───
  welcomeTitle: "مرحباً بك في MORE",
  welcomeSubtitle: "أتمت خدمة عملائك بذكاء اصطناعي متطور. ابدأ رحلتك نحو كفاءة أعلى ورضا عملاء لا مثيل له.",
  signInBtn: "تسجيل الدخول",
  createAccountBtn: "إنشاء حساب جديد",
  orExplore: "أو استكشف المنصة",
  takeTour: "خذ جولة تعريفية",
  welcomeSlideTitle: "مستقبل خدمة العملاء",
  welcomeSlideText: "أطلق العنان لقوة الذكاء الاصطناعي لتقديم تجارب استثنائية لعملائك، على مدار الساعة.",
  authNotConfiguredTitle: "لم يتم إعداد المصادقة",
  authNotConfiguredText: "تسجيل الدخول غير متاح في هذه البيئة. لا يزال بإمكانك استكشاف المنصة.",
  backToWelcome: "العودة إلى الترحيب",
  goToDashboard: "استكشف لوحة التحكم",

  // Super Admin Portal
  superAdminTitle: "بوابة المشرف العام",
  superAdminSubtitle: "مراقبة النظام العام، إعداد اشتراكات المستأجرين، وصحة موارد النظام.",
  tabOverview: "المراقبة ومؤشرات الأداء",
  tabSubscriptions: "المستأجرون والاشتراكات",
  metricTotalTenants: "المستأجرون النشطون",
  metricTotalMRR: "العائد الشهري المتوقع",
  metricGlobalMessages: "إجمالي رسائل الذكاء الاصطناعي",
  metricSystemHealth: "صحة النظام",
  healthHealthy: "جميع الأنظمة تعمل بكفاءة",
  healthWarning: "تنبيه نشط في النظام",
  cpuUsage: "استهلاك المعالج",
  memoryUsage: "تخصيص الذاكرة",
  dbLatency: "زمن استجابة قاعدة البيانات",
  llmLatency: "زمن استجابة نموذج اللغة",
  createSubscription: "إنشاء اشتراك جديد",
  deactivateBtn: "تعطيل",
  activateBtn: "تفعيل",
  tenantNameCol: "اسم الشركة / المستأجر",
  tenantEmailCol: "بريد المسؤول",
  tenantPlanCol: "باقة الاشتراك",
  tenantStatusCol: "الحالة",
  tenantUsageCol: "الاستخدام (هذا الشهر)",
  tenantActionsCol: "الإجراءات",
  createSubscriptionSuccess: "تم إنشاء الاشتراك بنجاح!",
  deactivatedSuccess: "تم تعطيل الاشتراك بنجاح.",
  activatedSuccess: "تم تفعيل الاشتراك بنجاح.",
  noTenants: "لم يتم العثور على اشتراكات مطابقة للتصفية.",
  allPlans: "كل الباقات",
  filterStatus: "تصفية الحالة",
  searchPlaceholder: "البحث عن المستأجرين بالاسم أو البريد...",

  // Auth Forms
  emailLabel: "البريد الإلكتروني",
  passwordLabel: "كلمة المرور",
  confirmPasswordLabel: "تأكيد كلمة المرور",
  nameLabel: "الاسم الكامل",
  continueWithGoogle: "المتابعة باستخدام Google",
  continueWithApple: "المتابعة باستخدام Apple",
  signUpWithGoogle: "إنشاء حساب باستخدام Google",
  signUpWithApple: "إنشاء حساب باستخدام Apple",
  signInSuccess: "جاري تسجيل الدخول...",
  signUpSuccess: "جاري إنشاء الحساب...",
  dontHaveAccount: "ليس لديك حساب؟ أنشئ حساباً جديداً",
  alreadyHaveAccount: "لديك حساب بالفعل؟ تسجيل الدخول",
  requiredFields: "يرجى ملء جميع الحقول",
  passwordsDontMatch: "كلمات المرور غير متطابقة",

  // ─── More Response Landing Additions ───
  navAbout: "من نحن",
  navShowcase: "شاشات المنصة",
  aboutTitle: "من نحن؟",
  aboutSubtitle: "تعرف على المنصة الرائدة في إدارة وأتمتة الردود الرقمية للشركات",
  aboutTextP1: "منصة مور ريبونس (More Response) هي نظام SaaS سحابي متكامل يهدف إلى حل الفجوة بين الشركات وعملائها. صممنا هذه المنصة لتمكين رواد الأعمال، وأصحاب العيادات الطبية، والمدارس، ومتاجر التجارة الإلكترونية من إعداد قنوات محادثات فورية مؤتمتة بنسبة 100%.",
  aboutTextP2: "من خلال خوارزميات الذكاء الاصطناعي وبوابة الربط المباشرة مع WhatsApp API وبوابات الرسائل القصيرة، نستطيع معالجة آلاف استفسارات العملاء وحجز المواعيد والرد الفوري بدقة متناهية وسرعة مذهلة دون تشتيت فريق عملك.",
  aboutCardTitle: "آمن ومستقر بنسبة 99.98%",
  aboutCardDesc: "تعتمد بنيتنا التحتية على توزيع قواعد البيانات على خوادم متعددة (Database Sharding Nodes) لضمان أقصى درجات حماية الخصوصية والسرعة في مختلف البلدان والقطاعات.",
  showcaseTitle: "جولة داخل لوحة التحكم",
  showcaseSubtitle: "شاهد كيف تبدو لوحة الإدارة الذكية لإدارة اشتراكات عملائك وتوزيع المهام",
  showcaseOverviewTab: "لوحة التحكم العامة",
  showcaseClientsTab: "دليل العملاء والشركات",
  showcaseAnalyticsTab: "الإحصائيات المتقدمة",
  showcaseKpiClients: "إجمالي العملاء",
  showcaseKpiMRR: "الإيراد الشهري المكرر",
  showcaseKpiMsgs: "الرسائل المستهلكة",
  showcaseKpiStability: "استقرار خادم الأتمتة",
  showcaseRecentSubscribers: "أحدث المشتركين في المنصة",
  showcaseLiveUpdate: "تحديث مباشر",
  showcaseColName: "اسم الشركة / العميل",
  showcaseColSpecialty: "القطاع",
  showcaseColPlan: "باقة الاشتراك",
  showcaseColStatus: "حالة الحساب",
  showcaseColOwner: "اسم الشركة والمسؤول",
  showcaseColNode: "الخادم المشترك",
  showcaseColActions: "إجراءات الدعم",
  showcaseKpiAvgResponse: "متوسط سرعة استجابة الـ API",
  showcaseKpiFailureRate: "نسبة فشل الإرسال",
  showcaseKpiPeakVolume: "ذروة حجم المحادثات",
  showcaseChartTitle: "مقارنة استهلاك قنوات الرسائل (الأشهر الأخيرة)",
  showcaseChartMonth3: "مارس",
  showcaseChartMonth4: "أبريل",
  showcaseChartMonth5: "مايو",
  showcaseChartSms: "الرسائل (SMS)",
  showcaseChartEmail: "البريد الإلكتروني",
  pricingPlanBasic: "الباقة الأساسية",
  pricingPlanPremium: "الباقة الممتازة",
  pricingPlanEnterprise: "الباقة المؤسسية",
  pricingBasicPrice: "$99",
  pricingPremiumPrice: "$199",
  pricingEnterprisePrice: "$399",
  pricingBasicDesc: "باقة البداية الأساسية للفرق الصغيرة التي تبدأ بالدعم الذكي.",
  pricingPremiumDesc: "الأكثر شعبية للفرق المتنامية التي تحتاج ميزات ذكاء اصطناعي وقنوات دعم إضافية.",
  pricingEnterpriseDesc: "للشركات الكبرى التي تتطلب استضافة مخصصة وتكاملات برمجية غير محدودة.",
  pricingFeatureMsgs: "{limit} رسالة مؤتمتة / شهرياً",
  pricingFeatureAdmins: "{count} من مدراء قنوات الدعم",
  pricingFeatureDashboard: "لوحة تحكم وإحصائيات عامة",
  pricingFeatureNodes: "ربط خادم قواعد بيانات واحد",
  pricingFeatureAdvancedChatbot: "روبوت محادثة تفاعلي متقدم بالذكاء",
  pricingFeaturePrioritySupport: "تحليلات متقدمة وقناة دعم مخصصة",
  pricingFeatureUnlimitedAdmins: "عدد غير محدود من المدراء",
  pricingFeatureDedicatedServer: "خادم واستضافة مخصصة بالكامل",
  pricingFeatureCustomApi: "تكامل برمجي مخصص (Custom Webhooks)",
  faqQ5: "أين يتم استضافة بيانات المحادثات وسجل العملاء؟",
  faqA5: "نقوم بتوزيع واستضافة البيانات بشكل آمن للغاية عبر عقد قواعد البيانات الإقليمية (مثل Frankfurt وعمان والمنامة). هذا يساعد في تقليل سرعة الاستجابة إلى 124 مللي ثانية ويضمن التوافق الكامل مع قوانين حماية خصوصية البيانات المحلية.",
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations, variables?: Record<string, string | number>) => string;
  isRtl: boolean;

  // Global Mock States for Admin Config
  companyName: string;
  setCompanyName: (val: string) => void;
  botName: string;
  setBotName: (val: string) => void;
  companyLogo: string;
  setCompanyLogo: (val: string) => void;
  subscriptionPlan: "pro" | "ultra";
  setSubscriptionPlan: (val: "pro" | "ultra") => void;
  usedMessages: number;
  setUsedMessages: (val: number) => void;
  telegramToken: string;
  setTelegramToken: (val: string) => void;
  isTelegramActive: boolean;
  setIsTelegramActive: (val: boolean) => void;
  twilioSid: string;
  setTwilioSid: (val: string) => void;
  twilioToken: string;
  setTwilioToken: (val: string) => void;
  twilioNumber: string;
  setTwilioNumber: (val: string) => void;
  isWhatsappActive: boolean;
  setIsWhatsappActive: (val: boolean) => void;
  botTone: string;
  setBotTone: (val: string) => void;
  systemPromptExtra: string;
  setSystemPromptExtra: (val: string) => void;
  purchaseFlowEnabled: boolean;
  setPurchaseFlowEnabled: (val: boolean) => void;
  purchaseCollectAddress: boolean;
  setPurchaseCollectAddress: (val: boolean) => void;
  purchaseCollectQuantity: boolean;
  setPurchaseCollectQuantity: (val: boolean) => void;
  purchaseAutoForwardToSupport: boolean;
  setPurchaseAutoForwardToSupport: (val: boolean) => void;
  purchaseConfirmationRequired: boolean;
  setPurchaseConfirmationRequired: (val: boolean) => void;
  purchaseSessionMinutes: number;
  setPurchaseSessionMinutes: (val: number) => void;
  purchaseCurrencyLabel: string;
  setPurchaseCurrencyLabel: (val: string) => void;
  intentLlmEnabled: boolean;
  setIntentLlmEnabled: (val: boolean) => void;
  intentConfidenceThreshold: number;
  setIntentConfidenceThreshold: (val: number) => void;
  autoHandoffOnComplaint: boolean;
  setAutoHandoffOnComplaint: (val: boolean) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>("en");

  // Global settings mock state shared between dashboard pages and widget
  const [companyName, setCompanyName] = useState("clientMORE");
  const [botName, setBotName] = useState("clientMORE");
  const [companyLogo, setCompanyLogo] = useState("/clientmore-logo.jpeg");
  const [subscriptionPlan, setSubscriptionPlan] = useState<"pro" | "ultra">("pro");
  const [usedMessages, setUsedMessages] = useState(328);

  // Integration credentials mock state
  const [telegramToken, setTelegramToken] = useState("1823908230:AAHfjkeF8392-Jdhfj388273hGDH");
  const [isTelegramActive, setIsTelegramActive] = useState(true);
  const [twilioSid, setTwilioSid] = useState("AC73827d89abfdce2738d829392e92c28");
  const [twilioToken, setTwilioToken] = useState("8f39281e82b7c738e82d8d8c8b2938a");
  const [twilioNumber, setTwilioNumber] = useState("+14155238886");
  const [isWhatsappActive, setIsWhatsappActive] = useState(false);

  const [botTone, setBotTone] = useState("professional");
  const [systemPromptExtra, setSystemPromptExtra] = useState("Answer briefly and use bullet points where helpful.");
  const [purchaseFlowEnabled, setPurchaseFlowEnabled] = useState(true);
  const [purchaseCollectAddress, setPurchaseCollectAddress] = useState(true);
  const [purchaseCollectQuantity, setPurchaseCollectQuantity] = useState(true);
  const [purchaseAutoForwardToSupport, setPurchaseAutoForwardToSupport] = useState(true);
  const [purchaseConfirmationRequired, setPurchaseConfirmationRequired] = useState(true);
  const [purchaseSessionMinutes, setPurchaseSessionMinutes] = useState(30);
  const [purchaseCurrencyLabel, setPurchaseCurrencyLabel] = useState("ريال");
  const [intentLlmEnabled, setIntentLlmEnabled] = useState(true);
  const [intentConfidenceThreshold, setIntentConfidenceThreshold] = useState(0.7);
  const [autoHandoffOnComplaint, setAutoHandoffOnComplaint] = useState(true);

  const isRtl = language === "ar";

  useEffect(() => {
    // Dynamic html direction and class mapping
    const html = document.documentElement;
    html.setAttribute("dir", isRtl ? "rtl" : "ltr");
    html.setAttribute("lang", language);
    if (isRtl) {
      html.classList.add("rtl");
      html.classList.remove("ltr");
    } else {
      html.classList.add("ltr");
      html.classList.remove("rtl");
    }
  }, [isRtl, language]);

  // Hydrate the shared config state from the backend on mount. Keeps the
  // existing mock defaults as a fallback if the fetch fails (offline/dev).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await apiGet<SettingsOut>("/api/settings");
        if (cancelled) return;
        setCompanyName(s.companyName);
        setBotName(s.botName);
        setCompanyLogo(s.companyLogo);
        setBotTone(s.botTone);
        setSystemPromptExtra(s.systemPromptExtra);
        setTelegramToken(s.telegramToken ?? "");
        setIsTelegramActive(s.isTelegramActive);
        setTwilioSid(s.twilioSid ?? "");
        setTwilioToken(s.twilioToken ?? "");
        setTwilioNumber(s.twilioNumber ?? "");
        setIsWhatsappActive(s.isWhatsappActive);
        setPurchaseFlowEnabled(s.purchaseFlowEnabled);
        setPurchaseCollectAddress(s.purchaseCollectAddress);
        setPurchaseCollectQuantity(s.purchaseCollectQuantity);
        setPurchaseAutoForwardToSupport(s.purchaseAutoForwardToSupport);
        setPurchaseConfirmationRequired(s.purchaseConfirmationRequired);
        setPurchaseSessionMinutes(s.purchaseSessionMinutes);
        setPurchaseCurrencyLabel(s.purchaseCurrencyLabel);
        setIntentLlmEnabled(s.intentLlmEnabled);
        setIntentConfidenceThreshold(s.intentConfidenceThreshold);
        setAutoHandoffOnComplaint(s.autoHandoffOnComplaint);
        if (s.subscriptionPlan === "pro" || s.subscriptionPlan === "ultra") {
          setSubscriptionPlan(s.subscriptionPlan);
        }
        setUsedMessages(s.usedMessages);
      } catch {
        /* keep mock defaults when the backend is unreachable */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const t = (key: keyof Translations, variables?: Record<string, string | number>): string => {
    const dict = language === "ar" ? translationsAr : translationsEn;
    let translation = dict[key] || translationsEn[key] || String(key);

    if (variables) {
      Object.entries(variables).forEach(([k, v]) => {
        translation = translation.replace(`{${k}}`, String(v));
      });
    }

    return translation;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isRtl,
        companyName,
        setCompanyName,
        botName,
        setBotName,
        companyLogo,
        setCompanyLogo,
        subscriptionPlan,
        setSubscriptionPlan,
        usedMessages,
        setUsedMessages,
        telegramToken,
        setTelegramToken,
        isTelegramActive,
        setIsTelegramActive,
        twilioSid,
        setTwilioSid,
        twilioToken,
        setTwilioToken,
        twilioNumber,
        setTwilioNumber,
        isWhatsappActive,
        setIsWhatsappActive,
        botTone,
        setBotTone,
        systemPromptExtra,
        setSystemPromptExtra,
        purchaseFlowEnabled,
        setPurchaseFlowEnabled,
        purchaseCollectAddress,
        setPurchaseCollectAddress,
        purchaseCollectQuantity,
        setPurchaseCollectQuantity,
        purchaseAutoForwardToSupport,
        setPurchaseAutoForwardToSupport,
        purchaseConfirmationRequired,
        setPurchaseConfirmationRequired,
        purchaseSessionMinutes,
        setPurchaseSessionMinutes,
        purchaseCurrencyLabel,
        setPurchaseCurrencyLabel,
        intentLlmEnabled,
        setIntentLlmEnabled,
        intentConfidenceThreshold,
        setIntentConfidenceThreshold,
        autoHandoffOnComplaint,
        setAutoHandoffOnComplaint,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
