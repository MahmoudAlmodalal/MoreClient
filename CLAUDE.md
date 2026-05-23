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

There is no pytest suite; `_checkpoint1.py` and the `backend/scripts/*` are the test/eval harnesses.

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
idempotent/additive — **no migration tool**) and warms the Chroma collection; CORS allows the frontend
origins (`ALLOWED_ORIGINS`, default `:5000`). Routers are mounted **prefix-free** — each declares its own
path. `/api/*` for app endpoints, **no prefix** for provider webhooks (`/telegram/webhook`, `/whatsapp/webhook`),
and `/ws/chat/{session_id}` for the web widget.

Each module follows a **3-layer-lite** pattern: `routers/<x>.py` (HTTP shape, Pydantic parse) →
`services/...` (business logic) → SQLAlchemy ORM **directly** (there is no repository layer). Services
take a `db: Session`, mutate, and **commit explicitly**.

### Data layer — SQL + Chroma kept in sync by ID convention

- [`backend/models/database.py`](backend/models/database.py): SQLAlchemy engine + `SessionLocal` + `get_db()`.
  SQLite at `./backend.db` by default (`DATABASE_URL` to override).
- [`backend/models/tables.py`](backend/models/tables.py): `Document`, `Conversation`, `Message`, `Handoff`,
  `LearnedAnswer`, and a **single-row `Setting`** (id=1) holding all tenant/bot config. Always read/write it
  via `get_or_create_settings(db)` — never instantiate a second row.
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

**Embeddings have a keyless fallback** ([`backend/services/ai/embeddings.py`](backend/services/ai/embeddings.py)):
with `OPENAI_API_KEY` → `text-embedding-3-small` (and GPT-4o generation); without a key → an MD5 **hash
embedding** and the bot returns the top chunk verbatim (no LLM). This lets the app boot/demo with no secrets.
**Caveat:** hash-embed confidence is lexical and floors ~0.50, so confidence-based escalation does **not**
separate cleanly in keyless mode — drive escalation demos via the "talk to a human" keyword, and keep the
threshold at 0.45 so genuine questions still answer. (Raise to ~0.6 only when running with a real OpenAI key.)

[`backend/services/chat_service.py`](backend/services/chat_service.py) orchestrates each turn: get/create
`Conversation` (keyed by channel+session), detect language (EN/AR, [`core/language.py`](backend/core/language.py)),
pull short-term memory ([`core/memory.py`](backend/core/memory.py), in-process deque) and long-term memory
([`core/long_term_memory.py`](backend/core/long_term_memory.py), a separate `user_memory` Chroma collection,
fed as *context only* — never as a KB source), run the strategy, persist messages, create handoffs, and
bump `Setting.used_messages`.

### Channels — one brain, many transports

[`backend/services/channels/`](backend/services/channels/) defines a `Channel` ABC (`parse → reply → deliver`)
and a `ChannelFactory` registry. All channels converge on the same `ChatService.handle()`. Session IDs are
channel-scoped: `web:<id>`, `tg:<chat_id>`, `wa:<from>`. **Webhooks must always return HTTP 200** (providers
retry otherwise) — errors are swallowed. Telegram/WhatsApp activation is gated purely by DB `Setting` fields
(`telegram_token`+`is_telegram_active`, Twilio fields+`is_whatsapp_active`) plus webhook registration — there
are no code-level test restrictions.

### Ingestion

[`backend/services/ingestion/ingest.py`](backend/services/ingestion/ingest.py) `ingest_document(db, filename, data)`
is the single entry point (reuse it; don't reimplement): extract (PyMuPDF / python-docx / UTF-8 txt&md) →
`chunk_text` (RecursiveCharacterTextSplitter, ~800 chars / 120 overlap) → embed → add to Chroma → commit the
`Document` row. The row is created `status="processing"` first so a mid-way failure is recorded as `"failed"`.

### Config

[`backend/core/config.py`](backend/core/config.py) loads from env / `.env` / Replit Secrets: `OPENAI_API_KEY`,
`ANTHROPIC_API_KEY`, `APP_SECRET`, `DATABASE_URL`, `CHROMA_DIR`, `CHAT_MODEL` (gpt-4o), `EMBED_MODEL`/`EMBED_DIM`,
`CONFIDENCE_THRESHOLD` (0.45), `RETRIEVAL_K` (4), `MEMORY_WINDOW` (8), `ALLOWED_ORIGINS`. Clients no-op gracefully
when keys are absent so the app runs in keyless dev mode.

## Frontend (`MoreClient/`)

Thin Next.js 16 (App Router) dashboard + chat widget. It does **not** own data — every page calls the FastAPI
backend through [`MoreClient/src/lib/api.ts`](MoreClient/src/lib/api.ts) (`apiGet`/`apiSend`/`apiUpload`), which
prefixes `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`) and surfaces backend `problem+json` `detail`
as the error message. The TS response types in that file **mirror `backend/schemas/*`** (camelCase ↔ the
backend's camelCase Pydantic aliases) — keep them in sync when you change a schema.

- Pages live under `MoreClient/src/app/dashboard/*` (files, handoffs, settings, analytics) plus `widget/`.
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
