# clientMORE PRD and Technical Specification

Status: current implementation plus production roadmap  
Last updated: 2026-05-24  
Primary repo path: `/home/mahmoud/Desktop/MoreClint`  
Product name: clientMORE

## 1. AI Handoff Summary

clientMORE is a bilingual Arabic/English AI customer-support platform. It lets a business upload its own support documents, converts those documents into a RAG knowledge base, answers customer questions through a web widget, Telegram, and WhatsApp, and escalates to a human agent when confidence is low or the customer asks for a person. The current running system is a Python FastAPI backend in `backend/` on port `8000` plus a Next.js app in `MoreClient/` on port `5000`.

Important implementation warning: the live backend is Python/FastAPI. Do not treat the incomplete TypeScript backend scaffold under `MoreClient/src/server` or `MoreClient/src/app/api/v1` as production code. The top-level `frontend/` Vite app is also legacy scaffold. Build against `backend/` and `MoreClient/src/lib/api.ts` unless explicitly asked to implement the TypeScript backend roadmap.

## 2. Product Vision

clientMORE should help small and growing businesses provide fast, accurate, always-on customer support in Arabic and English. The product should reduce repetitive human support work, keep answers grounded in the customer's own documents, and give agents a simple queue for conversations that need human judgment.

## 3. Target Users

- Business owner or support manager: configures the bot, uploads documents, monitors KPIs, manages channel setup, and upgrades subscription plans.
- Human support agent: handles escalated conversations, replies to customers, resolves handoffs, and teaches the bot approved answers.
- Customer/end user: asks questions through an embedded website widget, Telegram, or WhatsApp and receives fast support.
- Platform admin, future scope: manages tenants, subscriptions, global system health, and usage limits.

## 4. Current Product Scope

Implemented today:

- Marketing landing page and pricing pages in the Next.js app.
- Dashboard with analytics based on stored conversations/messages/handoffs.
- Knowledge-base upload for PDF, DOCX, TXT, and Markdown-like text.
- RAG answering through ChromaDB vectors and OpenAI when configured.
- Keyless demo fallback using deterministic hash embeddings and extractive answers.
- Web chat widget at `/widget`, embeddable through `MoreClient/public/embed.js`.
- Telegram and WhatsApp webhook adapters using the same `ChatService`.
- Human handoff queue with reply, resolve, and "add to knowledge base" actions.
- Settings page for company name, bot name, logo, tone, system prompt, channel credentials, channel activation, subscription tier, and usage display.
- Single-row settings model, SQLite persistence, and local ChromaDB persistence.
- Bilingual EN/AR interface with RTL support through a custom language provider.

Not production-ready yet:

- Real authentication and tenant isolation.
- Real billing or subscription enforcement.
- Real super-admin backend.
- Secure storage/encryption of channel tokens.
- Database migrations.
- Delivery of human handoff replies back to external channels.
- Persistent source citations, per-answer confidence history, feedback/CSAT, and audit logs.
- Automated test suite beyond demo scripts and smoke checks.

## 5. Goals

Product goals:

- Answer customer questions accurately from business-owned knowledge assets.
- Support Arabic and English conversations with matching UI direction.
- Escalate uncertain or explicitly human-requested conversations.
- Help agents turn unresolved questions into future bot knowledge.
- Provide visible business value through deflection rate, usage, top questions, and estimated savings.
- Allow simple channel setup for website widget, Telegram, and WhatsApp.

Technical goals:

- Keep one shared chat brain for all channels.
- Keep SQL records and vector-store records consistent.
- Make the system runnable locally with minimal setup.
- Keep frontend/backend contracts explicit and synchronized.
- Prepare for multi-tenant SaaS without pretending it already exists.

## 6. Non-Goals For The Current MVP

- Building a full CRM.
- Supporting every messaging channel.
- Letting the bot answer from open internet data.
- Training a custom LLM.
- Replacing human agents entirely.
- Implementing the unfinished TypeScript/Prisma backend unless that becomes an explicit project phase.

## 7. Core User Journeys

### 7.1 Business Setup

1. Business opens the dashboard.
2. Business configures company name, bot name, logo, tone, and optional system prompt instructions.
3. Business uploads knowledge-base documents.
4. Business copies the widget script or iframe snippet into its website.
5. Business optionally activates Telegram or WhatsApp credentials.

Acceptance criteria:

- Settings persist through `GET/PUT /api/settings`.
- Uploaded files appear in `/dashboard/files`.
- Widget uses saved bot name/logo and can answer from uploaded documents.
- Failed uploads surface a clear error.

### 7.2 Customer Chat

1. Customer opens the web widget or sends a Telegram/WhatsApp message.
2. The system detects language as Arabic or English.
3. The system retrieves relevant chunks from the knowledge base.
4. If confidence is sufficient, the bot answers from the retrieved context.
5. If confidence is low or the user asks for a human, the bot sends an escalation message and creates a handoff.

Acceptance criteria:

- Every message creates durable `Conversation` and `Message` rows.
- The same `ChatService` handles web, Telegram, and WhatsApp.
- The response includes `reply`, `sender`, `escalate`, `confidence`, and `language`.
- Low-confidence conversations create one pending handoff per active conversation.

### 7.3 Human Handoff

1. Agent opens `/dashboard/handoffs`.
2. Agent sees pending handoffs, can filter by channel, and can select a conversation.
3. Agent replies and the reply is saved as an `agent` message.
4. Agent can add the final Q&A to the knowledge base.
5. Agent resolves the handoff and closes the conversation.

Acceptance criteria:

- Pending handoffs are listed newest first.
- Reply creates a durable `Message(role="agent")`.
- Resolve sets handoff status to `resolved` and conversation status to `closed`.
- Add-to-KB creates a `LearnedAnswer` and adds it to ChromaDB best-effort.

Production gap:

- Agent replies are currently saved in the dashboard but are not delivered back to Telegram, WhatsApp, or the live web widget. This should be fixed before production.

### 7.4 Bot Learning Loop

1. System identifies unanswered or low-confidence questions.
2. Agent provides an approved answer from dashboard analytics or the handoff detail.
3. Backend stores the Q&A in `learned_answers`.
4. Backend embeds the Q&A into ChromaDB with ID `learned-{learned_id}`.
5. Future matching questions can retrieve the learned answer.

Acceptance criteria:

- `POST /api/learn` persists even if vector add fails.
- Learned entries are retrieval sources but remain distinguishable by metadata.

## 8. Functional Requirements

### 8.1 Knowledge Base

- Allow uploads of PDF, DOCX, TXT, and Markdown text.
- Extract text server-side.
- Chunk text around 800 characters with overlap around 120 characters.
- Generate embeddings through OpenAI when `OPENAI_API_KEY` exists.
- Use deterministic hash embeddings when no OpenAI key exists so the demo can run offline.
- Store document metadata in SQLite.
- Store chunks in ChromaDB with deterministic IDs: `doc-{document_id}-{chunk_index}`.
- Delete SQL document and related Chroma chunks together.
- Display file name, size, type, chunk count, upload date, and status.

### 8.2 Chat/RAG

- Accept messages through HTTP `/api/chat`, web socket `/ws/chat/{session_id}`, Telegram webhook, and WhatsApp webhook.
- Detect Arabic using Arabic-script fast path, otherwise use language detection and default to English.
- Retrieve top `RETRIEVAL_K`, default `4`, chunks from ChromaDB.
- Convert Chroma cosine distance to confidence as `1 - distance / 2`.
- Escalate when:
  - user asks for a human using English or Arabic trigger words,
  - knowledge base is empty,
  - top confidence is below `Setting.confidence_threshold`, default `0.45`.
- Use GPT-4o by default when OpenAI is configured.
- In keyless mode, return the top retrieved chunk verbatim.
- Store short-term memory in process-local cache and durable messages in SQLite.
- Store long-term user memory in a separate Chroma collection named `user_memory`.

### 8.3 Handoffs

- Create handoff tickets for escalated conversations.
- Support pending and resolved statuses.
- Show message history in the dashboard.
- Allow agent reply, resolve, and learn-from-answer.
- Future production requirement: deliver agent replies back to the original customer channel.

### 8.4 Analytics

- Show total questions, deflection rate, estimated savings, and CSAT placeholder.
- Show top repeated user questions.
- Show channel distribution.
- Show recent unanswered/pending handoff questions.
- Future production requirement: persist confidence per answer, feedback/CSAT, source references, and time-series analytics.

### 8.5 Settings

- Store a single settings row with `id=1`.
- Editable fields:
  - company name
  - bot name
  - company logo URL/base64
  - bot tone
  - extra system prompt
  - Telegram token and active flag
  - Twilio SID/token/number and WhatsApp active flag
  - subscription plan
  - confidence threshold
- Future production requirement: move credentials into encrypted storage and support per-tenant settings rows.

### 8.6 Web Widget

- Provide `/widget` iframe UI.
- Provide `/embed.js` floating launcher script.
- Support Arabic/English language toggle.
- Use one stable session ID per widget mount.
- Send messages to `POST /api/chat`.
- Show escalation banner when backend returns `escalate=true`.
- Future production requirement: support real-time agent replies after escalation.

### 8.7 Channel Integrations

- Telegram webhook: `POST /telegram/webhook`.
- WhatsApp/Twilio webhook: `POST /whatsapp/webhook`.
- Webhooks must always return HTTP 200 to prevent provider retry loops.
- Channel adapters normalize inbound messages into one `Inbound` contract.
- All channels call the same `ChatService`.

## 9. Frontend Specification

Active frontend:

- Path: `MoreClient/`
- Framework: Next.js 16 App Router, React 19, TypeScript, Tailwind 4.
- Port: `5000`.
- API base: `NEXT_PUBLIC_API_URL`, default `http://localhost:8000`.
- Main API client: `MoreClient/src/lib/api.ts`.
- Language system: `MoreClient/src/components/language-provider.tsx`.
- Brand string: prefer `clientMORE`.

Main routes:

| Route | Purpose | Current status |
| --- | --- | --- |
| `/` | Landing page | Implemented |
| `/pricing` | Public pricing | Implemented |
| `/welcome` | Demo auth/welcome entry | Implemented, no real auth |
| `/sign-up/[[...sign-up]]` | Demo sign-up form | Implemented, no real auth |
| `/dashboard` | Analytics and teach-bot flow | Implemented against backend analytics/learn |
| `/dashboard/files` | Knowledge upload and delete | Implemented against backend files API |
| `/dashboard/handoffs` | Human handoff queue | Implemented against backend handoffs API |
| `/dashboard/settings` | Tenant, channel, widget, billing settings | Implemented against backend settings API |
| `/dashboard/upgrade` | Subscription upgrade UI | Mostly UI |
| `/widget` | Embeddable chat widget | Implemented against backend chat API |
| `/admin` | Super admin mock | UI-only local state |
| `/dashboard/admin/*` | Admin-related pages | UI/scaffold |
| `/api/v1/admin/subscriptions` | TypeScript admin API route | Broken scaffold, imports missing modules |

Frontend rules for future AI work:

- Keep frontend response types in `MoreClient/src/lib/api.ts` synchronized with `backend/schemas/*`.
- Do not add new demo-only local state to pages that already have backend APIs.
- Make bilingual UI updates in both English and Arabic where practical, with English fallback allowed.
- Prefer existing UI style and components; do not introduce a new design system.

## 10. Backend Specification

Active backend:

- Path: `backend/`
- Framework: FastAPI.
- Port: `8000`.
- Persistence: SQLite by default at `./backend.db`; override with `DATABASE_URL`.
- Vector store: persistent ChromaDB at `./chroma_store`; override with `CHROMA_DIR`.
- Entry point: `backend/main.py`.
- Startup: creates SQL tables with `Base.metadata.create_all()` and warms Chroma collection.
- Architecture: router layer, service layer, SQLAlchemy ORM directly. Services commit explicitly.

Backend environment:

| Variable | Required today | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Optional for app runtime, required by `check_env.py` | Enables OpenAI embeddings and GPT answers |
| `APP_SECRET` | Required by `check_env.py`, not heavily used yet | Future app/session secret |
| `ANTHROPIC_API_KEY` | Optional | Reserved/future |
| `DATABASE_URL` | Optional | SQLAlchemy DB URL |
| `CHROMA_DIR` | Optional | ChromaDB persistence path |
| `CHAT_MODEL` | Optional | Default `gpt-4o` |
| `EMBED_MODEL` | Optional | Default `text-embedding-3-small` |
| `EMBED_DIM` | Optional | Default `1536` |
| `CONFIDENCE_THRESHOLD` | Optional | Default `0.45` |
| `RETRIEVAL_K` | Optional | Default `4` |
| `MEMORY_WINDOW` | Optional | Default `8` |
| `ALLOWED_ORIGINS` | Optional | Defaults to local frontend origins |

Run commands:

```bash
# Whole stack from repo root
bash start.sh

# Backend only
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend only
cd MoreClient
pnpm install
pnpm dev
```

Validation commands:

```bash
# Frontend
cd MoreClient
pnpm lint
pnpm typecheck
pnpm build

# Backend demo/smoke
python -m backend.scripts.seed_demo
python -m backend.scripts.benchmark_chat
python backend/_checkpoint1.py
```

Note: there is no full pytest suite yet.

## 11. Data Model

Current SQL tables:

### `documents`

- `id`
- `title`
- `content`
- `source`
- `file_size`
- `file_type`
- `chunk_count`
- `status`: `processing`, `completed`, `failed`
- `created_at`

### `conversations`

- `id`
- `channel`: `web`, `telegram`, `whatsapp`
- `customer_ref`
- `status`: `open`, `closed`, `handoff`
- `created_at`

### `messages`

- `id`
- `conversation_id`
- `role`: `user`, `assistant`, `agent`
- `content`
- `created_at`

### `handoffs`

- `id`
- `conversation_id`
- `reason`: `low_confidence`, `user_requested`, `keyword_triggered`
- `status`: `pending`, `resolved`
- `assigned_to`
- `created_at`
- `resolved_at`

### `learned_answers`

- `id`
- `question`
- `answer`
- `source_handoff_id`
- `usage_count`
- `created_at`

### `settings`

Single row, always `id=1`.

- `company_name`
- `bot_name`
- `company_logo`
- `bot_tone`
- `system_prompt_extra`
- `telegram_token`
- `is_telegram_active`
- `twilio_sid`
- `twilio_token`
- `twilio_number`
- `is_whatsapp_active`
- `subscription_plan`
- `used_messages`
- `confidence_threshold`

Future production data model additions:

- `tenants`
- `users`
- `memberships`
- `subscriptions`
- `usage_events`
- `feedback`
- `answer_sources`
- `audit_logs`
- `channel_credentials` with encryption
- `webhook_events`

## 12. API Contracts

Base URL in local development: `http://localhost:8000`.

| Method | Path | Purpose | Request | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/health` | Health check | None | `{ "status": "ok" }` |
| `POST` | `/api/chat` | Chat turn | `{ session_id, message, channel }` | `{ reply, sender, escalate, confidence, language }` |
| `POST` | `/api/upload` | Upload KB file | multipart `file` | `{ file, chunks, status }` |
| `GET` | `/api/files` | List KB files | None | `FileOut[]` |
| `DELETE` | `/api/files/{file_id}` | Delete KB file and vectors | None | `{ ok: true }` |
| `GET` | `/api/analytics` | Dashboard analytics | None | `AnalyticsResponse` |
| `GET` | `/api/handoffs` | List pending handoffs | Optional `channel` query | `HandoffOut[]` |
| `POST` | `/api/handoffs/{id}/reply` | Save agent reply | `{ content }` | `HandoffOut` |
| `POST` | `/api/handoffs/{id}/resolve` | Resolve handoff | None | `{ ok: true }` |
| `POST` | `/api/learn` | Teach bot approved Q&A | `{ question, answer, source_handoff_id? }` | `{ id, status }` |
| `GET` | `/api/settings` | Read settings | None | `SettingsOut` |
| `PUT` | `/api/settings` | Partial settings update | camelCase or snake_case fields | `SettingsOut` |
| `POST` | `/telegram/webhook` | Telegram inbound webhook | Telegram update JSON | `{ ok: true }` |
| `POST` | `/whatsapp/webhook` | Twilio WhatsApp inbound webhook | form body | TwiML XML |
| `WS` | `/ws/chat/{session_id}` | WebSocket chat | text or `{message}` | chat response JSON |

## 13. RAG Behavior

Ingestion pipeline:

1. Detect file type from extension.
2. Extract text from PDF, DOCX, TXT, or MD.
3. Create `Document(status="processing")`.
4. Split text into chunks.
5. Embed chunks.
6. Add chunks to ChromaDB collection `knowledge_base`.
7. Mark document `completed` and set `chunk_count`.
8. On failure, mark document `failed`.

Retrieval/answering:

1. If user asks for a human, use fallback escalation.
2. If KB is empty, use fallback escalation.
3. Embed query.
4. Query Chroma top K.
5. If top confidence below threshold, escalate.
6. If OpenAI is available, answer with GPT using only KB context.
7. If OpenAI is not available, return the top retrieved chunk verbatim.

RAG constraints:

- The assistant must answer only from retrieved KB context.
- Long-term memory is user context only, not grounding source material.
- Learned answers can be added into the KB vector collection.
- Confidence thresholds behave differently in keyless hash-embedding mode; demos should trigger escalation by asking for a human.

## 14. Nonfunctional Requirements

Performance:

- Demo target: p95 chat latency below 3 seconds, checked by `backend/scripts/benchmark_chat.py`.
- First request may be slower due to Chroma warmup; backend warms collection during startup.

Reliability:

- Webhooks must always return HTTP 200.
- Vector-store failures during `/api/learn` must not lose the SQL learned-answer row.
- File ingestion failures must be visible as failed document rows where possible.

Security and privacy:

- Secrets must come from environment variables, Replit secrets, or future encrypted storage.
- Do not expose channel credentials to public surfaces.
- Do not use user chat history as global KB material.
- Production must add authentication, authorization, tenant isolation, credential encryption, audit logs, and rate limiting.

Observability:

- Current system exposes response time header on `/api/chat`.
- Production should add structured logs, request IDs, channel webhook event logs, RAG source/confidence logs, error tracking, and dashboard health metrics.

Accessibility and localization:

- UI must support English and Arabic.
- Arabic UI should use RTL layout where appropriate.
- Buttons, forms, and widget messages should remain readable on mobile.

## 15. Known Gaps And Risks

High priority:

- No real auth. Anyone with dashboard access can control settings.
- No true multi-tenancy. `settings` is a single row and all data is shared.
- Admin/super-admin pages are mostly mock local state.
- `MoreClient/src/app/api/v1/admin/subscriptions/route.ts` imports missing TypeScript backend modules and is not usable.
- Human handoff replies are saved but not sent back to customers.
- Channel tokens are stored as plaintext in SQLite.
- No migration tool; changing SQL columns requires deleting/recreating local SQLite DB.
- `MoreClient/README.md` says frontend-only demo, but the current app talks to the FastAPI backend. This README should be updated.
- `check_env.py` treats `OPENAI_API_KEY` as required while app runtime supports keyless mode. Decide which behavior is desired.

Medium priority:

- CSAT is a placeholder constant.
- Analytics are aggregate best-effort and not time-series.
- Per-answer confidence and sources are not persisted.
- Upload file size and content validation should be enforced backend-side.
- Widget uses HTTP chat path even though a WebSocket endpoint exists.
- Telegram/WhatsApp webhook registration and provider setup are manual/script-driven.
- Long-term memory retention and deletion policies are undefined.
- Top-level `frontend/` Vite app creates confusion and should be marked legacy or removed.

Product/naming risks:

- The product should consistently use `clientMORE`. Some UI text still references "Naseh" or Arabic branding from earlier iterations.
- Pricing differs between public pricing cards and dashboard Pro/Ultra tiers. Decide final packaging.

## 16. Prioritized Roadmap

### P0: Stabilize Current MVP

- Update `MoreClient/README.md` to describe the real FastAPI-backed app.
- Remove, disable, or fix broken TypeScript admin API route imports.
- Decide whether `/admin` and `/dashboard/admin/*` are demo-only or part of the product.
- Run and fix `pnpm lint`, `pnpm typecheck`, and `pnpm build`.
- Run backend smoke scripts after seeding demo data.
- Replace stale demo wording in frontend pages that now call real backend APIs.
- Standardize brand text to `clientMORE`.

### P1: Production Foundation

- Add authentication.
- Add real tenant model and per-tenant data isolation.
- Add database migrations, preferably Alembic for the current Python backend.
- Move from local SQLite to Postgres for production.
- Encrypt channel credentials and sensitive settings.
- Add rate limiting and request validation.
- Enforce upload size/type limits on the backend.

### P2: Support Operations

- Deliver agent replies back to the originating channel.
- Add live updates or polling for web-widget escalated conversations.
- Add handoff assignment, internal notes, SLA labels, and audit history.
- Persist answer sources, confidence, language, latency, and escalation reason per message.
- Add customer feedback/CSAT capture.

### P3: Billing And Platform Admin

- Implement real subscriptions and usage limits.
- Add payment provider integration or manual admin provisioning.
- Back super-admin pages with real APIs.
- Track monthly usage events by tenant and channel.
- Enforce plan caps for Pro and Ultra.

### P4: Quality, Evaluation, And Observability

- Add pytest coverage for backend services and routers.
- Add frontend unit/component tests for API-dependent pages.
- Add Playwright smoke tests for dashboard, upload, widget, and handoff flow.
- Add RAG evaluation datasets for Arabic and English.
- Add structured logging, tracing, metrics, and error monitoring.

## 17. Definition Of Done For Production MVP

- A business can sign in and only see its own data.
- A business can upload documents and get grounded answers in Arabic and English.
- Web widget can be embedded on an external site and continue conversations.
- Telegram and WhatsApp can receive inbound messages and send bot replies.
- Low-confidence/human-requested chats create handoffs.
- Agents can reply to handoffs and customers receive those replies.
- Agents can teach the bot from approved answers.
- Usage is tracked by tenant and plan.
- Admin can manage tenants and subscription status.
- Secrets are not stored or displayed in plaintext.
- Lint, typecheck, build, backend smoke, and basic automated tests pass.

## 18. Instructions For Any AI Tool Working On This Repo

- First read `CLAUDE.md`, this file, `backend/main.py`, `backend/services/chat_service.py`, and `MoreClient/src/lib/api.ts`.
- Treat `backend/` as the real backend.
- Treat `MoreClient/` as the real frontend.
- Treat top-level `frontend/` as legacy unless the task explicitly mentions it.
- Do not build against `MoreClient/src/server/*` unless the task is to implement the TypeScript backend roadmap.
- Keep Python Pydantic schemas and TypeScript API types synchronized.
- Preserve the RAG rule that answers must be grounded in business-owned KB context.
- Preserve the single shared `ChatService` brain across all channels.
- When adding SQL columns, add a migration strategy instead of relying on `create_all()`.
- Never store new secrets in source code.
- If changing channel behavior, remember provider webhooks must return HTTP 200.

## 19. Open Product Decisions

- Final brand language: use only `clientMORE`, or intentionally keep Arabic "Naseh" in some markets?
- Final pricing model: public Starter/Growth/Enterprise, dashboard Pro/Ultra, or both?
- Auth provider: custom auth, Clerk, NextAuth, or another provider?
- Production backend direction: continue Python FastAPI or migrate to the planned TypeScript/Prisma architecture?
- Billing provider: Stripe, manual invoicing, or internal subscription records first?
- Data retention policy for conversations and long-term memory.
- Required compliance/security posture for target customers.

## 20. Glossary

- RAG: Retrieval augmented generation. The bot retrieves relevant knowledge chunks and generates answers grounded in them.
- KB: Knowledge base, the uploaded business documents and learned answers.
- ChromaDB: Local vector database used for document chunks and user memory.
- Handoff: Escalated conversation requiring human support.
- Deflection rate: Percentage of questions answered without a human handoff.
- Tenant: A business/customer account. Currently future scope; current implementation is single-tenant.
