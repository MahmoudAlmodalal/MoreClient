"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "ar";

type Translations = typeof translationsEn;

const translationsEn = {
  // Sidebar & Navigation
  dashboard: "Dashboard",
  files: "Knowledge Base",
  handoffs: "Handoff Queue",
  settings: "Settings & Profile",
  widgetPreview: "Widget Live Preview",
  adminPanel: "clientMORE Admin",
  builtInGaza: "Built in Gaza · Deployed Globally",
  logout: "Logout",

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
  filesSub: "Upload PDFs, DOCX, or TXT documents. clientMORE converts them to Markdown, chunks, and embeds them into ChromaDB.",
  dropzoneTitle: "Drag & drop files here, or click to browse",
  dropzoneSub: "Supports PDF, DOCX, TXT (Max 20MB)",
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
  lowConfidence: "Low AI Confidence",
  userRequested: "User Requested Human",
  keywordTriggered: "Keyword Escalate",
  channelTelegram: "Telegram Bot",
  channelWhatsapp: "WhatsApp",
  channelWidget: "Web Widget",
  activeChat: "Active chat with {name}",

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
  planPro: "Pro Tier",
  planUltra: "Ultra Tier",
  activePlan: "Active Plan",
  proPrice: "$500 / month",
  ultraPrice: "$1,500 / month",
  proLimit: "500 AI Messages/month",
  ultraLimit: "1,500 AI Messages/month",
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
  heroCtaSecondary: "Watch a live demo",
  heroTrustedBy: "Trusted by fast-growing teams everywhere",

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
};

// Arabic may omit keys; the `t()` lookup falls back to English for any missing key.
const translationsAr: Partial<Translations> = {
  // Sidebar & Navigation
  dashboard: "لوحة التحكم",
  files: "قاعدة المعرفة",
  handoffs: "طلبات التحويل للبشر",
  settings: "الإعدادات والملف الشخصي",
  widgetPreview: "معاينة المساعد الذكي",
  adminPanel: "لوحة تحكم نصيح",
  builtInGaza: "صُنع في غزة · وُزّع عالمياً",
  logout: "تسجيل الخروج",

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
  filesSub: "قم برفع ملفات PDF أو DOCX أو TXT. يقوم نصيح بتحويلها إلى Markdown وتقسيمها وتخزينها كمتجهات في ChromaDB.",
  dropzoneTitle: "اسحب وأفلت الملفات هنا، أو انقر للتصفح",
  dropzoneSub: "يدعم PDF، DOCX، TXT (الحد الأقصى 20 ميجابايت)",
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
  lowConfidence: "ثقة منخفضة للذكاء الاصطناعي",
  userRequested: "طلب المستخدم التحدث مع بشري",
  keywordTriggered: "كلمة مفتاحية استدعت التدخل",
  channelTelegram: "بوت تليجرام",
  channelWhatsapp: "واتساب Business",
  channelWidget: "المساعد للموقع",
  activeChat: "محادثة نشطة مع {name}",

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
  planPro: "الباقة الاحترافية (Pro)",
  planUltra: "الباقة القصوى (Ultra)",
  activePlan: "الباقة المفعلة حالياً",
  proPrice: "$500 / شهرياً",
  ultraPrice: "$1,500 / شهرياً",
  proLimit: "500 رسالة ذكاء اصطناعي/شهرياً",
  ultraLimit: "1,500 رسالة ذكاء اصطناعي/شهرياً",
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
  heroCtaSecondary: "شاهد عرضاً مباشراً",
  heroTrustedBy: "تثق بنا فرق سريعة النمو حول العالم",

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
        setSystemPromptExtra
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
