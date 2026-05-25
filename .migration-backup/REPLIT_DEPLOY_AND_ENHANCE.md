# clientMORE — دليل النشر الشامل على Replit والتحسينات

> **نسخة:** 1.0 · **التاريخ:** مايو 2026  
> وثيقة مرجعية شاملة: فكرة المشروع · شجرة الملفات · خطوات النشر · تحسينات الواجهة · أداء خفيف · إصلاح الأخطاء · تحسين RAG · تحسين التسليم البشري

---

## الفهرس

1. [فكرة المشروع — ماذا بنيت](#1-فكرة-المشروع)
2. [شجرة الملفات الكاملة](#2-شجرة-الملفات-الكاملة)
3. [دليل النشر على Replit](#3-دليل-النشر-على-replit)
4. [تحسينات الواجهة — تجربة إنسانية لا "ذكاء اصطناعي"](#4-تحسينات-الواجهة)
5. [بناء خفيف ومحسّن (Lite Mode)](#5-بناء-خفيف-ومحسن)
6. [إصلاح الأخطاء المعروفة](#6-إصلاح-الأخطاء-المعروفة)
7. [تحسين جودة RAG والردود](#7-تحسين-rag-والردود)
8. [تحسين نظام التسليم البشري (Handoff)](#8-تحسين-نظام-التسليم-البشري)

---

## 1. فكرة المشروع

### ما هو clientMORE؟

**clientMORE** هو نظام SaaS لدعم العملاء مدعوم بالذكاء الاصطناعي، مصمم للشركات (B2B) التي تريد أتمتة خدمة العملاء بشكل احترافي ومتعدد اللغات.

### الميزات الجوهرية

| الميزة | التفاصيل |
|---|---|
| **RAG من المستندات** | رفع PDF, DOCX, XLSX, TXT → تحويل تلقائي إلى Markdown → تقطيع → تضمين في ChromaDB |
| **متعدد القنوات** | ويدجت الويب · Telegram · WhatsApp (Twilio) |
| **ثنائي اللغة** | عربي / إنجليزي مع دعم RTL كامل في كل صفحة |
| **تصعيد ذكي** | عند انخفاض الثقة أو طلب المستخدم → تحويل لوكيل بشري |
| **آلة حالة الشراء** | محادثة موجَّهة لإتمام طلبات الشراء خطوة بخطوة |
| **لوحة تحليلات** | معدل الانحراف · التوفير المقدر · CSAT · أعلى الأسئلة تكراراً |
| **تعليم البوت** | حقن إجابات على الأسئلة غير المُجابة مباشرة من اللوحة |
| **نموذج SaaS** | خطط Free / Pro / Ultra · إعدادات مستقلة لكل tenant |
| **أمان متكامل** | JWT · تشفير Fernet لأسرار القنوات · rate limiting · مفتاح Admin API |

### المعمارية التقنية

```
┌─────────────────────────────────────────────────────────┐
│                     المستخدم النهائي                      │
│          ويب  ·  Telegram  ·  WhatsApp                   │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP / WebSocket
┌────────────────────▼────────────────────────────────────┐
│            Vite + React Frontend  (:5000)                │
│   لوحة التحكم · ويدجت المحادثة · صفحات عامة             │
└────────────────────┬────────────────────────────────────┘
                     │ REST API + WS
┌────────────────────▼────────────────────────────────────┐
│              FastAPI Backend  (:8000)                    │
│  /api/chat  /api/files  /api/handoffs  /api/analytics   │
│  /api/admin  /api/settings  /api/learn  /api/purchases  │
└──────┬──────────┬──────────┬──────────┬─────────────────┘
       │          │          │          │
   SQLite/     ChromaDB   Gemini/     Telegram
   Postgres    (Vector)   OpenAI/     WhatsApp
   (SQLAlchemy)           GPT-4o      Channels
```

---

## 2. شجرة الملفات الكاملة

```
clientMORE/
│
├── 📄 start.sh                    # نقطة البداية: backend + frontend معاً
├── 📄 requirements.txt            # تبعيات Python (fastapi, chromadb, openai, ...)
├── 📄 docker-compose.yml          # تشغيل محلي بـ Docker
├── 📄 backend.Dockerfile          # صورة Docker للـ backend
├── 📄 frontend.Dockerfile         # صورة Docker للـ frontend
├── 📄 check_env.py                # التحقق من المتغيرات قبل البدء
├── 📄 pytest.ini                  # إعدادات pytest
├── 📄 .env.example                # قائمة المتغيرات المطلوبة
│
├── 📁 backend/
│   ├── 📄 __init__.py
│   ├── 📄 main.py                 # تهيئة FastAPI، ربط جميع الـ routers، CORS
│   │
│   ├── 📁 core/
│   │   ├── config.py              # ← مصدر الحقيقة لجميع إعدادات البيئة
│   │   ├── crypto.py              # تشفير/فك تشفير Fernet للأسرار
│   │   ├── language.py            # كشف اللغة (AR / EN)
│   │   ├── logging_config.py      # إعداد structlog / JSON logging
│   │   ├── long_term_memory.py    # ذاكرة طويلة (اختياري، ENABLE_LONG_TERM_MEMORY)
│   │   ├── memory.py              # نافذة المحادثة قصيرة المدى
│   │   └── ratelimit.py           # slowapi — تحديد معدل الطلبات
│   │
│   ├── 📁 models/
│   │   ├── database.py            # اتصال SQLAlchemy، create_all
│   │   └── tables.py              # ← تعريف جميع الجداول (ORM)
│   │                              #   Document · Conversation · Message
│   │                              #   Handoff · PurchaseOrder · LearnedAnswer
│   │                              #   Tenant · Setting
│   │
│   ├── 📁 routers/
│   │   ├── admin.py               # /api/admin/* — إدارة المستأجرين والنظام
│   │   ├── analytics.py           # /api/analytics — KPIs ومؤشرات الأداء
│   │   ├── auth.py                # /api/auth/login, /register, /logout
│   │   ├── channels.py            # /api/channels — إعداد Telegram/WhatsApp
│   │   ├── chat.py                # /api/chat — نقطة الدخول الرئيسية للمحادثة
│   │   ├── files.py               # /api/files — رفع ومعالجة المستندات
│   │   ├── handoffs.py            # /api/handoffs — إدارة طلبات التصعيد
│   │   ├── learn.py               # /api/learn — حقن إجابات على أسئلة مجهولة
│   │   ├── purchases.py           # /api/purchases — عرض وإدارة طلبات الشراء
│   │   ├── settings.py            # /api/settings — إعدادات المستأجر (الشعار، اللون، ...)
│   │   └── ws.py                  # WebSocket /ws/dashboard — إشعارات فورية
│   │
│   ├── 📁 schemas/
│   │   ├── analytics.py           # Pydantic schemas لـ KPIs
│   │   ├── auth.py                # LoginRequest · TokenResponse
│   │   ├── chat.py                # ChatRequest · ChatResponse · RagResult
│   │   ├── files.py               # DocumentOut · UploadResponse
│   │   ├── handoffs.py            # HandoffOut · HandoffCreate
│   │   ├── learn.py               # LearnRequest · LearnedAnswerOut
│   │   ├── purchase.py            # PurchaseOrderOut
│   │   ├── settings.py            # SettingsOut · SettingsUpdate
│   │   └── tenants.py             # TenantOut
│   │
│   ├── 📁 services/
│   │   ├── analytics.py           # حساب KPIs من DB
│   │   ├── chat_service.py        # ← منسق المحادثة الرئيسي (intent → RAG → handoff)
│   │   ├── handoff_delivery.py    # إرسال إشعارات Handoff للقنوات
│   │   ├── intent_classifier.py   # تصنيف نية المستخدم
│   │   ├── purchase_flow.py       # آلة حالة الشراء
│   │   ├── realtime.py            # WebSocket broadcast للوحة التحكم
│   │   │
│   │   ├── 📁 ai/
│   │   │   ├── embeddings.py      # تضمين النصوص (OpenAI / Gemini)
│   │   │   ├── knowledge_sync.py  # مزامنة LearnedAnswers مع ChromaDB
│   │   │   ├── rag.py             # ← RAG الأساسي: VectorRagStrategy + FallbackStrategy
│   │   │   ├── retrieval.py       # بحث هجين (dense + BM25)
│   │   │   ├── text_normalize.py  # تطبيع النص (AR unicode، إزالة diacritics)
│   │   │   └── vectorstore.py     # ChromaDB PersistentClient wrapper
│   │   │
│   │   ├── 📁 channels/
│   │   │   ├── base.py            # ChannelHandler ABC
│   │   │   ├── factory.py         # إنشاء handler حسب القناة
│   │   │   ├── telegram.py        # إرسال رسائل Telegram
│   │   │   ├── telegram_poller.py # استقبال رسائل Telegram
│   │   │   ├── web.py             # ويدجت الويب
│   │   │   └── whatsapp.py        # Twilio WhatsApp
│   │   │
│   │   └── 📁 ingestion/
│   │       ├── chunker.py         # تقطيع النص إلى chunks
│   │       ├── docx.py            # استخراج DOCX → Markdown
│   │       ├── ingest.py          # ← تنسيق الاستيعاب الكامل
│   │       ├── pdf.py             # استخراج PDF (PyMuPDF)
│   │       ├── txt.py             # ملفات TXT
│   │       └── xlsx.py            # جداول Excel → Markdown جدولي
│   │
│   ├── 📁 scripts/
│   │   ├── seed_demo.py           # زرع بيانات تجريبية أساسية
│   │   ├── seed_demo_store.py     # زرع متجر تجريبي مع منتجات
│   │   ├── seed_clothing_store.py # متجر ملابس تجريبي
│   │   ├── benchmark_chat.py      # قياس أداء الردود
│   │   ├── make_qr.py             # توليد QR لرابط Telegram
│   │   └── setup_telegram.py      # إعداد Telegram webhook
│   │
│   └── 📁 tests/
│       ├── conftest.py            # fixtures: DB، client، tenant تجريبي
│       ├── test_chat_service_routing.py
│       ├── test_crypto.py
│       ├── test_files_upload.py
│       ├── test_handoff_delivery.py
│       ├── test_intent_classifier.py
│       └── test_purchase_flow.py
│
└── 📁 MoreClient/                 # ← واجهة Vite + React (بعد الترحيل)
    ├── 📄 index.html
    ├── 📄 vite.config.ts
    ├── 📄 package.json
    ├── 📄 tsconfig.json
    │
    └── 📁 src/
        ├── 📄 main.tsx             # نقطة دخول React
        ├── 📄 App.tsx              # wouter router — جميع المسارات
        ├── 📄 index.css            # design tokens + Tailwind v4
        │
        ├── 📁 app/                 # صفحات المسارات (Next.js → Vite)
        │   ├── page.tsx            # / الصفحة الرئيسية
        │   ├── layout.tsx          # Layout الجذر
        │   ├── not-found.tsx
        │   ├── welcome/page.tsx    # /welcome تسجيل الدخول
        │   ├── sign-up/            # /sign-up إنشاء حساب
        │   ├── pricing/page.tsx    # /pricing
        │   ├── widget/page.tsx     # /widget ويدجت المحادثة
        │   ├── legal/              # /legal/privacy · /legal/terms
        │   ├── (public)/           # صفحات عامة (t/:handle)
        │   ├── dashboard/          # /dashboard/* لوحة التحكم
        │   │   ├── layout.tsx      # ← DashboardLayout (sidebar + header)
        │   │   ├── page.tsx        # Analytics & KPIs
        │   │   ├── files/page.tsx
        │   │   ├── handoffs/page.tsx
        │   │   ├── settings/page.tsx
        │   │   └── upgrade/page.tsx
        │   └── admin/              # /admin لوحة Super Admin
        │       ├── layout.tsx
        │       └── page.tsx
        │
        ├── 📁 components/
        │   ├── language-provider.tsx   # ← Context عالمي: t(), isRtl, companyLogo
        │   ├── notification-bell.tsx   # جرس الإشعارات (WebSocket)
        │   ├── login-view.tsx
        │   ├── login-carousel.tsx
        │   ├── auth/                   # مكونات المصادقة
        │   ├── landing/                # صفحة الهبوط
        │   └── ui/                     # shadcn/ui + مكونات مخصصة
        │       ├── button.tsx
        │       ├── card.tsx
        │       ├── input.tsx
        │       ├── logo.tsx
        │       └── ...
        │
        └── 📁 lib/
            ├── api.ts                  # REST client + WebSocket URL builder
            ├── use-session-role.ts     # hook: قراءة role من sessionStorage
            ├── use-async-effect.ts
            └── next-shim/             # ← shimmed Next.js modules
                ├── link.tsx           # next/link → wouter Link
                ├── navigation.ts      # usePathname · useRouter · useSearchParams
                ├── font-google.ts     # Inter · Cairo · Outfit (no-op)
                ├── index.ts           # Metadata · Viewport types
                └── types.ts
```

---

## 3. دليل النشر على Replit

### 3.1 متطلبات المشروع

استخدم قالب **Python + Node.js** في Replit لتشغيل كلا الخدمتين.

```
Python:  3.11+
Node.js: 20+
pnpm:    9+
```

### 3.2 إعداد الأسرار (Secrets)

في لوحة Replit، أضف الأسرار التالية (**Tools → Secrets**):

#### أسرار مطلوبة

| المتغير | الوصف | مثال |
|---|---|---|
| `GEMINI_API_KEY` | مفتاح Google Gemini (الأساسي) | `AIza...` |
| `APP_SECRET` | مفتاح JWT (32+ حرف عشوائي) | `openssl rand -hex 32` |
| `ADMIN_API_KEY` | مفتاح الوصول للوحة Admin | `adm_...` |
| `DEFAULT_TENANT_KEY` | معرف المستأجر الافتراضي | `my_company` |

#### أسرار اختيارية

| المتغير | الوصف |
|---|---|
| `OPENAI_API_KEY` | بديل أو إضافة لـ Gemini |
| `TELEGRAM_BOT_TOKEN` | لتفعيل قناة Telegram |
| `TWILIO_ACCOUNT_SID` | لتفعيل WhatsApp |
| `TWILIO_AUTH_TOKEN` | مطابق لـ TWILIO_ACCOUNT_SID |
| `TWILIO_WHATSAPP_FROM` | رقم الإرسال `whatsapp:+14155238886` |
| `DATABASE_URL` | Postgres بدلاً من SQLite |
| `CHROMA_DIR` | مسار ChromaDB (افتراضي: `./chroma_store`) |

#### أسرار الواجهة (VITE_*)

| المتغير | الوصف |
|---|---|
| `VITE_API_URL` | عنوان الـ backend (افتراضي: `http://localhost:8000`) |
| `VITE_WS_URL` | عنوان WebSocket (افتراضي: مشتق من VITE_API_URL) |

### 3.3 ملف `.replit`

```toml
[workflows]
runButton = "Start All"

[[workflows.workflow]]
name = "Start All"
mode = "parallel"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "bash start.sh"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "pnpm --filter @workspace/clientmore run dev"

[deployment]
run = ["sh", "-c", "bash start.sh"]
deploymentTarget = "cloudrun"
```

### 3.4 ملف `replit.nix`

```nix
{ pkgs }:

{
  deps = [
    pkgs.python311
    pkgs.python311Packages.pip
    pkgs.nodejs_20
    pkgs.nodePackages.pnpm
    pkgs.libgcc
    pkgs.libstdcxx5
    pkgs.zlib
    # لـ PyMuPDF و chromadb
    pkgs.libffi
    pkgs.openssl
  ];
}
```

### 3.5 خطوات النشر خطوة بخطوة

#### الخطوة 1: تثبيت التبعيات

```bash
# Python
pip install -r requirements.txt

# Node.js (Workspace)
pnpm install
```

#### الخطوة 2: تهيئة قاعدة البيانات

```bash
# إنشاء الجداول
python -c "from backend.models.database import Base, engine; Base.metadata.create_all(engine)"

# زرع بيانات تجريبية (اختياري)
python -m backend.scripts.seed_demo
```

#### الخطوة 3: التحقق من البيئة

```bash
python check_env.py
```

الناتج المتوقع في وضع `dev`:
```
✓ ENV=dev  (keyless demo mode — non-fatal missing secrets)
⚠ GEMINI_API_KEY missing  → RAG will fail, demo answers only
✓ APP_SECRET is set
✓ DEFAULT_TENANT_KEY = my_company
```

#### الخطوة 4: تشغيل الخدمتين

```bash
# في workflow منفصل أو عبر start.sh
bash start.sh
```

#### الخطوة 5: اختبار الصحة

```bash
# Backend health
curl http://localhost:8000/health
# → {"status":"ok","version":"...","db":"ok"}

# Frontend
curl http://localhost:5000/
# → HTML للصفحة الرئيسية

# Admin (مع مفتاح)
curl -H "X-Admin-Key: $ADMIN_API_KEY" http://localhost:8000/api/admin/tenants
# → [{"key":"my_company",...}]
```

### 3.6 إعداد ChromaDB للثبات على Replit

ChromaDB تخزن ملفاتها محلياً. على Replit، تأكد من:

```python
# backend/core/config.py
CHROMA_DIR: str = os.getenv("CHROMA_DIR", "/home/runner/workspace/chroma_store")
```

وأضف `chroma_store/` إلى `.gitignore` لتجنب رفع ملفات الـ embeddings:

```gitignore
chroma_store/
*.db
__pycache__/
.env
```

### 3.7 قائمة endpoints الرئيسية للتحقق

| Endpoint | الوصف |
|---|---|
| `GET /health` | صحة الـ backend والـ DB |
| `POST /api/auth/login` | تسجيل دخول، إرجاع JWT |
| `POST /api/chat` | إرسال رسالة، تلقي رد RAG |
| `GET /api/files` | قائمة المستندات المستوعبة |
| `GET /api/handoffs` | قائمة التصعيدات البشرية |
| `GET /api/analytics/kpis` | مؤشرات الأداء |
| `WS /ws/dashboard` | WebSocket للإشعارات الفورية |
| `GET /api/admin/tenants` | قائمة المستأجرين (Admin) |

---

## 4. تحسينات الواجهة

### المشكلة

الواجهة تستخدم مصطلحات "ذكاء اصطناعي" بشكل صريح مما يجعلها تبدو باردة وغير شخصية. الهدف: تجربة إنسانية دافئة.

### 4.1 تغييرات `language-provider.tsx`

```typescript
// قبل — language-provider.tsx
const translationsEn = {
  kpiAnswerRate: "AI Resolution Rate",
  handoffNotificationLowConfidence: "Low-confidence question needs review",
  botName: "AI Assistant",
  escalationMessage: "Escalating to human agent...",
  // ...
};

// بعد
const translationsEn = {
  kpiAnswerRate: "Support Resolution Rate",
  handoffNotificationLowConfidence: "Customer question needs team review",
  botName: "Support Team",
  escalationMessage: "Connecting you with our support team...",
  // ...
};

const translationsAr = {
  kpiAnswerRate: "معدل حل الدعم",
  handoffNotificationLowConfidence: "سؤال عميل يحتاج مراجعة الفريق",
  botName: "فريق الدعم",
  escalationMessage: "جاري التواصل مع فريق الدعم...",
  // ...
};
```

**ملفات للتعديل:**
- `MoreClient/src/components/language-provider.tsx` — جميع مفاتيح الترجمة

**قواعد الاستبدال:**

| قبل | بعد |
|---|---|
| "AI Assistant" | اسم البوت من `Setting.bot_name` |
| "AI Resolution Rate" | "Support Resolution Rate" |
| "Escalating to human" | "Connecting with support team" |
| "Bot" badge | اسم `Setting.bot_name` |
| "AI generated" | "Based on our knowledge base" |
| "تصعيد إلى إنسان" | "جاري التواصل مع فريق الدعم" |
| "معدل حل الذكاء الاصطناعي" | "معدل حل الدعم" |

### 4.2 تحسين `rag.py` — الرد بضمير المتكلم

```python
# backend/services/ai/rag.py

SYSTEM_PROMPT_TEMPLATE = """You are the support assistant for {company_name}.
Your name is {bot_name}.

RULES:
- Always speak in first person: "I found...", "Based on our records...", "I can help..."
- Never say "AI", "artificial intelligence", "language model", or "system"
- If you don't know, say: "I'll connect you with our support team" — never "I cannot answer"
- Match the customer's language: if they write Arabic, respond in Arabic
- Keep answers concise (2-4 sentences) unless a detailed explanation is requested
- For Arabic: use formal "أنت/حضرتك", never casual slang
- Sign off warmly: "Is there anything else I can help you with?"

CONTEXT (from {company_name} knowledge base):
{context}

CONVERSATION:
{history}"""
```

### 4.3 تحسين `chat_service.py` — رسائل التصعيد

```python
# backend/services/chat_service.py

ESCALATION_MESSAGES = {
    "en": (
        "I want to make sure you get the best help possible. "
        "Let me connect you with a member of our support team — "
        "they'll be with you shortly."
    ),
    "ar": (
        "أريد التأكد من حصولك على أفضل مساعدة ممكنة. "
        "سأوصلك بأحد أعضاء فريق الدعم لدينا — "
        "وسيتواصلون معك قريباً."
    ),
}
```

### 4.4 تحسين `handoffs/page.tsx` — تجربة بشرية

```tsx
// MoreClient/src/app/dashboard/handoffs/page.tsx

// قبل
<Badge variant="outline">Bot</Badge>

// بعد
<Badge variant="outline">{companyName} Bot</Badge>

// إضافة مؤقت SLA
const timeInQueue = differenceInMinutes(new Date(), new Date(handoff.created_at));
const isUrgent = timeInQueue > 60;

<span className={cn(
  "text-xs tabular-nums",
  isUrgent ? "text-red-400 font-semibold" : "text-gray-400"
)}>
  {isUrgent ? "⚠ " : ""}{formatDistanceToNow(new Date(handoff.created_at))}
</span>
```

### 4.5 تخصيص الويدجت بألوان الشركة

```tsx
// MoreClient/src/app/widget/page.tsx

// بدلاً من الأيقونة الثابتة، استخدم شعار الشركة
<img
  src={companyLogo || "/clientmore-logo.jpeg"}
  alt={companyName}
  className="h-9 w-9 rounded-xl object-cover"
/>

// تطبيق لون الشركة
<div
  className="widget-header"
  style={{ backgroundColor: setting?.brand_color ?? "var(--brand-600)" }}
>
```

---

## 5. بناء خفيف ومحسّن

### 5.1 تحسينات الـ Backend

#### استخدام نموذج أسرع وأرخص

```python
# backend/core/config.py — أضف
GEMINI_LITE_MODEL: str = os.getenv("GEMINI_LITE_MODEL", "gemini-2.0-flash-lite")
ENABLE_LITE_MODE: bool = _bool(os.getenv("ENABLE_LITE_MODE"), False)

# backend/services/ai/rag.py
model_name = (
    cfg.GEMINI_LITE_MODEL
    if cfg.ENABLE_LITE_MODE
    else cfg.GEMINI_CHAT_MODEL
)
```

#### تقليل عمق البحث

```python
# backend/core/config.py
# قبل
RETRIEVAL_K: int = _clamp_int(os.getenv("RETRIEVAL_K"), 4, 1, 20)

# بعد — 3 في Lite Mode
RETRIEVAL_K: int = _clamp_int(
    os.getenv("RETRIEVAL_K"),
    3 if _bool(os.getenv("ENABLE_LITE_MODE")) else 4,
    1, 20
)
```

#### تعطيل الذاكرة طويلة المدى

```python
# backend/core/config.py — أضف
ENABLE_LONG_TERM_MEMORY: bool = _bool(os.getenv("ENABLE_LONG_TERM_MEMORY"), True)

# backend/core/long_term_memory.py — أضف guard
from backend.core.config import settings as cfg

def retrieve(conv_id: int, query: str, db) -> list[str]:
    if not cfg.ENABLE_LONG_TERM_MEMORY:
        return []
    # ... الكود الحالي
```

#### Cache كشف اللغة لكل محادثة

```python
# backend/services/chat_service.py

# قبل — كشف اللغة في كل رسالة
lang = detect_language(user_message)

# بعد — cache على مستوى المحادثة
if conv.language:
    lang = conv.language
else:
    lang = detect_language(user_message)
    conv.language = lang
    db.commit()
```

> **ملاحظة:** يتطلب هذا إضافة عمود `language VARCHAR(10)` لجدول `Conversation`.

#### تنظيف الـ imports غير المستخدمة

```python
# backend/main.py — احذف
# import anthropic  ← غير موصول بعد، يُبطئ الـ boot time
```

### 5.2 تحسينات الـ Frontend

#### تفعيل وضع Standalone لـ Next.js (للنسخة الأصلية)

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "standalone",
  // ...
};
```

#### حذف الصفحات الفارغة

```bash
# صفحات scaffold غير مستخدمة (إن وُجدت)
rm -rf src/app/api/v1/
rm -rf src/server/
```

#### تقليل حجم Bundle

```typescript
// vite.config.ts — إضافة code splitting
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ["react", "react-dom", "wouter"],
        charts: ["recharts"],
        ui: ["lucide-react", "@radix-ui/react-tooltip"],
      },
    },
  },
},
```

### 5.3 متغيرات بيئة Lite Mode

```bash
# أضف في Replit Secrets
ENABLE_LITE_MODE=true
ENABLE_LONG_TERM_MEMORY=false
RETRIEVAL_K=3
MEMORY_WINDOW=6
GEMINI_CHAT_MODEL=gemini-2.0-flash-lite
```

---

## 6. إصلاح الأخطاء المعروفة

### 🔴 حرج: Admin بدون حماية

**المشكلة:** بعض مسارات `/api/admin/*` قد لا تُطبق `require_admin_key` بشكل موحد.

```python
# backend/routers/admin.py — تأكد من وجود الـ dependency في كل router

from backend.core.security import require_admin_key

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin_key)],  # ← تطبيق على جميع المسارات
)
```

### 🔴 حرج: فشل صامت في تسليم الـ Handoff

**المشكلة:** إذا فشل الإرسال لـ Telegram/WhatsApp، لا يوجد retry ولا سجل للفشل.

```python
# backend/services/handoff_delivery.py

import asyncio
from datetime import datetime

MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 5

async def deliver_with_retry(handoff, setting, db) -> bool:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            await deliver_handoff_notification(handoff, setting)
            handoff.delivery_status = "sent"
            handoff.delivery_attempts = attempt
            db.commit()
            return True
        except Exception as exc:
            if attempt == MAX_RETRIES:
                handoff.delivery_status = "failed"
                handoff.delivery_failed_at = datetime.utcnow()
                handoff.delivery_error = str(exc)[:500]
                db.commit()
                return False
            await asyncio.sleep(RETRY_DELAY_SECONDS * attempt)
    return False
```

**وأضف الأعمدة للجدول:**

```python
# backend/models/tables.py — Handoff class
delivery_status = Column(String(20), default="pending", nullable=False)
delivery_attempts = Column(Integer, default=0, nullable=False)
delivery_failed_at = Column(DateTime, nullable=True)
delivery_error = Column(Text, nullable=True)
```

### 🔴 حرج: تجاوز Demo Access بدون تحقق حقيقي

**المشكلة:** وضع Demo يعتمد فقط على `sessionStorage` في المتصفح — يمكن تعديله.

```python
# backend/routers/auth.py — أضف endpoint خاص بـ Demo
@router.post("/demo-login")
async def demo_login(db: Session = Depends(get_db)):
    """Demo session: read-only tenant, no real data."""
    demo_tenant = db.query(Tenant).filter_by(key="demo").first()
    if not demo_tenant:
        raise HTTPException(404, "Demo tenant not configured")
    token = create_access_token(
        sub=f"demo_{demo_tenant.key}",
        role="viewer",       # read-only role
        tenant=demo_tenant.key,
    )
    return {"token": token, "role": "viewer", "tenant": demo_tenant.key}
```

### 🟡 عالي: إجابات متعلمة يتيمة في Chroma

**المشكلة:** عند حذف `LearnedAnswer` من DB، تبقى في ChromaDB.

```python
# backend/routers/learn.py

@router.delete("/{learn_id}")
async def delete_learned_answer(learn_id: int, db: Session = Depends(get_db)):
    answer = db.query(LearnedAnswer).get(learn_id)
    if not answer:
        raise HTTPException(404)

    # ← احذف من ChromaDB أولاً
    try:
        vectorstore.delete_document(f"learned-{learn_id}", answer.tenant_key)
    except Exception:
        pass  # لا توقف الحذف من DB إذا فشل Chroma

    db.delete(answer)
    db.commit()
    return {"deleted": learn_id}
```

### 🟡 عالي: طلبات الشراء عالقة في "pending"

**المشكلة:** طلبات تبقى `pending` إلى الأبد إذا انقطعت المحادثة.

```python
# backend/main.py — أضف background cleanup task

from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job("interval", minutes=30)
async def cleanup_stale_purchases():
    """ألغِ طلبات الشراء التي لم تُكمل خلال 2 ساعة."""
    cutoff = datetime.utcnow() - timedelta(hours=2)
    with SessionLocal() as db:
        stale = db.query(PurchaseOrder).filter(
            PurchaseOrder.status == "pending",
            PurchaseOrder.created_at < cutoff,
        ).all()
        for order in stale:
            order.status = "cancelled"
            order.cancel_reason = "timeout"
        db.commit()

@app.on_event("startup")
async def start_scheduler():
    scheduler.start()
```

### 🟡 عالي: صفحة الملفات تتوقف بصمت بعد 20 محاولة

**المشكلة:** المكون يتوقف عن الـ polling لكن لا يُعلم المستخدم.

```typescript
// MoreClient/src/app/dashboard/files/page.tsx

const MAX_POLL_ATTEMPTS = 20;
const [pollExhausted, setPollExhausted] = useState(false);

// في دالة الـ polling
if (attempt >= MAX_POLL_ATTEMPTS) {
  setPollExhausted(true);
  clearInterval(pollInterval);
  return;
}

// في JSX
{pollExhausted && (
  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
    {t("fileStillProcessing")}
    {" — "}
    <button onClick={() => window.location.reload()} className="underline">
      {t("refresh")}
    </button>
  </div>
)}
```

### 🟠 متوسط: شعار الإعدادات لا يتزامن

**المشكلة:** `logoDraft` في صفحة الإعدادات لا يتحدث عند تغيير `companyLogo`.

```typescript
// MoreClient/src/app/dashboard/settings/page.tsx

const { companyLogo } = useLanguage();
const [logoDraft, setLogoDraft] = useState(companyLogo);

// ← أضف useEffect للمزامنة
useEffect(() => {
  setLogoDraft(companyLogo);
}, [companyLogo]);
```

### 🟠 متوسط: وميض الحذف التفاؤلي

**المشكلة:** العناصر تختفي من الواجهة قبل تأكيد نجاح الـ API.

```typescript
// المبدأ الصحيح
const handleDelete = async (id: number) => {
  // ← لا تحذف من الـ state قبل النجاح
  try {
    await apiDelete(`/api/files/${id}`);
    setFiles(prev => prev.filter(f => f.id !== id)); // ← بعد النجاح فقط
  } catch {
    toast.error(t("deleteFailed"));
  }
};
```

### 🟠 متوسط: WebSocket لا يُعلم عند الانقطاع المتكرر

```typescript
// MoreClient/src/components/notification-bell.tsx

const MAX_RECONNECTS = 5;
const [disconnected, setDisconnected] = useState(false);
let reconnectCount = useRef(0);

ws.onclose = () => {
  reconnectCount.current++;
  if (reconnectCount.current >= MAX_RECONNECTS) {
    setDisconnected(true);
    return; // توقف عن المحاولة
  }
  // إعادة المحاولة بعد تأخير تصاعدي
  setTimeout(connect, Math.min(1000 * 2 ** reconnectCount.current, 30000));
};

// في JSX — شريط إشعار انقطاع الاتصال
{disconnected && (
  <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-red-500/90 px-4 py-2 text-sm text-white shadow-lg z-50">
    {t("disconnected")} — <button onClick={reconnect}>{t("reconnect")}</button>
  </div>
)}
```

---

## 7. تحسين RAG والردود

### 7.1 تفعيل البحث الهجين

```bash
# Replit Secrets — أضف
ENABLE_HYBRID=true
```

```python
# backend/core/config.py
ENABLE_HYBRID: bool = _bool(os.getenv("ENABLE_HYBRID"), True)
```

> البحث الهجين (Dense + BM25) مُنفَّذ في `retrieval.py` — تأكد فقط من تفعيل `ENABLE_HYBRID=true`.

### 7.2 إعادة كتابة System Prompt

```python
# backend/services/ai/rag.py

SYSTEM_PROMPT = """You are {bot_name}, the friendly support assistant for {company_name}.

## Your personality
- Warm, helpful, and professional
- First-person voice: "I found...", "Based on our information...", "I can confirm..."
- Never mention AI, LLM, language model, or technology
- If unsure: "I'd like to connect you with our team to give you the most accurate answer"

## Language rules
- Detect and match the customer's language exactly
- Arabic: use formal Modern Standard Arabic, avoid transliteration
- Arabic: use "أنا" / "لدينا" / "يمكنني مساعدتك"
- End every Arabic response warmly: "هل يمكنني مساعدتك في شيء آخر؟"
- End every English response warmly: "Is there anything else I can help you with?"

## Answer rules
- Stay grounded in the context below — do not invent facts
- Short answers: 2-4 sentences for simple questions
- Detailed answers: use numbered steps for processes
- Always emit {no_answer_sentinel} if the context lacks the answer

## Context from {company_name} knowledge base:
{context}

## Conversation so far:
{history}
"""
```

### 7.3 معايرة عتبة الثقة للعربية

```python
# backend/services/ai/rag.py

def _threshold(setting, lang: str = "en") -> float:
    base = getattr(setting, "confidence_threshold", None) or cfg.CONFIDENCE_THRESHOLD
    # تضمينات العربية تُقيَّم بشكل أقل — خفّض العتبة قليلاً
    if lang == "ar":
        return max(0.0, base - 0.10)
    return base
```

### 7.4 التحكم في طول الإجابة

```python
# backend/services/ai/rag.py

def _max_tokens(query: str, lang: str) -> int:
    """إجابات قصيرة للأسئلة الواقعية، أطول للشرح المفصل."""
    factual_keywords = ("what is", "who is", "when", "ما هو", "من هو", "متى", "أين")
    is_factual = any(kw in query.lower() for kw in factual_keywords)
    return 250 if is_factual else 600
```

### 7.5 وضع الاقتباس من المصدر

```python
# backend/services/ai/rag.py

def _format_answer_with_citation(answer: str, sources: list[str]) -> str:
    if not sources:
        return answer
    source_names = ", ".join(
        s.split("/")[-1].replace(".pdf", "").replace(".docx", "")
        for s in sources[:2]  # أول مصدرين فقط
    )
    citation_en = f"\n\n_Source: {source_names}_"
    citation_ar = f"\n\n_المصدر: {source_names}_"
    # كشف لغة الإجابة
    if re.search(r"[\u0600-\u06FF]", answer):
        return answer + citation_ar
    return answer + citation_en
```

### 7.6 تحسين كشف الرفض العربي

```python
# backend/services/ai/rag.py

_NO_ANSWER_HINTS = (
    # الإنجليزية
    "i don't know", "i do not know", "i'm not sure", "cannot find", "can't find",
    "no information", "don't have enough information", "not available",
    # العربية — مُحسَّنة
    "لا أعرف", "لا اعرف", "لا تتوفر", "لا يوجد لدي", "لست متأكد",
    "لا أملك معلومات", "لا تتوفر لدي", "غير متوفر", "لا أستطيع الإجابة",
    "لم أجد", "لا يوجد في قاعدة", "لا توجد معلومات",
)
```

### 7.7 زيادة نافذة الذاكرة

```bash
# Replit Secrets
MEMORY_WINDOW=10
```

### 7.8 إزالة تكرار الـ Chunks قبل التوليد

```python
# backend/services/ai/rag.py

def _deduplicate_chunks(chunks: list[str], threshold: float = 0.85) -> list[str]:
    """احذف chunks متشابهة جداً من نفس المستند."""
    unique: list[str] = []
    for chunk in chunks:
        is_dup = any(
            SequenceMatcher(None, chunk[:200], u[:200]).ratio() > threshold
            for u in unique
        )
        if not is_dup:
            unique.append(chunk)
    return unique
```

---

## 8. تحسين نظام التسليم البشري

### 8.1 تتبع حالة التسليم

```python
# backend/models/tables.py — أضف إلى Handoff

delivery_status = Column(
    String(20), default="pending", nullable=False,
    # pending | sent | failed
)
delivery_attempts = Column(Integer, default=0, nullable=False)
delivery_failed_at = Column(DateTime, nullable=True)
delivery_error = Column(Text, nullable=True)
resolved_satisfactorily = Column(Boolean, nullable=True)  # null = لم يُقيَّم بعد
```

### 8.2 طابور إعادة المحاولة

```python
# backend/services/handoff_delivery.py

@scheduler.scheduled_job("interval", seconds=60)
async def retry_failed_deliveries():
    """إعادة محاولة التسليم الفاشلة كل دقيقة، حتى 3 محاولات."""
    with SessionLocal() as db:
        failed = db.query(Handoff).filter(
            Handoff.delivery_status == "failed",
            Handoff.delivery_attempts < 3,
        ).all()
        for handoff in failed:
            setting = get_setting(handoff.tenant_key, db)
            await deliver_with_retry(handoff, setting, db)
```

### 8.3 ردود الوكيل البشري في الدردشة

```python
# backend/routers/handoffs.py

@router.post("/{handoff_id}/reply")
async def agent_reply(
    handoff_id: int,
    body: AgentReplyRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_auth),
):
    """إرسال رد من الوكيل البشري ضمن المحادثة."""
    handoff = db.query(Handoff).get(handoff_id)
    if not handoff:
        raise HTTPException(404)

    msg = Message(
        conversation_id=handoff.conversation_id,
        role="agent",
        content=f"**{current_user.display_name}:** {body.message}",
    )
    db.add(msg)
    db.commit()

    # broadcast للـ WebSocket
    await broadcast_new_message(handoff.conversation_id, msg)
    return {"sent": True}
```

### 8.4 تقييم جودة الحل

```python
# backend/routers/handoffs.py

@router.patch("/{handoff_id}/resolve-feedback")
async def resolve_feedback(
    handoff_id: int,
    satisfied: bool,
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    """هل تم حل المشكلة بشكل مُرضٍ؟"""
    handoff = db.query(Handoff).get(handoff_id)
    if not handoff:
        raise HTTPException(404)
    handoff.resolved_satisfactorily = satisfied
    db.commit()
    return {"updated": True}
```

### 8.5 مؤقت SLA في اللوحة

```tsx
// MoreClient/src/app/dashboard/handoffs/page.tsx

import { formatDistanceToNow, differenceInMinutes } from "date-fns";
import { ar } from "date-fns/locale";

function SlaTimer({ createdAt }: { createdAt: string }) {
  const { language } = useLanguage();
  const minutes = differenceInMinutes(new Date(), new Date(createdAt));
  const isBreached = minutes > 60;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs tabular-nums font-mono",
        isBreached
          ? "text-red-400 font-semibold"
          : minutes > 30
          ? "text-amber-400"
          : "text-gray-500"
      )}
      title={`${minutes} دقيقة في الطابور`}
    >
      {isBreached && <span>⚠</span>}
      {formatDistanceToNow(new Date(createdAt), {
        addSuffix: true,
        locale: language === "ar" ? ar : undefined,
      })}
    </span>
  );
}
```

### 8.6 اختصار "استخدم رد البوت كإجابة"

```tsx
// MoreClient/src/app/dashboard/handoffs/page.tsx

async function teachFromBotReply(handoff: HandoffOut) {
  const lastBotMessage = handoff.messages
    ?.filter(m => m.role === "assistant")
    .at(-1);

  if (!lastBotMessage) return;

  await apiPost("/api/learn", {
    question: handoff.user_question,
    answer: lastBotMessage.content,
    tenant_key: handoff.tenant_key,
  });

  toast.success(t("taughtFromHandoff"));
}

// في JSX — زر صغير داخل بطاقة الـ Handoff
<Button
  size="sm"
  variant="ghost"
  onClick={() => teachFromBotReply(handoff)}
  title={t("useAsBotAnswer")}
>
  <BookOpen className="h-3.5 w-3.5" />
  {t("teachBot")}
</Button>
```

### 8.7 رضا العميل بعد الحل

```python
# backend/services/handoff_delivery.py

async def send_csat_prompt(handoff: Handoff, setting) -> None:
    """إرسال استطلاع رضا للعميل بعد إغلاق التذكرة."""
    channel_handler = get_channel_handler(handoff.channel, setting)
    if not channel_handler:
        return

    msg_en = (
        "We've resolved your support request. "
        "How would you rate your experience today? (1–5)\n"
        "Reply with a number from 1 (poor) to 5 (excellent)."
    )
    msg_ar = (
        "تم حل طلب الدعم الخاص بك. "
        "كيف تُقيّم تجربتك اليوم؟ (1–5)\n"
        "أرسل رقماً من 1 (ضعيف) إلى 5 (ممتاز)."
    )

    msg = msg_ar if handoff.language == "ar" else msg_en
    await channel_handler.send_message(handoff.customer_ref, msg)
```

---

## خلاصة خطة التطبيق

### الأولويات الموصى بها

```
المرحلة 1 (حرج):    إصلاح /api/admin — retry التسليم — Session تحقق
المرحلة 2 (أسبوع):  تحسين Prompt — إزالة مصطلح "AI" — SLA Timer
المرحلة 3 (شهر):    CSAT — Agent Reply — KB Shortcut — Lite Mode
```

### ملفات جاهزة للتعديل

| الملف | القسم |
|---|---|
| `backend/core/config.py` | §5, §7 — متغيرات بيئة جديدة |
| `backend/services/ai/rag.py` | §4.2, §7 — Prompt + calibration |
| `backend/services/chat_service.py` | §4.3 — رسائل تصعيد إنسانية |
| `backend/services/handoff_delivery.py` | §6, §8 — retry + CSAT |
| `backend/models/tables.py` | §8.1 — أعمدة جديدة |
| `backend/routers/admin.py` | §6 — حماية موحدة |
| `backend/routers/handoffs.py` | §8.3, §8.4 — ردود + تقييم |
| `MoreClient/src/components/language-provider.tsx` | §4.1 — ترجمات |
| `MoreClient/src/app/dashboard/handoffs/page.tsx` | §4.4, §8.5, §8.6 |
| `MoreClient/src/app/dashboard/files/page.tsx` | §6 — إشعار timeout |
| `MoreClient/src/lib/api.ts` | §8.4 — endpoint تقييم |

---

> **Built in Gaza · Deployed Globally** 🇵🇸  
> clientMORE — نظام الدعم الذكي الذي يتحدث لغة عميلك
