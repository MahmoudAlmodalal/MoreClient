// Hand-rolled i18n dictionary (EN/AR). Arabic may omit keys; the t() lookup in
// LanguageProvider falls back to English for anything missing.

export type Language = "en" | "ar";

export const translationsEn = {
  // Brand / shell
  appName: "clientMORE",
  builtInGaza: "Built in Gaza · Deployed Globally",

  // Navigation
  dashboard: "Dashboard",
  files: "Knowledge Base",
  handoffs: "Handoff Queue",
  settings: "Settings",

  // General status
  loading: "Loading...",
  saving: "Saving...",
  saved: "Saved Successfully",
  save: "Save Changes",
  retry: "Retry",
  status: "Status",
  action: "Action",
  failed: "Failed",
  completed: "Completed",
  processing: "Processing",
  all: "All",
  language: "Language",

  // Dashboard
  analyticsTitle: "Business Analytics & KPIs",
  analyticsSub: "Monitor deflection rates, channel usage, and savings.",
  kpiTotalQuestions: "Total Questions",
  kpiDeflectionRate: "Deflection Rate",
  kpiCostSavings: "Estimated Savings",
  kpiFeedbackScore: "Customer CSAT",
  topQuestions: "Top Repeated Questions",
  sourceDistribution: "Channel Source Share",
  noData: "No data to display yet.",

  // Files
  filesTitle: "Knowledge Base Ingestion",
  filesSub: "Upload PDF, DOCX, or TXT documents to train the assistant.",
  dropzoneTitle: "Drag & drop a file here, or click to browse",
  dropzoneSub: "Supports PDF, DOCX, TXT (Max 20MB)",
  fileListTitle: "Parsed Documents",
  fileName: "File Name",
  fileSize: "Size",
  fileType: "Type",
  chunksCreated: "Vector Chunks",
  uploadDate: "Date Ingested",
  deleteFile: "Delete",
  uploadSuccess: "File uploaded and processing started.",
  noFiles: "No documents ingested yet.",
  uploading: "Uploading...",

  // Handoffs
  handoffsTitle: "Human Support Queue",
  handoffsSub: "Real-time chat takeover from Telegram, WhatsApp, and Web Widget.",
  unrepliedOnly: "Unreplied only",
  noHandoffs: "No active handoff requests.",
  selectHandoff: "Select a conversation to view its history.",
  chatHistory: "Chat History",
  reason: "Escalation Reason",
  replyPlaceholder: "Type your message to send back to the user...",
  sendReply: "Send Message",
  resolveHandoff: "Resolve & Close",
  lowConfidence: "Low AI Confidence",
  userRequested: "User Requested Human",
  keywordTriggered: "Keyword Escalate",
  botBadge: "AI Agent",
  humanBadge: "Human Agent",

  // Settings
  settingsTitle: "Control Panel",
  settingsSub: "Customize bot behavior and your tenant profile.",
  tenantSection: "Tenant & Bot Profile",
  companyName: "Company Name",
  botName: "Bot Name",
  botTone: "Conversation Tone",
  toneProfessional: "Professional & Precise",
  toneFriendly: "Friendly & Enthusiastic",
  toneFormal: "Formal & Corporate",
  systemPromptExtra: "Custom System Prompt Instructions",
  systemPromptExtraPlaceholder:
    "e.g. Always greet with 'Marhaba', prioritize refund instructions first...",
  interfaceLanguage: "Interface Language",
};

export type Translations = typeof translationsEn;

export const translationsAr: Partial<Translations> = {
  appName: "clientMORE",
  builtInGaza: "صُنع في غزة · وُزّع عالمياً",

  dashboard: "لوحة التحكم",
  files: "قاعدة المعرفة",
  handoffs: "طلبات التحويل للبشر",
  settings: "الإعدادات",

  loading: "جاري التحميل...",
  saving: "جاري الحفظ...",
  saved: "تم الحفظ بنجاح",
  save: "حفظ التغييرات",
  retry: "إعادة المحاولة",
  status: "الحالة",
  action: "الإجراء",
  failed: "فشل",
  completed: "مكتمل",
  processing: "جاري المعالجة",
  all: "الكل",
  language: "اللغة",

  analyticsTitle: "تحليلات الأعمال ومؤشرات الأداء",
  analyticsSub: "راقب معدلات توجيه الأسئلة واستخدام القنوات والتوفير المالي.",
  kpiTotalQuestions: "إجمالي الأسئلة",
  kpiDeflectionRate: "معدل توفير الخدمة ذاتياً",
  kpiCostSavings: "التوفير المالي التقديري",
  kpiFeedbackScore: "تقييم رضا العملاء",
  topQuestions: "الأسئلة الأكثر تكراراً",
  sourceDistribution: "توزيع القنوات المستخدمة",
  noData: "لا توجد بيانات لعرضها بعد.",

  filesTitle: "حقن ملفات قاعدة المعرفة",
  filesSub: "ارفع ملفات PDF أو DOCX أو TXT لتدريب المساعد الذكي.",
  dropzoneTitle: "اسحب وأفلت ملفاً هنا، أو انقر للتصفح",
  dropzoneSub: "يدعم PDF، DOCX، TXT (الحد الأقصى 20 ميجابايت)",
  fileListTitle: "المستندات التي تمت معالجتها",
  fileName: "اسم الملف",
  fileSize: "الحجم",
  fileType: "النوع",
  chunksCreated: "أجزاء المتجهات",
  uploadDate: "تاريخ الحقن",
  deleteFile: "حذف",
  uploadSuccess: "تم رفع الملف وبدأت معالجته.",
  noFiles: "لم تتم إضافة أي مستندات بعد.",
  uploading: "جاري الرفع...",

  handoffsTitle: "طابور الدعم البشري",
  handoffsSub: "متابعة المحادثات والتدخل البشري المباشر عبر تليجرام وواتساب والموقع.",
  unrepliedOnly: "غير المجاب عليها فقط",
  noHandoffs: "لا توجد طلبات تحويل نشطة.",
  selectHandoff: "اختر محادثة لعرض سجلها.",
  chatHistory: "سجل المحادثة",
  reason: "سبب التحويل",
  replyPlaceholder: "اكتب رسالتك لإرسالها مباشرة إلى المستخدم...",
  sendReply: "إرسال الرسالة",
  resolveHandoff: "حل وإغلاق",
  lowConfidence: "ثقة منخفضة للذكاء الاصطناعي",
  userRequested: "طلب المستخدم التحدث مع بشري",
  keywordTriggered: "كلمة مفتاحية استدعت التدخل",
  botBadge: "مساعد ذكي",
  humanBadge: "دعم بشري",

  settingsTitle: "لوحة التحكم",
  settingsSub: "خصّص سلوك البوت وملف منشأتك.",
  tenantSection: "ملف المنشأة والمساعد الذكي",
  companyName: "اسم الشركة",
  botName: "اسم المساعد الذكي",
  botTone: "نبرة المحادثة",
  toneProfessional: "مهني ودقيق",
  toneFriendly: "ودود ومتحمس",
  toneFormal: "رسمي وشركاتي",
  systemPromptExtra: "تعليمات إضافية للمساعد",
  systemPromptExtraPlaceholder:
    "مثال: رحب دائماً بـ 'مرحباً'، أعطِ الأولوية لتعليمات الاسترجاع أولاً...",
  interfaceLanguage: "لغة الواجهة",
};
