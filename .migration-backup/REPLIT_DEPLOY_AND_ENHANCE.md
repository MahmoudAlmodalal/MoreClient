# clientMORE — Complete Replit Deployment & Enhancement Guide

> **How to use this document:** Paste each section as a prompt to Claude/Cursor/Copilot in Replit,
> or follow manually step-by-step. Every command, file path, code block, and env variable is spelled
> out in full — no guessing required.

---

## SECTION 0 — PROJECT IDEA (What You Built)

**clientMORE** is a **B2B AI customer-support SaaS** that helps businesses replace expensive human
support agents with a smart bot that learns from their own documents and speaks both Arabic and English.

### Core Value Proposition
A business uploads their FAQ, product catalog, or policy documents. The bot reads them, and
from that moment forward, any customer who asks a question gets an instant, accurate answer —
in Arabic or English — 24/7. If the bot is not confident in its answer, it seamlessly hands the
conversation to a real human agent in the dashboard. Every unanswered question is saved and the
business owner can "teach" the bot the correct answer with one click, making it smarter over time.

### Who Uses It
- **Business Owner / Admin**: Uploads documents, configures the bot, reads analytics, replies to
  escalated tickets, teaches the bot new answers.
- **End Customer**: Chats with the bot on the company's website (embedded widget), Telegram, or
  WhatsApp — never knowing there is an AI behind it.
- **Super Admin (you)**: Manages all tenants, plans, and billing from the `/admin` page.

### What the Bot Can Do
1. **Answer from documents** (RAG): Retrieves relevant chunks from uploaded PDFs/DOCX/TXT/XLSX
   and generates a natural reply using Gemini, DeepSeek, or OpenAI.
2. **Detect language**: Automatically switches between Arabic and English per message.
3. **Escalate to human**: If confidence < threshold (default 0.45) or the customer says
   "talk to a human" / "موظف" / "دعم بشري", creates a Handoff ticket in the dashboard.
4. **Purchase flow**: Guides customers through buying a product — collects product name, quantity,
   delivery address, and confirms the order.
5. **Multi-channel**: Same brain, three transports — Web widget, Telegram Bot, WhatsApp (Twilio).
6. **Learn from mistakes**: Admin can answer unanswered questions; those answers are embedded into
   the knowledge base so the bot knows next time.

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend API | Python 3.11 + FastAPI + Uvicorn |
| Vector DB | ChromaDB (persistent, cosine distance) |
| SQL DB | SQLite (single file `backend.db`) |
| LLM | Gemini 2.5 Flash → DeepSeek → OpenAI (auto-chain) |
| Embeddings | Gemini embedding-001 → OpenAI text-embedding-3-small → MD5 hash (keyless) |
| Frontend | Next.js 16.2 + React 19 + Tailwind CSS v4 |
| Real-time | WebSocket (FastAPI native, no external broker) |
| Channels | python-telegram-bot (long-poll) + Twilio (WhatsApp webhook) |
| Auth | JWT (PyJWT) + bcrypt passwords — **scaffolded, not fully wired yet** |

### Revenue Model (planned)
- **Pro** plan: 500 messages/month
- **Ultra** plan: 1,500 messages/month
- **Custom** plan: Negotiated for enterprise

---

## SECTION 1 — COMPLETE ANNOTATED FILE TREE

```
MoreClint/                          ← git root
│
├── backend/                        ← Python FastAPI app (runs on :8000)
│   ├── main.py                     ← App entry: lifespan, CORS, router mounts
│   │
│   ├── core/
│   │   ├── config.py               ← All env vars with defaults + clamp validators
│   │   ├── security.py             ← JWT creation/decode, bcrypt, admin key guard
│   │   ├── crypto.py               ← Fernet encryption for Telegram/Twilio tokens in DB
│   │   ├── language.py             ← detect_language(text) → "ar" | "en"
│   │   ├── logging_config.py       ← Structured JSON logs with correlation IDs
│   │   ├── memory.py               ← In-process deque for short-term conversation history
│   │   ├── long_term_memory.py     ← Per-user Chroma collection (user_memory)
│   │   └── ratelimit.py            ← Per-IP rate limiting via slowapi
│   │
│   ├── models/
│   │   ├── database.py             ← SQLAlchemy engine, SessionLocal, get_db(), init_db()
│   │   └── tables.py               ← All ORM models (Document, Conversation, Message,
│   │                                  Handoff, LearnedAnswer, PurchaseOrder, AuthUser,
│   │                                  Setting, Tenant)
│   │
│   ├── routers/
│   │   ├── chat.py                 ← POST /api/chat
│   │   ├── handoffs.py             ← GET/POST /api/handoffs, /api/handoffs/{id}/resolve
│   │   ├── analytics.py            ← GET /api/analytics
│   │   ├── files.py                ← POST /api/upload, GET /api/files, DELETE /api/files/{id}
│   │   ├── learn.py                ← POST /api/learn (teach bot new Q&A)
│   │   ├── auth.py                 ← POST /api/auth/login, /api/auth/logout (stub)
│   │   ├── admin.py                ← /api/admin/* (tenant CRUD, health, global KPIs)
│   │   ├── purchases.py            ← /api/purchases (order state machine)
│   │   ├── settings.py             ← GET/PUT /api/settings
│   │   ├── channels.py             ← /telegram/webhook, /whatsapp/webhook
│   │   └── ws.py                   ← /ws/chat/{session_id}, /ws/dashboard
│   │
│   ├── services/
│   │   ├── chat_service.py         ← Orchestrates gate chain: handoff→purchase→intent→RAG
│   │   ├── handoff_delivery.py     ← Sends agent replies back to Telegram/WhatsApp/Web
│   │   ├── intent_classifier.py    ← Keyword + optional LLM intent detection
│   │   ├── purchase_flow.py        ← Order state machine (product→qty→address→confirm)
│   │   ├── realtime.py             ← WebSocket broadcast manager for dashboard
│   │   ├── analytics.py            ← Snapshot builder for KPIs/charts/queue
│   │   │
│   │   ├── ai/
│   │   │   ├── rag.py              ← Strategy pattern: VectorRagStrategy vs FallbackStrategy
│   │   │   ├── retrieval.py        ← Hybrid search: vector + BM25/lexical reranking
│   │   │   ├── embeddings.py       ← Multi-provider embed: Gemini→OpenAI→MD5 hash
│   │   │   ├── vectorstore.py      ← ChromaDB wrapper (persistent, cosine, deterministic IDs)
│   │   │   ├── knowledge_sync.py   ← Ensures tenant docs are indexed on startup
│   │   │   ├── text_normalize.py   ← Arabic diacritic + spelling normalization
│   │   │   └── _eval.py            ← Evaluation harness
│   │   │
│   │   ├── channels/
│   │   │   ├── base.py             ← Channel ABC: parse() → reply() → deliver()
│   │   │   ├── factory.py          ← ChannelFactory registry
│   │   │   ├── telegram.py         ← Telegram Bot API integration
│   │   │   ├── telegram_poller.py  ← Long-polling for Telegram updates
│   │   │   ├── whatsapp.py         ← Twilio WhatsApp integration
│   │   │   └── web.py              ← Web widget channel adapter
│   │   │
│   │   └── ingestion/
│   │       ├── ingest.py           ← Single entry point: ingest_document(db, filename, data)
│   │       ├── pdf.py              ← PyMuPDF text extraction
│   │       ├── docx.py             ← python-docx extraction
│   │       ├── xlsx.py             ← openpyxl extraction
│   │       ├── txt.py              ← UTF-8 text + Markdown extraction
│   │       └── chunker.py          ← RecursiveCharacterTextSplitter (~800 chars, 120 overlap)
│   │
│   ├── schemas/                    ← Pydantic response models (camelCase aliases for frontend)
│   │   ├── chat.py
│   │   ├── analytics.py
│   │   ├── handoffs.py
│   │   ├── auth.py
│   │   ├── files.py
│   │   ├── learn.py
│   │   ├── purchase.py
│   │   ├── settings.py
│   │   └── tenants.py
│   │
│   ├── seed/                       ← Demo knowledge base files
│   │   ├── ngo_faq_en.md           ← English NGO FAQ (demo)
│   │   ├── ngo_faq_ar.md           ← Arabic NGO FAQ (demo)
│   │   ├── demo_store_ar.md        ← Arabic e-commerce demo
│   │   └── clothing_store_ar.md    ← Arabic clothing store FAQ
│   │
│   ├── scripts/
│   │   ├── seed_demo.py            ← Load seed KB: python -m backend.scripts.seed_demo
│   │   ├── seed_clothing_store.py  ← Load clothing KB
│   │   ├── seed_demo_store.py      ← Load demo store KB
│   │   ├── benchmark_chat.py       ← Latency gate: p95 < 3s
│   │   ├── make_qr.py              ← QR code for Telegram link
│   │   └── setup_telegram.py       ← Telegram webhook registration
│   │
│   └── tests/
│       ├── conftest.py
│       ├── test_chat_service_routing.py
│       ├── test_rag.py
│       ├── test_handoff_delivery.py
│       ├── test_intent_classifier.py
│       ├── test_purchase_flow.py
│       ├── test_realtime_dashboard.py
│       ├── test_security.py
│       ├── test_settings_secrets.py
│       ├── test_files_upload.py
│       ├── test_crypto.py
│       └── test_text_normalize.py
│
├── MoreClient/                     ← Next.js 16 frontend (runs on :5000)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx          ← Root layout: fonts (Inter + Cairo), LanguageProvider
│   │   │   ├── globals.css         ← Tailwind v4, dark theme CSS vars, RTL support
│   │   │   ├── page.tsx            ← Landing page (marketing)
│   │   │   ├── error.tsx           ← Client error boundary
│   │   │   ├── global-error.tsx    ← Global error boundary
│   │   │   ├── not-found.tsx       ← 404 page
│   │   │   │
│   │   │   ├── welcome/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx        ← Login: email/password + social stubs + demo access
│   │   │   │
│   │   │   ├── sign-up/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── [[...sign-up]]/page.tsx  ← Sign-up form
│   │   │   │
│   │   │   ├── pricing/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   ├── layout.tsx      ← Sticky header, sidebar nav, notification bell
│   │   │   │   ├── page.tsx        ← Analytics: KPI cards, bar chart, pie chart, queue
│   │   │   │   ├── files/page.tsx  ← Knowledge base: drag-drop upload, table, delete
│   │   │   │   ├── handoffs/page.tsx ← Ticket queue: split panel, chat, reply, resolve
│   │   │   │   ├── settings/page.tsx ← Bot config, channels, purchase flow, widget snippet
│   │   │   │   └── upgrade/page.tsx  ← Subscription plan selector
│   │   │   │
│   │   │   ├── admin/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx        ← Tenant CRUD (no auth guard — bug, see Section 5)
│   │   │   │
│   │   │   ├── (public)/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── t/[handle]/
│   │   │   │       ├── page.tsx    ← Public per-business chat page
│   │   │   │       └── loading.tsx ← Skeleton loader
│   │   │   │
│   │   │   ├── widget/page.tsx     ← Embeddable standalone chat widget
│   │   │   │
│   │   │   └── legal/
│   │   │       ├── privacy/page.tsx
│   │   │       └── terms/page.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── language-provider.tsx   ← EN/AR context, RTL, i18n t(), settings state
│   │   │   ├── notification-bell.tsx   ← Real-time handoff alerts (WebSocket)
│   │   │   ├── login-carousel.tsx      ← Carousel for welcome page
│   │   │   ├── login-view.tsx          ← Login form component
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   └── auth-shell.tsx
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   └── subscription-plans.tsx  ← Usage bar + Pro/Ultra upgrade buttons
│   │   │   │
│   │   │   ├── landing/
│   │   │   │   ├── hero.tsx
│   │   │   │   ├── about-us.tsx
│   │   │   │   ├── feature-grid.tsx
│   │   │   │   ├── showcase.tsx
│   │   │   │   ├── pricing.tsx
│   │   │   │   ├── faq.tsx
│   │   │   │   ├── landing-nav.tsx
│   │   │   │   ├── landing-footer.tsx
│   │   │   │   ├── logo-cloud.tsx
│   │   │   │   ├── how-it-works.tsx
│   │   │   │   └── final-cta.tsx
│   │   │   │
│   │   │   └── ui/
│   │   │       ├── badge.tsx
│   │   │       ├── button.tsx
│   │   │       ├── card.tsx
│   │   │       ├── container.tsx
│   │   │       ├── logo.tsx
│   │   │       ├── skeleton.tsx
│   │   │       └── spinner.tsx
│   │   │
│   │   └── lib/
│   │       ├── api.ts              ← All backend calls: apiGet, apiSend, apiUpload, types
│   │       ├── use-async-effect.ts ← useAsyncOnMount, usePolling (avoids lint rule)
│   │       └── use-session-role.ts ← useSyncExternalStore for sessionStorage role
│   │
│   ├── public/
│   │   ├── clientmore-logo.jpeg
│   │   ├── embed.js               ← Widget embed script (injected by <script> tag)
│   │   └── test-embed.html
│   │
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.mjs
│   └── package.json
│
├── start.sh                        ← Run entire stack (frontend :5000 + backend :8000)
├── requirements.txt                ← Python deps
├── docker-compose.yml              ← Local dev containers
├── backend.Dockerfile
├── frontend.Dockerfile
├── pytest.ini
├── check_env.py                    ← Pre-boot env validation
└── CLAUDE.md                       ← Architecture guide for AI assistants
```

---

## SECTION 2 — REPLIT DEPLOYMENT (Step-by-Step)

### Step 2.1 — Create Replit Project

1. Go to **replit.com** → **Create Repl**
2. Choose template: **Python** (we'll add Node.js manually)
3. Name: `clientmore`
4. Click **Create Repl**
5. In the shell, clone or upload your files:
   ```bash
   # If uploading via zip, extract to /home/runner/clientmore/
   # Or push from GitHub:
   git clone https://github.com/YOUR_USERNAME/MoreClint.git .
   ```

### Step 2.2 — Create `.replit` File

Create a file called `.replit` in the project root with this EXACT content:

```toml
# .replit — Replit run configuration
run = "bash start_replit.sh"
entrypoint = "start_replit.sh"

[nix]
channel = "stable-24_05"

[deployment]
run = ["bash", "start_replit.sh"]
deploymentTarget = "cloudrun"

[[ports]]
localPort = 8000
externalPort = 8000

[[ports]]
localPort = 5000
externalPort = 80
```

### Step 2.3 — Create `replit.nix` File

Create `replit.nix` in the project root:

```nix
{ pkgs }:
{
  deps = [
    pkgs.python311
    pkgs.python311Packages.pip
    pkgs.nodejs_20
    pkgs.nodePackages.npm
    pkgs.gcc
    pkgs.libffi
    pkgs.openssl
    pkgs.sqlite
    pkgs.bash
    pkgs.curl
  ];

  env = {
    PYTHON_LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
      pkgs.libffi
      pkgs.openssl
    ];
    PYTHONBIN = "${pkgs.python311}/bin/python3.11";
    LANG = "en_US.UTF-8";
  };
}
```

### Step 2.4 — Create `start_replit.sh` (Replit-specific startup)

Create `start_replit.sh` in the project root:

```bash
#!/usr/bin/env bash
set -e

echo "=== clientMORE startup ==="

# ---- Install Python deps ----
echo "[1/4] Installing Python dependencies..."
pip install -r requirements.txt --quiet

# ---- Install Node deps ----
echo "[2/4] Installing Node.js dependencies..."
cd MoreClient
npm install --silent
cd ..

# ---- Seed knowledge base (only if DB is empty) ----
echo "[3/4] Seeding demo knowledge base (skipped if already seeded)..."
python -c "
from backend.models.database import SessionLocal, init_db
from backend.models.tables import Document
init_db()
db = SessionLocal()
count = db.query(Document).count()
db.close()
if count == 0:
    import subprocess, sys
    subprocess.run([sys.executable, '-m', 'backend.scripts.seed_demo'], check=True)
    print('Seed complete.')
else:
    print(f'KB already has {count} documents, skipping seed.')
"

# ---- Start frontend in background ----
echo "[4/4] Starting frontend on :5000 and backend on :8000..."
cd MoreClient && npm run build && npm run start &
cd ..

# ---- Start backend (foreground) ----
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Make it executable:
```bash
chmod +x start_replit.sh
```

### Step 2.5 — Set Replit Secrets (Environment Variables)

In Replit sidebar → **Secrets** tab, add these key-value pairs:

#### Required (app will not start without these in production)
| Secret Key | Value | Notes |
|-----------|-------|-------|
| `APP_SECRET` | `any-long-random-string-32chars` | Generate with: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ADMIN_API_KEY` | `your-admin-key-here` | Used in `X-Admin-Key` header to access `/api/admin/*` |

#### LLM Keys (need at least ONE)
| Secret Key | Example Value | Provider |
|-----------|--------------|---------|
| `GEMINI_API_KEY` | `AIzaSy...` | Google AI Studio → free tier available |
| `OPENAI_API_KEY` | `sk-...` | OpenAI platform |
| `NVIDIA_API_KEY` | `nvapi-...` | NVIDIA (DeepSeek) |

#### Channel Keys (only if using Telegram/WhatsApp)
| Secret Key | Value | Notes |
|-----------|-------|-------|
| `TELEGRAM_BOT_TOKEN` | `123456:ABC...` | BotFather on Telegram |
| `TWILIO_ACCOUNT_SID` | `ACxxx...` | Twilio console |
| `TWILIO_AUTH_TOKEN` | `...` | Twilio console |
| `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+14155238886` | Twilio sandbox number |

#### URLs (set after Replit gives you a domain)
| Secret Key | Value | Notes |
|-----------|-------|-------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-REPLIT-SLUG.replit.app:8000` | Backend public URL |
| `ALLOWED_ORIGINS` | `https://YOUR-REPLIT-SLUG.replit.app` | CORS (no trailing slash) |
| `BACKEND_PUBLIC_URL` | `https://YOUR-REPLIT-SLUG.replit.app:8000` | For Twilio webhook validation |
| `FRONTEND_URL` | `https://YOUR-REPLIT-SLUG.replit.app` | For OAuth redirects |

#### Optional Performance Tweaks
| Secret Key | Value | Notes |
|-----------|-------|-------|
| `LLM_PROVIDER` | `gemini` | Pin to fastest provider |
| `CONFIDENCE_THRESHOLD` | `0.40` | Lower = more answers, fewer escalations |
| `RETRIEVAL_K` | `3` | Chunks to retrieve (3 is good balance) |
| `MEMORY_WINDOW` | `8` | Conversation history turns |
| `ENV` | `production` | Enables strict security checks |

### Step 2.6 — Update `MoreClient/package.json` start command

Make sure the `start` script uses port 5000 and binds to 0.0.0.0:
```json
{
  "scripts": {
    "dev": "next dev -p 5000 --hostname 0.0.0.0",
    "build": "next build",
    "start": "next start -p 5000 --hostname 0.0.0.0",
    "lint": "eslint",
    "typecheck": "tsc --noEmit"
  }
}
```

### Step 2.7 — Verify Deployment

After clicking **Run** in Replit, check these URLs:

| URL | Expected Response |
|-----|------------------|
| `https://YOUR-SLUG.replit.app` | Frontend landing page |
| `https://YOUR-SLUG.replit.app/dashboard` | Dashboard (login required) |
| `https://YOUR-SLUG.replit.app:8000/health` | `{"status":"ok","db":"ok","chroma":"ok"}` |
| `https://YOUR-SLUG.replit.app:8000/api/settings` | JSON with bot settings |
| `https://YOUR-SLUG.replit.app/widget` | Standalone chat widget |

---

## SECTION 3 — UI ENHANCEMENTS (Don't Show as AI)

**Goal:** The end customer should feel they're talking to the company's support team, not a bot.
Every "AI" label, robot icon, and technical term must be replaced with human-facing language.

### 3.1 — Update Translation Keys in `MoreClient/src/components/language-provider.tsx`

Find these keys and replace their values:

**CHANGE these English translations:**
```typescript
// BEFORE:
"bot": "AI Bot"
"escalating": "Escalating to human agent..."
"handoff": "Handoff"
"aiResponse": "AI Response"
"poweredBy": "Powered by AI"

// AFTER:
"bot": "Support Team"          // Use company bot_name from settings
"escalating": "Connecting you with our support team..."
"handoff": "Support Ticket"
"aiResponse": "Response"
"poweredBy": "clientMORE"
```

**CHANGE these Arabic translations:**
```typescript
// BEFORE:
"bot": "روبوت الذكاء الاصطناعي"
"escalating": "جاري التصعيد إلى وكيل بشري..."
"handoff": "تحويل"

// AFTER:
"bot": "فريق الدعم"
"escalating": "جاري تحويلك إلى فريق الدعم..."
"handoff": "تذكرة دعم"
```

### 3.2 — Humanize the Bot's System Prompt in `backend/services/ai/rag.py`

Find the `_build_system_prompt()` function (or wherever the system prompt is constructed).
Replace the system prompt template with this:

```python
SYSTEM_PROMPT_TEMPLATE = """You are a helpful support representative for {company_name}.
Your name is {bot_name}.

CRITICAL RULES:
1. ONLY answer using the information provided in the context below. Never make up facts.
2. If the context does not contain the answer, respond ONLY with: __NO_ANSWER__
3. Speak in first person ("I", "we", "our team").
4. Never mention "AI", "language model", "artificial intelligence", or "bot" — you are a human support rep.
5. Keep answers concise and warm. Maximum 4 sentences unless the question requires more detail.
6. If the customer asks if you are a human or AI, say: "I'm {bot_name} from {company_name}'s support team, here to help!"
7. Match the customer's language: if they write in Arabic, respond in Arabic. If English, respond in English.
8. Tone: {bot_tone}.

KNOWLEDGE BASE CONTEXT:
{context}

CONVERSATION HISTORY:
{history}

Remember: Answer ONLY from the context above. If unsure, say __NO_ANSWER__."""
```

### 3.3 — Humanize Escalation Messages in `backend/services/chat_service.py`

Find the `_escalation_message()` function or wherever escalation responses are returned.
Replace with:

```python
ESCALATION_MESSAGES = {
    "en": (
        "I'd like to make sure you get the best help possible. "
        "I'm connecting you with one of our support team members right now. "
        "They'll be with you shortly — please hold on. 🙏"
    ),
    "ar": (
        "أريد التأكد من حصولك على أفضل مساعدة ممكنة. "
        "سأقوم بتحويلك إلى أحد أعضاء فريق الدعم الآن. "
        "سيكونون معك قريباً — يرجى الانتظار. 🙏"
    ),
}

ALREADY_IN_HANDOFF_MESSAGES = {
    "en": (
        "Our support team has your request and will respond shortly. "
        "Thank you for your patience! 😊"
    ),
    "ar": (
        "فريق الدعم لدينا لديه طلبك وسيرد قريباً. "
        "شكراً على صبرك! 😊"
    ),
}
```

### 3.4 — Replace "Bot" Badge in Handoffs Page

In `MoreClient/src/app/dashboard/handoffs/page.tsx`, find where the message role is displayed.

**BEFORE:**
```tsx
{msg.role === "assistant" && <span className="badge">Bot</span>}
```

**AFTER:**
```tsx
{msg.role === "assistant" && (
  <span className="badge">{botName || "Support Bot"}</span>
)}
```

Where `botName` comes from: `const { botName } = useLanguage();` (already in context).

### 3.5 — Widget: Show Company Logo and Name

In `MoreClient/src/app/widget/page.tsx`, replace the generic AI icon with:
```tsx
// Show company logo from settings, with name fallback
<div className="flex items-center gap-2">
  {companyLogo ? (
    <img src={companyLogo} alt={companyName} className="h-8 w-8 rounded-full object-cover" />
  ) : (
    <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
      {(companyName || "S").charAt(0).toUpperCase()}
    </div>
  )}
  <span className="font-semibold text-sm">{botName || companyName || "Support"}</span>
</div>
```

### 3.6 — Remove "Powered by AI" footers

Search all `.tsx` files for "powered by" (case-insensitive) and remove or replace with:
```tsx
// REMOVE any "Powered by AI" or "Built with AI" text
// REPLACE with empty string or:
<span className="text-xs text-gray-500">clientMORE</span>
```

---

## SECTION 4 — LITE / OPTIMIZED BUILD

### 4.1 — Backend: Switch to Lighter LLM Model

In `backend/core/config.py`, change these defaults:

```python
# BEFORE:
GEMINI_CHAT_MODEL: str = "gemini-2.5-flash"

# AFTER (2x faster, 3x cheaper, nearly same quality for support):
GEMINI_CHAT_MODEL: str = "gemini-2.0-flash-lite"
```

Also add a new env flag:
```python
ENABLE_LONG_TERM_MEMORY: bool = Field(default=False, env="ENABLE_LONG_TERM_MEMORY")
```

### 4.2 — Backend: Cache Language Detection

In `backend/services/chat_service.py`, inside the `handle()` function, BEFORE calling `detect_language`:

```python
# Cache language on the conversation so we don't re-detect every message
if conv.language:
    lang = conv.language
else:
    lang = detect_language(message)
    conv.language = lang
    db.add(conv)
    # Do NOT commit here — commit happens at end of handle()
```

This requires `language` column on Conversation. Add to `backend/models/tables.py`:
```python
class Conversation(Base):
    # ... existing columns ...
    language: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)  # "en" or "ar"
```

### 4.3 — Backend: Disable Long-Term Memory by Default

In `backend/services/chat_service.py`, wrap the long-term memory call:

```python
from backend.core.config import settings

# Inside handle():
long_term_context = ""
if settings.ENABLE_LONG_TERM_MEMORY:
    long_term_context = await get_long_term_memory(conv.customer_ref)
```

### 4.4 — Frontend: Remove Dead Scaffold

Delete these directories (they are never used and add confusion):
```bash
rm -rf MoreClient/src/app/api/
rm -rf MoreClient/src/server/
```

### 4.5 — Frontend: Standalone Output for Smaller Docker Image

In `MoreClient/next.config.ts`, add:
```typescript
const nextConfig: NextConfig = {
  output: 'standalone',   // ← add this line
  // ... rest of config
};
```

### 4.6 — Lower Retrieval K for Faster Responses

In `backend/core/config.py`:
```python
RETRIEVAL_K: int = Field(default=3, env="RETRIEVAL_K")  # was 4
```

Or set `RETRIEVAL_K=3` in Replit Secrets.

---

## SECTION 5 — BUG FIXES (All Known Issues)

### Bug #1 CRITICAL — Admin Routes Have No Authentication

**File:** `backend/routers/admin.py`

**Problem:** All `/api/admin/*` routes are publicly accessible — anyone can read/delete tenants.

**Fix:** Add the `require_admin_key` dependency to every admin router endpoint.

Find the file and add at the top:
```python
from backend.core.security import require_admin_key
```

Then add `Depends(require_admin_key)` to every route:
```python
# BEFORE:
@router.get("/tenants")
async def list_tenants(db: Session = Depends(get_db)):

# AFTER:
@router.get("/tenants")
async def list_tenants(
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_key)   # ← add this
):
```

Repeat for ALL routes in `admin.py`: list_tenants, create_tenant, update_tenant, delete_tenant,
toggle_status, get_kpis, get_health.

### Bug #2 HIGH — Handoff Delivery Failures Are Silent

**File:** `backend/services/handoff_delivery.py`

**Problem:** If Telegram/Twilio delivery fails, the exception is caught and swallowed. The customer
never gets the agent's reply. No one knows about the failure.

**Fix Step 1:** Add `delivery_status` column to `Handoff` table in `backend/models/tables.py`:
```python
class Handoff(Base):
    # ... existing columns ...
    delivery_status: Mapped[str] = mapped_column(
        String(20), default="not_attempted"
    )  # not_attempted | sent | failed
    delivery_attempts: Mapped[int] = mapped_column(Integer, default=0)
    delivery_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
```

**Fix Step 2:** In `backend/services/handoff_delivery.py`, update the delivery functions:
```python
async def deliver_agent_reply(db: Session, handoff_id: int, reply_text: str) -> bool:
    handoff = db.get(Handoff, handoff_id)
    if not handoff:
        return False

    success = False
    error_msg = None
    
    for attempt in range(3):  # retry up to 3 times
        try:
            if handoff.channel == "telegram":
                await _deliver_telegram(handoff, reply_text)
            elif handoff.channel == "whatsapp":
                await _deliver_whatsapp(handoff, reply_text)
            elif handoff.channel == "web":
                await _deliver_web(handoff, reply_text)
            success = True
            break
        except Exception as e:
            error_msg = str(e)
            logger.warning(f"Delivery attempt {attempt+1}/3 failed for handoff {handoff_id}: {e}")
            if attempt < 2:
                await asyncio.sleep(2 ** attempt)  # 1s, 2s backoff
    
    handoff.delivery_status = "sent" if success else "failed"
    handoff.delivery_attempts = 3 if not success else (attempt + 1)
    handoff.delivery_error = error_msg if not success else None
    db.add(handoff)
    db.commit()
    
    if not success:
        logger.error(f"DELIVERY FAILED for handoff {handoff_id} after 3 attempts: {error_msg}")
    
    return success
```

### Bug #3 HIGH — Demo Access Bypasses All Auth

**File:** `MoreClient/src/app/welcome/page.tsx`

**Problem:** `handleDemoAccess()` just sets `sessionStorage.setItem("userRole", "company")` and
redirects to `/dashboard`. No backend validation. Anyone can access the dashboard.

**Fix:** Create a real demo endpoint on the backend that returns a time-limited token.

In `backend/routers/auth.py`, add:
```python
@router.post("/demo-login")
async def demo_login(db: Session = Depends(get_db)):
    """Returns a 1-hour demo session token."""
    from backend.core.security import create_access_token
    from datetime import timedelta
    token = create_access_token(
        data={"sub": "demo_user", "role": "company", "tenant_key": settings.DEFAULT_TENANT_KEY},
        expires_delta=timedelta(hours=1)
    )
    return {"token": token, "role": "company", "redirectTo": "/dashboard"}
```

In `MoreClient/src/lib/api.ts`, add:
```typescript
export async function demoLogin(): Promise<AuthSessionOut> {
  return apiSend<AuthSessionOut>("/api/auth/demo-login", "POST", {});
}
```

In `MoreClient/src/app/welcome/page.tsx`, replace `handleDemoAccess`:
```typescript
async function handleDemoAccess() {
  try {
    const session = await demoLogin();
    localStorage.setItem("authToken", session.token);
    sessionStorage.setItem("userRole", session.role);
    router.push(session.redirectTo || "/dashboard");
  } catch {
    setError("Demo access unavailable. Please try again.");
  }
}
```

### Bug #4 MEDIUM — Learned Answer Chunks Orphan in ChromaDB

**File:** `backend/routers/learn.py` (or wherever learned answers are deleted)

**Problem:** When an admin deletes a learned answer from the DB, its vector chunk in ChromaDB
(`learned-{id}`) is never removed. Over time the KB fills with stale knowledge.

**Fix:** In the delete endpoint for learned answers, also delete from Chroma:
```python
@router.delete("/learn/{answer_id}")
async def delete_learned_answer(answer_id: int, db: Session = Depends(get_db)):
    answer = db.get(LearnedAnswer, answer_id)
    if not answer:
        raise HTTPException(404, "Learned answer not found")
    
    # Delete from ChromaDB first
    from backend.services.ai.vectorstore import get_collection
    collection = get_collection()
    try:
        collection.delete(ids=[f"learned-{answer_id}"])
    except Exception as e:
        logger.warning(f"Chroma delete failed for learned-{answer_id}: {e}")
    
    # Delete from SQL
    db.delete(answer)
    db.commit()
    return {"deleted": answer_id}
```

### Bug #5 MEDIUM — Files Page Polling Silently Gives Up

**File:** `MoreClient/src/app/dashboard/files/page.tsx`

**Problem:** After 20 polling attempts (~20 seconds), the code stops polling and the UI shows
"Indexing..." indefinitely with no feedback to the user.

**Fix:** After the polling loop, update the file status to show it's taking longer:
```typescript
// After the polling loop exits (attempt === MAX_ATTEMPTS):
if (attempt >= MAX_ATTEMPTS) {
  setFiles(prev => prev.map(f =>
    f.id === uploadedFile.id
      ? { ...f, status: "processing", statusLabel: "Still indexing... (may take a few minutes)" }
      : f
  ));
  // Switch to slower background polling every 30s
  const slowPoll = setInterval(async () => {
    const files = await apiGet<FileOut[]>("/api/files");
    const updated = files.find(f => f.id === uploadedFile.id);
    if (updated?.status === "completed") {
      clearInterval(slowPoll);
      setFiles(prev => prev.map(f => f.id === uploadedFile.id ? updated : f));
    }
  }, 30_000);
  setTimeout(() => clearInterval(slowPoll), 10 * 60_000); // give up after 10 min
}
```

### Bug #6 MEDIUM — WebSocket No User Feedback on Persistent Disconnect

**File:** `MoreClient/src/components/notification-bell.tsx`
**Also:** `MoreClient/src/app/dashboard/page.tsx`

**Problem:** If the backend is down for more than 5 failed reconnects, the user has no idea
that real-time updates have stopped.

**Fix:** Add a connection status state and show a banner:
```typescript
const [wsConnected, setWsConnected] = useState(true);
const reconnectAttempts = useRef(0);

// In the WebSocket setup:
ws.onopen = () => {
  reconnectAttempts.current = 0;
  setWsConnected(true);
};

ws.onclose = () => {
  reconnectAttempts.current += 1;
  if (reconnectAttempts.current >= 5) {
    setWsConnected(false);
  }
  // ... existing reconnect logic
};

// In the JSX:
{!wsConnected && (
  <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs px-3 py-1 rounded-full">
    Live updates paused — reconnecting...
  </div>
)}
```

### Bug #7 LOW — Optimistic Delete Flicker on Failure

**File:** `MoreClient/src/app/dashboard/files/page.tsx`

**Problem:** File is removed from UI before server confirms deletion. If server returns error,
file disappears and then reappears — confusing UX.

**Fix:** Remove optimistically, restore on error:
```typescript
async function handleDelete(fileId: number) {
  const previous = files;           // save snapshot
  setFiles(prev => prev.filter(f => f.id !== fileId));  // optimistic remove
  try {
    await apiSend(`/api/files/${fileId}`, "DELETE", {});
  } catch (err) {
    setFiles(previous);             // restore on failure
    setError("Failed to delete file. Please try again.");
  }
}
```

### Bug #8 LOW — Admin Key in sessionStorage (XSS Risk)

**File:** `MoreClient/src/lib/api.ts`

**Problem:** Admin API key is stored in `sessionStorage`, readable by any XSS script.

**Fix (short-term):** Move admin key to an in-memory variable (lost on page refresh, but safer):
```typescript
// In api.ts:
let _adminKeyMemory: string | null = null;

export function setAdminKey(key: string) {
  _adminKeyMemory = key;
}

export function getAdminKey(): string | null {
  return _adminKeyMemory ?? sessionStorage.getItem("adminKey");
}
```

**Fix (long-term):** Use HttpOnly cookies set by the server after admin login — requires backend
auth to be fully wired.

---

## SECTION 6 — RAG + REPLY QUALITY ENHANCEMENTS

### 6.1 — Better System Prompt (Full Replacement)

In `backend/services/ai/rag.py`, replace the system prompt builder with this:

```python
def _build_system_prompt(settings: Setting, context: str, history: str, lang: str) -> str:
    tone_map = {
        "friendly": "warm, friendly, and approachable",
        "professional": "professional and clear",
        "formal": "formal and polished",
    }
    tone = tone_map.get(settings.bot_tone, "professional and clear")
    
    lang_instruction = (
        "Respond in Arabic (العربية). Use clear Modern Standard Arabic."
        if lang == "ar"
        else "Respond in English."
    )
    
    return f"""You are {settings.bot_name}, a support representative for {settings.company_name}.
You speak directly to customers and help them get answers quickly.

STYLE: {tone}
LANGUAGE: {lang_instruction}

HARD RULES:
- Answer ONLY from the KNOWLEDGE BASE CONTEXT provided below.
- If the context does not contain the answer, respond with ONLY: __NO_ANSWER__
- Never say "AI", "language model", "bot", or "artificial intelligence".
- Never make up information, prices, dates, or facts not in the context.
- Use first person: "I", "we", "our team", "our products".
- If asked "are you a bot/AI/robot?": say "I'm {settings.bot_name} from {settings.company_name}, happy to help!"
- Keep answers SHORT (2-4 sentences) unless the question requires a detailed list.
- For lists, use bullet points: •
- End Arabic responses naturally; no "والله أعلم" or religious phrases unless context uses them.

{('ADDITIONAL INSTRUCTIONS: ' + settings.system_prompt_extra) if settings.system_prompt_extra else ''}

--- KNOWLEDGE BASE CONTEXT ---
{context}
--- END CONTEXT ---

--- RECENT CONVERSATION ---
{history}
--- END CONVERSATION ---

Customer's question will follow. Answer based ONLY on the context above."""
```

### 6.2 — Confidence Calibration for Arabic

Arabic text has lower cosine similarity scores than English with the same semantic meaning.
In `backend/services/ai/rag.py`, adjust the threshold check:

```python
# Find the confidence gate check and update:
def _get_effective_threshold(lang: str, setting_threshold: float) -> float:
    """Arabic embeddings score lower — apply a correction."""
    if lang == "ar":
        return max(0.30, setting_threshold - 0.08)  # lower threshold for AR
    return setting_threshold

# Use it:
effective_threshold = _get_effective_threshold(lang, settings.confidence_threshold)
if top_confidence < effective_threshold:
    return FallbackStrategy(reason="low_confidence")
```

### 6.3 — Deduplicate Overlapping Chunks

Before passing context to LLM, deduplicate chunks from the same document that overlap.
In `backend/services/ai/rag.py` inside `VectorRagStrategy.run()`:

```python
def _dedup_chunks(chunks: list[dict]) -> list[dict]:
    """Remove chunks whose text is >80% contained in a longer chunk from same doc."""
    seen_texts = []
    result = []
    for chunk in sorted(chunks, key=lambda c: -len(c["document"])):  # longest first
        text = chunk["document"].strip()
        is_duplicate = any(
            text in seen or seen.startswith(text[:100])
            for seen in seen_texts
        )
        if not is_duplicate:
            seen_texts.append(text)
            result.append(chunk)
    return result

# Call before building context:
chunks = _dedup_chunks(retrieved_chunks)
```

### 6.4 — Source Citation in Answers

After generating an answer, append the source document name for transparency.
In `backend/services/ai/rag.py`:

```python
# After LLM generation, if answer is valid:
if top_chunk and settings.show_source_citation:  # add show_source_citation to Setting
    source_title = top_chunk.get("metadata", {}).get("source", "")
    if source_title:
        if lang == "ar":
            answer += f"\n\n📄 *المصدر: {source_title}*"
        else:
            answer += f"\n\n📄 *Source: {source_title}*"
```

Add to `Setting` model in `backend/models/tables.py`:
```python
show_source_citation: Mapped[bool] = mapped_column(Boolean, default=False)
```

### 6.5 — Expand Arabic Rejection Detection

In `backend/services/ai/rag.py`, in the `_is_no_answer()` or equivalent function:

```python
NO_ANSWER_PHRASES = [
    # Sentinel
    "__NO_ANSWER__",
    # English
    "i don't have information", "i don't know", "i cannot find",
    "not available in", "not mentioned", "no information",
    "outside the scope", "cannot answer", "unable to answer",
    # Arabic — expanded list
    "لا أعلم", "لا أعرف", "لا توجد معلومات", "غير متاح",
    "لم يُذكر", "خارج نطاق", "لا يمكنني الإجابة",
    "لا تتوفر لدي معلومات", "لا أملك إجابة",
    "المعلومات غير موجودة", "لا يوجد في السياق",
    "لم أجد", "لا أستطيع الإجابة",
]

def _is_no_answer(text: str) -> bool:
    text_lower = text.strip().lower()
    return any(phrase in text_lower for phrase in NO_ANSWER_PHRASES)
```

### 6.6 — Hybrid Search Configuration

Make sure hybrid search is enabled. In `backend/core/config.py`:
```python
ENABLE_HYBRID_SEARCH: bool = Field(default=True, env="ENABLE_HYBRID_SEARCH")
```

In `backend/services/ai/retrieval.py`, check that `hybrid_search()` is called when enabled:
```python
from backend.core.config import settings

def search(query: str, k: int, tenant_key: str) -> list[dict]:
    if settings.ENABLE_HYBRID_SEARCH:
        return hybrid_search(query, k, tenant_key)
    else:
        return vector_search(query, k, tenant_key)
```

---

## SECTION 7 — HANDOFF FEEDBACK ENHANCEMENTS

### 7.1 — Show Time-in-Queue (SLA Timer)

In `MoreClient/src/app/dashboard/handoffs/page.tsx`, add a helper and render it:

```typescript
function getTimeInQueue(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ${diffMin % 60}m`;
}

function isOverdue(createdAt: string): boolean {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  return diffMs > 60 * 60_000; // 1 hour
}

// In the ticket list item:
<div className={`text-xs ${isOverdue(ticket.createdAt) ? "text-red-400 font-semibold" : "text-gray-500"}`}>
  ⏱ {getTimeInQueue(ticket.createdAt)}
  {isOverdue(ticket.createdAt) && " — OVERDUE"}
</div>
```

### 7.2 — Resolution Satisfaction Prompt

After resolving a handoff ticket, ask the admin:

In `MoreClient/src/app/dashboard/handoffs/page.tsx`, after the resolve call succeeds:

```typescript
// After resolving:
const satisfied = window.confirm(
  `Was this ticket resolved satisfactorily?\n\nClick OK for Yes, Cancel for No.`
);

// Send feedback to backend:
await apiSend(`/api/handoffs/${activeHandoff.id}/feedback`, "POST", {
  satisfied
});

// Remove from list
setHandoffs(prev => prev.filter(h => h.id !== activeHandoff.id));
setActiveHandoff(null);
```

In `backend/routers/handoffs.py`, add the feedback endpoint:
```python
@router.post("/handoffs/{handoff_id}/feedback")
async def handoff_feedback(
    handoff_id: int,
    body: dict,
    db: Session = Depends(get_db)
):
    handoff = db.get(Handoff, handoff_id)
    if not handoff:
        raise HTTPException(404)
    handoff.resolved_satisfactorily = body.get("satisfied", True)
    db.add(handoff)
    db.commit()
    return {"ok": True}
```

Add column to `Handoff` in `backend/models/tables.py`:
```python
resolved_satisfactorily: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
```

### 7.3 — One-Click "Use Bot Reply as Answer" in Handoffs

In `MoreClient/src/app/dashboard/handoffs/page.tsx`, add a button next to each bot message
in the active chat panel that auto-fills the "Inject Answer" modal:

```typescript
// Find the last bot message in the conversation
const lastBotMessage = activeHandoff.messages
  .filter(m => m.role === "assistant")
  .at(-1);

// Find the question that triggered the handoff
const escalationQuestion = activeHandoff.messages
  .filter(m => m.role === "user")
  .at(-1);

// Button in the "Add to KB" section:
<button
  onClick={() => {
    setLearnQuestion(escalationQuestion?.content || "");
    setLearnAnswer(lastBotMessage?.content || "");
    setLearnModalOpen(true);
  }}
  disabled={!lastBotMessage || !escalationQuestion}
  className="text-xs px-3 py-1.5 bg-purple-600/20 text-purple-300 rounded-lg hover:bg-purple-600/30 disabled:opacity-40"
>
  📚 Use last bot reply as KB answer
</button>
```

### 7.4 — Delivery Status Badge in Handoffs List

In `MoreClient/src/app/dashboard/handoffs/page.tsx`, in the ticket list, show delivery status:

```typescript
// In the ticket list item (left panel):
{ticket.deliveryStatus === "failed" && (
  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
    ⚠ Delivery failed
  </span>
)}
{ticket.deliveryStatus === "sent" && (
  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
    ✓ Delivered
  </span>
)}
```

Make sure `HandoffOut` schema in `backend/schemas/handoffs.py` includes:
```python
class HandoffOut(BaseModel):
    # ... existing fields ...
    delivery_status: Optional[str] = Field(None, alias="deliveryStatus")
    delivery_error: Optional[str] = Field(None, alias="deliveryError")
```

### 7.5 — Unread Handoff Count in Browser Tab Title

In `MoreClient/src/app/dashboard/handoffs/page.tsx`:

```typescript
// Count unreplied tickets
const unrepliedCount = handoffs.filter(h => !h.hasAgentReply).length;

useEffect(() => {
  if (unrepliedCount > 0) {
    document.title = `(${unrepliedCount}) Handoffs — clientMORE`;
  } else {
    document.title = "Handoffs — clientMORE";
  }
  return () => { document.title = "clientMORE"; };
}, [unrepliedCount]);
```

---

## SECTION 8 — DATABASE SCHEMA MIGRATIONS

Since there is **no migration tool**, add new columns safely using SQLAlchemy's `create_all`
plus a manual `upgrade_existing_schema()` pattern already used in `backend/models/tables.py`.

Add this to the `upgrade_existing_schema()` function in `backend/models/tables.py`:

```python
def upgrade_existing_schema(engine):
    """Safely add new columns to existing DB without dropping data."""
    with engine.connect() as conn:
        # Add new columns to handoffs table
        _add_column_if_missing(conn, "handoffs", "delivery_status", "VARCHAR(20) DEFAULT 'not_attempted'")
        _add_column_if_missing(conn, "handoffs", "delivery_attempts", "INTEGER DEFAULT 0")
        _add_column_if_missing(conn, "handoffs", "delivery_error", "TEXT")
        _add_column_if_missing(conn, "handoffs", "resolved_satisfactorily", "BOOLEAN")
        
        # Add new column to conversations table
        _add_column_if_missing(conn, "conversations", "language", "VARCHAR(2)")
        
        # Add new column to settings table
        _add_column_if_missing(conn, "settings", "show_source_citation", "BOOLEAN DEFAULT 0")
        
        conn.commit()

def _add_column_if_missing(conn, table: str, column: str, column_def: str):
    """Add column to table if it doesn't already exist."""
    from sqlalchemy import text
    try:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {column_def}"))
    except Exception:
        pass  # Column already exists — ignore
```

Make sure `upgrade_existing_schema(engine)` is called in `backend/models/database.py`
inside `init_db()`:
```python
def init_db():
    Base.metadata.create_all(bind=engine)
    upgrade_existing_schema(engine)
```

---

## SECTION 9 — ENVIRONMENT VARIABLE REFERENCE (Complete List)

Copy this as a `.env` file template (fill in your values, never commit to git):

```env
# ============================================================
# clientMORE — Environment Variables
# ============================================================

# --- Core ---
ENV=production                          # dev | production
APP_SECRET=CHANGE_ME_RANDOM_64_CHARS    # JWT signing secret
ADMIN_API_KEY=CHANGE_ME_ADMIN_KEY       # Admin API key for /api/admin/*
DATABASE_URL=sqlite:///./backend.db     # SQLite path (or PostgreSQL URL)
CHROMA_DIR=./chroma_store               # ChromaDB persistent path
DEFAULT_TENANT_KEY=telnet               # Default single-tenant key
ALLOWED_ORIGINS=http://localhost:5000   # CORS (comma-separated)

# --- LLM Providers (need at least ONE) ---
GEMINI_API_KEY=                         # Google AI Studio
OPENAI_API_KEY=                         # OpenAI
NVIDIA_API_KEY=                         # NVIDIA (DeepSeek)
MISTRAL_API_KEY=                        # Mistral
LLM_PROVIDER=auto                       # auto | gemini | openai | deepseek | mistral

# --- LLM Models ---
GEMINI_CHAT_MODEL=gemini-2.0-flash-lite # Lite model (fast + cheap)
GEMINI_EMBED_MODEL=gemini-embedding-001
CHAT_MODEL=gpt-4o                       # OpenAI fallback
EMBED_MODEL=text-embedding-3-small
EMBED_DIM=1536

# --- RAG Configuration ---
CONFIDENCE_THRESHOLD=0.40               # 0.35-0.50 recommended
RETRIEVAL_K=3                           # Chunks to retrieve (3-5)
MEMORY_WINDOW=8                         # Conversation history turns (5-10)
ENABLE_HYBRID_SEARCH=true               # true = vector + lexical reranking
ENABLE_LONG_TERM_MEMORY=false           # false = faster, less memory

# --- URLs (update after Replit gives you domain) ---
NEXT_PUBLIC_API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5000
BACKEND_PUBLIC_URL=http://localhost:8000

# --- Channels (optional) ---
TELEGRAM_WEBHOOK_SECRET=                # Optional header check
TWILIO_ACCOUNT_SID=                     # Twilio for WhatsApp
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=

# --- Auth (scaffolded, not fully wired) ---
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
```

---

## SECTION 10 — QUICK VERIFICATION CHECKLIST

After deploying, verify each item:

### Backend Health
```bash
# Should return: {"status":"ok","db":"ok","chroma":"ok","llm_providers":["gemini"]}
curl https://YOUR-SLUG.replit.app:8000/health

# Should return settings JSON (not 401)
curl https://YOUR-SLUG.replit.app:8000/api/settings

# Should return 401 Unauthorized (admin key required)
curl https://YOUR-SLUG.replit.app:8000/api/admin/tenants
# Should return tenant list
curl -H "X-Admin-Key: YOUR_ADMIN_KEY" https://YOUR-SLUG.replit.app:8000/api/admin/tenants
```

### Chat Flow Test
```bash
# Test a question (should return confident answer or handoff)
curl -X POST https://YOUR-SLUG.replit.app:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What services do you offer?", "session_id": "test-123", "channel": "web"}'

# Test escalation trigger
curl -X POST https://YOUR-SLUG.replit.app:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to talk to a human", "session_id": "test-123", "channel": "web"}'
```

### Frontend Pages
- [ ] `/` — Landing page loads (no blank page)
- [ ] `/welcome` — Login form visible, no console errors
- [ ] `/dashboard` — Redirects to login if no token
- [ ] `/dashboard` (logged in) — KPI cards load, charts visible
- [ ] `/dashboard/files` — Upload zone visible
- [ ] `/dashboard/handoffs` — Ticket queue loads (may be empty)
- [ ] `/dashboard/settings` — Bot config form loads
- [ ] `/widget` — Chat widget loads with company name (NOT "AI Bot")
- [ ] `/admin` — Requires admin key (should prompt or show 401)

### UI Human-Facing Check
- [ ] Widget header shows company name, NOT "AI Bot"
- [ ] Bot messages in handoffs show bot_name, NOT "Bot"
- [ ] Escalation message says "Connecting you with our support team..."
- [ ] No "Powered by AI" text visible anywhere in widget or public chat

---

## SECTION 11 — RECOMMENDED REPLIT PLAN & RESOURCE NOTES

- **Replit Hacker plan or above** is recommended (always-on + more RAM)
- The app needs ~512MB RAM minimum (ChromaDB loads into memory)
- SQLite + ChromaDB persist in the Replit workspace — they survive restarts
- If you restart the Replit after seeding, ChromaDB stays — no need to re-seed
- The backend takes ~15-30 seconds to cold-start (Chroma warm-up)
- For production traffic, consider upgrading to Replit Teams + Autoscale, or migrate to Railway/Render

---

## SECTION 12 — COMMON ERRORS & FIXES

| Error | Cause | Fix |
|-------|-------|-----|
| `ChromaDB: collection not found` | Server started before Chroma warmed up | Wait 30s and refresh; or restart backend |
| `500 on retrieval after seeding` | Chroma is single-writer — seeding from separate process conflicts | Always seed BEFORE starting the server; restart after seeding |
| `CORS error in browser` | `ALLOWED_ORIGINS` doesn't match your Replit URL | Add exact Replit URL to `ALLOWED_ORIGINS` secret (no trailing slash) |
| `WebSocket connection failed` | Frontend `NEXT_PUBLIC_API_URL` uses `http://` but needs `https://` | Update env to use `https://` URL on Replit |
| `429 Too Many Requests` from LLM | Free tier rate limit hit | Add sleep between requests, or upgrade to paid LLM tier |
| `401 Unauthorized` on `/api/admin/*` | Missing `X-Admin-Key` header | Pass `X-Admin-Key: YOUR_ADMIN_KEY` header in all admin requests |
| Next.js `Module not found: server/` | Dead scaffold imported | Delete `MoreClient/src/server/` and `MoreClient/src/app/api/` |
| `backend.db` permission error on Replit | Wrong working directory | Ensure uvicorn is run from git root, not from `backend/` |

---

*End of clientMORE Replit Deployment & Enhancement Guide*
*Generated for project at: /home/mahmoud/Desktop/MoreClint*
