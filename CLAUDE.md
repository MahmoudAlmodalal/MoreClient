# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo actually is (read first)

The product is **clientMORE**: a bilingual (Arabic/English) AI customer-support bot that
answers from a customer's own documents (RAG), works across Web / Telegram / WhatsApp, and
escalates to a human when unsure. The running system is **two apps**:

- **Backend — Python FastAPI** in [`backend/`](backend/) (git-root level), served on **:8000**. This is the real
  brain: ingestion, RAG, channels, handoff. SQLite + ChromaDB. Untracked in git but it is the
  live system.
- **Frontend — Next.js 16** in the **nested** [`MoreClient/`](MoreClient/) subdirectory, served on **:5000**.
  A thin dashboard/widget that talks to the FastAPI backend over HTTP.

### Beware: blueprint ≠ implementation

This repo contains an aspirational architecture (a TypeScript modular monolith with Prisma,
Clerk, Inngest, Stripe, Pusher) in the planning docs and in *unfinished scaffold*. **It is not
the running app.** Specifically, these are NOT implemented and you should not treat them as real:

- `MoreClient/src/server/` — broken stub (e.g. `admin/billing.ts` imports non-existent `core/*`).
- `MoreClient/src/app/api/v1/...` — a lone admin route that references the missing TS backend.
- There is **no `schema.prisma`**, no Prisma/Inngest/Stripe/Pusher wiring, and **no `src/proxy.ts`/middleware**.
- The top-level [`frontend/`](frontend/) directory is a separate, unused Vite SPA prototype — **dead scaffold**.
- The planning docs (`fullstack-plan.md`, `backend-plan.md`, `REPLIT-ADMIN-PROMPT.md`) are CTO-approved
  *intent/roadmap*. The implemented code is a much smaller, Python-based subset. **Trust the code.**
- **Auth is half-scaffolded, not wired.** There is a `sign-up` page with Google/Apple buttons, OAuth
  config keys (`GOOGLE_CLIENT_ID`/`APPLE_CLIENT_ID`…), and an `AuthUser` table — but **no backend auth
  router and no working login flow**. Treat auth as not-yet-functional unless you're building it out.
  Likewise `admin.py` and the `/admin` page expose tenant CRUD with **no real authentication** guarding them.

If you're asked to "follow the architecture," follow the **Python backend** described below, not the
TS blueprint — unless the user is explicitly building the blueprint out.

## Commands

Run the **whole stack** from the git root: `bash start.sh` (frontend `:5000` + backend `:8000` with reload).

### Backend (Python, run from git root)

| Task | Command |
|---|---|
| Install deps | `pip install -r requirements.txt` (Python 3.14; invoke as `py -X utf8 ...` on Windows) |
| Check env | `py check_env.py` (requires `OPENAI_API_KEY`, `APP_SECRET`; optional `ANTHROPIC_API_KEY`, `DATABASE_URL`) |
| Run API | `py -X utf8 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload` |
| Seed demo KB | `py -X utf8 -m backend.scripts.seed_demo` (loads the bilingual NGO FAQ in `backend/seed/`) |
| Chat latency gate | `py -X utf8 -m backend.scripts.benchmark_chat` (fails if p95 ≥ 3s) |
| Integration smoke | `py -X utf8 backend/_checkpoint1.py` (upload → web/telegram chat → escalation → analytics, keyless) |

Unit tests live in `backend/tests/` — run `py -X utf8 -m pytest backend/tests`. `_checkpoint1.py` and the `backend/scripts/*` are additional integration/eval harnesses.

> **Windows + Arabic:** always use `py -X utf8`. curl/bash mangle Arabic UTF-8 — test Arabic paths via
> Python (httpx/`--data-binary @file`), not raw curl string args.

> **ChromaDB single-writer gotcha:** seeding (`seed_demo.py`, a separate process) rewrites the persistent
> Chroma store. A running uvicorn caches the collection and will **500 on retrieval** until restarted.
> Always seed *before* starting the server, or restart after seeding.

### Frontend (Next.js, run from nested `MoreClient/`)

`cd MoreClient` first. Scripts (the only ones that exist): `npm run dev` (port **5000**), `npm run build`,
`npm run start`, `npm run lint` (flat ESLint), `npm run typecheck` (`tsc --noEmit`). Minimal deps:
`next` 16.2.6, `react` 19, `recharts`, `lucide-react`.

## Backend architecture (`backend/`)

### Entry + layering

[`backend/main.py`](backend/main.py) is the app: a `lifespan` hook runs `init_db()` (creates SQLite tables,
idempotent/additive create_all — **no general migration tool**; the one exception is
`upgrade_existing_schema()` in [`tables.py`](backend/models/tables.py), which `ALTER`s in the newer `Setting`
columns onto an existing DB), warms the Chroma collection, and starts Telegram long-polling if the channel
is active (`telegram_poller.ensure_running_if_active()`, stopped on shutdown). CORS allows the frontend
origins (`ALLOWED_ORIGINS`, default `:5000`). Routers are mounted **prefix-free** — each declares its own
path: `admin`, `chat`, `files`, `analytics`, `handoffs`, `learn`, `purchases`, `settings` under `/api/*`;
`channels` with **no prefix** for provider webhooks (`/telegram/webhook`, `/whatsapp/webhook`); and
`ws` at `/ws/chat/{session_id}` for the web widget.

Each module follows a **3-layer-lite** pattern: `routers/<x>.py` (HTTP shape, Pydantic parse) →
`services/...` (business logic) → SQLAlchemy ORM **directly** (there is no repository layer). Services
take a `db: Session`, mutate, and **commit explicitly**.

### Data layer — SQL + Chroma kept in sync by ID convention

- [`backend/models/database.py`](backend/models/database.py): SQLAlchemy engine + `SessionLocal` + `get_db()`.
  SQLite at `./backend.db` by default (`DATABASE_URL` to override).
- [`backend/models/tables.py`](backend/models/tables.py): `Document`, `Conversation`, `Message`, `Handoff`,
  `LearnedAnswer`, `PurchaseOrder` (per-conversation order with a `state` collection machine + `order_data`
  JSON), `AuthUser` (auth scaffold, see above), `Tenant` (admin subscription registry, **separate** from
  `Setting`), and a **single-row `Setting`** (id=1) holding all tenant/bot config — including the
  purchase-flow / intent / complaint toggles (`purchase_flow_enabled`, `intent_llm_enabled`,
  `auto_handoff_on_complaint`, …). Always read/write `Setting` via `get_or_create_settings(db)` — never
  instantiate a second row.
- [`backend/services/ai/vectorstore.py`](backend/services/ai/vectorstore.py): ChromaDB persistent store
  (`CHROMA_DIR`, default `./chroma_store`), collection `knowledge_base` (cosine). Chunk IDs are
  **deterministic** — `doc-{document_id}-{i}` and `learned-{learned_id}` — so deletion uses a metadata
  `where` filter without storing chunk IDs in SQL. `Document.chunk_count` is authoritative for the frontend.
  Confidence is derived as `1 - distance/2`.

### RAG + keyless mode

[`backend/services/ai/rag.py`](backend/services/ai/rag.py) resolves a strategy per query:
`_wants_human(query)` (EN/AR keywords like "human"/"موظف"/"دعم بشري") → escalate; empty KB → escalate;
else `VectorRagStrategy` retrieves top-`RETRIEVAL_K` (4) chunks and **escalates if top confidence <
`Setting.confidence_threshold`** (default 0.45). A `Handoff` row is created on escalation.

**Multi-provider, with a keyless fallback.** Generation and embeddings each resolve a provider from whichever
keys are present (all via OpenAI-compatible endpoints — no extra SDKs):
- **Chat** ([`config.chat_provider_chain()`](backend/core/config.py)): `LLM_PROVIDER=auto` tries
  **Gemini → DeepSeek (NVIDIA) → OpenAI**, using the first key that exists; pin one with
  `LLM_PROVIDER=gemini|deepseek|openai`. Defaults: `GEMINI_CHAT_MODEL=gemini-2.5-flash`,
  `DEEPSEEK_MODEL=deepseek-ai/deepseek-v4-flash`, `CHAT_MODEL=gpt-4o`.
- **Embeddings** ([`config.embed_provider`](backend/core/config.py) + [`embeddings.py`](backend/services/ai/embeddings.py)):
  Gemini (`gemini-embedding-001`, **3072-dim**) preferred → OpenAI (`text-embedding-3-small`, 1536-dim) →
  **MD5 hash embedding** when no key is set. In hash mode the bot returns the top chunk verbatim (no LLM),
  so the app boots/demos with zero secrets. NVIDIA/DeepSeek has no embeddings endpoint, so a DeepSeek-only
  setup still uses hash embeddings.

**Keyless caveat:** hash-embed confidence is lexical and floors ~0.50, so confidence-based escalation does
**not** separate cleanly — drive escalation demos via the "talk to a human" keyword, and keep the threshold
at 0.45 so genuine questions still answer. (Raise to ~0.6 only when running with a real embedding key.)

[`backend/services/chat_service.py`](backend/services/chat_service.py) orchestrates each turn through an
**ordered gate chain** (first match wins, RAG is the fallback) — read `handle()` before changing routing:
1. **Already in handoff** (`conv.status == "handoff"`) → canned "agent will reply" message.
2. **Active purchase order** ([`purchase_flow.advance_purchase_flow`](backend/services/purchase_flow.py)) →
   continue the product → quantity → address → confirmation state machine.
3. **Intent classification** ([`intent_classifier.classify_intent`](backend/services/intent_classifier.py),
   bilingual keyword + optional LLM, gated by `intent_llm_enabled`): `PURCHASE_INTENT` starts a purchase flow;
   `SUPPORT_REQUEST` (or `COMPLAINT` when `auto_handoff_on_complaint`) flips the conversation to handoff.
4. **Else → RAG** (`rag.resolve_strategy(...).run(...)`).

Throughout it: get/creates the `Conversation` (channel+session), detects language (EN/AR,
[`core/language.py`](backend/core/language.py)), pulls short-term memory ([`core/memory.py`](backend/core/memory.py),
in-process deque) + long-term memory ([`core/long_term_memory.py`](backend/core/long_term_memory.py), a separate
`user_memory` Chroma collection, fed as *context only* — never a KB source), persists messages, creates
handoffs, and bumps `Setting.used_messages`. Both channel webhooks and the web route funnel through this one
`handle()`.

### Channels — one brain, many transports

[`backend/services/channels/`](backend/services/channels/) defines a `Channel` ABC (`parse → reply → deliver`)
and a `ChannelFactory` registry. All channels converge on the same `ChatService.handle()`. Session IDs are
channel-scoped: `web:<id>`, `tg:<chat_id>`, `wa:<from>`. **Webhooks must always return HTTP 200** (providers
retry otherwise) — errors are swallowed. Telegram/WhatsApp activation is gated purely by DB `Setting` fields
(`telegram_token`+`is_telegram_active`, Twilio fields+`is_whatsapp_active`) plus webhook registration — there
are no code-level test restrictions. Webhook signature checks in [`routers/channels.py`](backend/routers/channels.py)
are **optional/gated**: enforced only when `TELEGRAM_WEBHOOK_SECRET` / `Setting.twilio_token` are set, and a
failed check **drops** the update (still 200 / empty TwiML) — so keyless demos are unaffected.

### Ingestion

[`backend/services/ingestion/ingest.py`](backend/services/ingestion/ingest.py) `ingest_document(db, filename, data)`
is the single entry point (reuse it; don't reimplement): extract (PyMuPDF / python-docx / openpyxl `.xlsx` /
UTF-8 txt&md) → `chunk_text` (RecursiveCharacterTextSplitter, ~800 chars / 120 overlap) → embed → add to Chroma → commit the
`Document` row. The row is created `status="processing"` first so a mid-way failure is recorded as `"failed"`.

### Config

[`backend/core/config.py`](backend/core/config.py) loads from env / `.env` / Replit Secrets. Beyond the basics
(`APP_SECRET`, `DATABASE_URL`, `CHROMA_DIR`, `CONFIDENCE_THRESHOLD` 0.45, `RETRIEVAL_K` 4, `MEMORY_WINDOW` 8,
`ALLOWED_ORIGINS`):
- **LLM providers:** `LLM_PROVIDER` (auto), `OPENAI_API_KEY`/`CHAT_MODEL`, `GEMINI_API_KEY`(/`GOOGLE_API_KEY`)
  +`GEMINI_BASE_URL`/`GEMINI_CHAT_MODEL`/`GEMINI_EMBED_MODEL`, `NVIDIA_API_KEY`+`NVIDIA_BASE_URL`/`DEEPSEEK_MODEL`,
  `ANTHROPIC_API_KEY`, `EMBED_MODEL`/`EMBED_DIM` — see the provider-routing notes above.
- **URLs / channels:** `FRONTEND_URL`, `BACKEND_PUBLIC_URL` (used to rebuild the public URL for Twilio
  signature checks), `TELEGRAM_WEBHOOK_SECRET` (optional Telegram webhook header check).
- **Auth scaffold (unused by backend yet):** `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`,
  `APPLE_CLIENT_ID`/`APPLE_CLIENT_SECRET`.

Numeric envs go through `_clamp_float`/`_clamp_int` (bad values fall back to the default, not a crash).
Clients no-op gracefully when keys are absent so the app runs in keyless dev mode.

## Frontend (`MoreClient/`)

Thin Next.js 16 (App Router) dashboard + chat widget. It does **not** own data — every page calls the FastAPI
backend through [`MoreClient/src/lib/api.ts`](MoreClient/src/lib/api.ts) (`apiGet`/`apiSend`/`apiUpload`), which
prefixes `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`) and surfaces backend `problem+json` `detail`
as the error message. The TS response types in that file **mirror `backend/schemas/*`** (camelCase ↔ the
backend's camelCase Pydantic aliases) — keep them in sync when you change a schema.

- Pages: `dashboard/*` (home, `files`, `handoffs`, `settings`, `upgrade`), the embeddable `widget/`, a public
  per-business chat at `(public)/t/[handle]/`, the `admin/` tenant console, plus marketing/onboarding routes
  (`pricing/`, `sign-up/`, `welcome/`). (`src/app/api/v1/*` is the dead TS-backend stub — ignore it.)
- Bilingual EN/AR with RTL via a **hand-rolled** [`src/components/language-provider.tsx`](MoreClient/src/components/language-provider.tsx)
  (typed translations object + context — not next-intl). The product brand string is **"clientMORE"**.
- Path alias `@/*` → `src/*`; Tailwind 4 via `@tailwindcss/postcss`; TypeScript strict.

## Conventions

- Backend: snake_case ORM columns; Pydantic schemas expose camelCase aliases for the frontend. IDs and
  session keys are channel-scoped strings. Commit explicitly in services.
- Conventional Commits (`feat(channels): …`, `fix(rag): …`).
- Secrets only from env / Replit Secrets.
- Next.js 16 differs from older versions; if you write nontrivial framework code, consult
  `MoreClient/node_modules/next/dist/docs/` rather than relying on training-data conventions.
