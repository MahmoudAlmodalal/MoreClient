# clientMORE — Vision ↔ Implementation Alignment Report

**Auditor role:** Principal product/engineering auditor (read-only assessment, no code changes).
**Date:** 2026-05-24
**Repo:** `c:\Users\MSI\Desktop\more client\MoreClient`
**Branch:** `hardening/safe-fixes`
**Reference goal:** clientMORE = a bilingual (AR/EN) AI customer-support bot that answers from a
customer's own documents (RAG), runs across Web / Telegram / WhatsApp, escalates to a human on low
confidence, and ships an admin dashboard.

## How this audit was conducted

The named planning docs in CLAUDE.md (`fullstack-plan.md`, `backend-plan.md`, `REPLIT-ADMIN-PROMPT.md`)
**do not exist** in the repo. The consolidated, CTO-current vision lives in
[docs/PROJECT-PRD-SPEC.md](PROJECT-PRD-SPEC.md), which was used as the requirements source. Every status
below is backed by a direct read of the running code (`backend/`, nested `MoreClient/`), not the blueprint.

### Headline: CLAUDE.md / PRD are partly stale (in the project's favor)

Several "blueprint ≠ implementation" warnings in CLAUDE.md and gaps in the PRD have **already been
remediated** and should be re-verified by the team:

| CLAUDE.md / PRD claim | Actual state (git-tracked) | Evidence |
| --- | --- | --- |
| `MoreClient/src/server/` broken stub exists | **Removed** — not tracked | `git ls-files MoreClient/src/server/*` → empty (commit `4387065` "remove dead TS-monolith scaffold") |
| `MoreClient/src/app/api/v1/...` admin route exists/broken | **Removed** — not tracked | `git ls-files MoreClient/src/app/api/*` → empty |
| Top-level `frontend/` Vite SPA dead scaffold exists | **Removed** — not tracked | `git ls-files frontend/` → 0 files |
| `/admin` is "UI-only local state" / "mock" | **Now backend-backed** real CRUD | [admin/page.tsx](MoreClient/src/app/admin/page.tsx) calls `fetchTenants`/`fetchAdminKpis`/`fetchAdminHealth` → [backend/routers/admin.py:51-160](backend/routers/admin.py#L51-L160) |
| Auth half-scaffolded with Clerk/`@clerk/nextjs` | Clerk **not** a dependency | `MoreClient/package.json` has no `@clerk/*`; only a stale `node_modules` artifact remains |

This is a positive alignment signal: the PRD's **P0 "stabilize MVP"** cleanup items (remove dead TS
scaffold, mark legacy `frontend/`) are effectively done. The remaining gaps are the genuine P1–P3 items.

---

## 1. Requirements Traceability Matrix

Status legend: **Done** / **Partial** / **Missing** / **Scaffold-only**.

### Core AI / RAG

| # | Capability (from PRD §8.2, §13) | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Single shared `ChatService.handle()` brain for all channels | **Done** | [chat_service.py:28](backend/services/chat_service.py#L28); both webhooks + web route funnel here |
| 2 | Ordered gate chain: handoff → purchase → intent → RAG | **Done** | handoff [chat_service.py:45](backend/services/chat_service.py#L45); purchase [:59](backend/services/chat_service.py#L59); intent [:74-110](backend/services/chat_service.py#L74-L110); RAG fallback [:115](backend/services/chat_service.py#L115) |
| 3 | Language detect AR/EN (Arabic-script fast path) | **Done** | [chat_service.py:32](backend/services/chat_service.py#L32) → `backend/core/language.py` |
| 4 | Top-K retrieval (default 4) from ChromaDB | **Done** | [config.py:78](backend/core/config.py#L78) `RETRIEVAL_K=4`; query in [rag.py:103](backend/services/ai/rag.py#L103) |
| 5 | Confidence = `1 - distance/2` | **Done** | [vectorstore.py:35](backend/services/ai/vectorstore.py#L35) |
| 6 | Escalate on low confidence vs `Setting.confidence_threshold` (0.45) | **Done** | [config.py:77](backend/core/config.py#L77); threshold check [rag.py:107-109](backend/services/ai/rag.py#L107-L109) |
| 7 | Escalate on "talk to human" keywords (EN+AR) | **Done** | `_ESCALATE_KEYWORDS` [rag.py:16](backend/services/ai/rag.py#L16); `resolve_strategy` [rag.py:185-190](backend/services/ai/rag.py#L185-L190) |
| 8 | Escalate on empty KB | **Done** | [rag.py:188-189](backend/services/ai/rag.py#L188-L189); `vectorstore.is_empty()` gate [chat_service.py:115](backend/services/chat_service.py#L115) |
| 9 | Answer strictly from retrieved KB context (GPT when keyed) | **Done** | `VectorRagStrategy._generate` [rag.py:174-182](backend/services/ai/rag.py#L174-L182) |
| 10 | Keyless mode returns top chunk verbatim (no LLM) | **Done** | [rag.py:121-123](backend/services/ai/rag.py#L121-L123) |
| 11 | Deterministic Chroma IDs `doc-{id}-{i}` / `learned-{id}` | **Done** | [vectorstore.py:41](backend/services/ai/vectorstore.py#L41), [:51](backend/services/ai/vectorstore.py#L51) |
| 12 | Delete vectors by metadata `where` filter | **Done** | [vectorstore.py:59](backend/services/ai/vectorstore.py#L59) |
| 13 | Short-term (in-proc) + long-term (Chroma `user_memory`) memory; LTM is context-only | **Done** | STM [chat_service.py:37-41](backend/services/chat_service.py#L37-L41); LTM recall [:113](backend/services/chat_service.py#L113); `backend/core/long_term_memory.py` |

### Multi-provider LLM

| # | Capability | Status | Evidence |
| --- | --- | --- | --- |
| 14 | Chat provider chain `auto`: Gemini → DeepSeek/NVIDIA → OpenAI | **Done** | `chat_provider_chain()` [config.py:113-122](backend/core/config.py#L113-L122); used [rag.py:174-182](backend/services/ai/rag.py#L174-L182) |
| 15 | Embeddings: Gemini → OpenAI → MD5 hash fallback | **Done** | `embed_provider` [config.py:107-111](backend/core/config.py#L107-L111); hash path [embeddings.py:56-58](backend/services/ai/embeddings.py#L56-L58) |
| 16 | Graceful no-op when keys absent (keyless boot) | **Done** | `_clamp_*` + provider guards in `config.py`; hash-embed fallback above |

### Knowledge base / ingestion (PRD §8.1)

| # | Capability | Status | Evidence |
| --- | --- | --- | --- |
| 17 | Upload PDF / DOCX / TXT / MD; single `ingest_document` entry | **Done** | `backend/services/ingestion/ingest.py`; extractors `pdf.py`/`docx.py`/`xlsx.py`/`txt.py` |
| 18 | Chunk ~800 chars / 120 overlap; embed; add to Chroma; commit row | **Done** | `chunker.py`; pipeline in `ingest.py` |
| 19 | `Document` created `processing` first; mid-fail → `failed` | **Done** | status lifecycle in `ingest.py` (`processing` → `completed`/`failed`) |
| 20 | List files w/ name, size, type, chunk count, date, status | **Done** | [files.py:91-96](backend/routers/files.py#L91-L96); [dashboard/files page](MoreClient/src/app/dashboard/files/page.tsx) `apiGet("/api/files")` |
| 21 | Backend-enforced upload size/type limits | **Partial / Missing** | PRD §15 medium-pri gap; no size cap enforced in `files.py` upload path |

### Channels (PRD §8.7)

| # | Capability | Status | Evidence |
| --- | --- | --- | --- |
| 22 | `Channel` ABC `parse → reply → deliver` + `ChannelFactory` registry | **Done** | `base.py:37-55`; `factory.py:14-26` |
| 23 | Channel-scoped session IDs `web:` / `tg:` / `wa:` | **Done** | `tg:{chat_id}` [telegram.py:46](backend/services/channels/telegram.py#L46); `wa:{from}` [whatsapp.py:48](backend/services/channels/whatsapp.py#L48) |
| 24 | Telegram + WhatsApp inbound webhooks → same ChatService | **Done** | `routers/channels.py`; both converge on `ChatService.handle()` |
| 25 | Webhooks always return HTTP 200 | **Done** | TG returns `{"ok":True}` [channels.py:75](backend/routers/channels.py#L75); WA TwiML [:104,:108](backend/routers/channels.py#L104) |
| 26 | Optional/gated webhook signature checks | **Done** | TG `TELEGRAM_WEBHOOK_SECRET` [channels.py:60-65](backend/routers/channels.py#L60-L65); Twilio [:88-96](backend/routers/channels.py#L88-L96) |
| 27 | WebSocket web transport `/ws/chat/{session_id}` | **Done (backend)** | [ws.py:37-67](backend/routers/ws.py#L37-L67) |
| 28 | **Deliver agent handoff replies back to the customer channel** | **Missing** | [handoffs.py:133-142](backend/routers/handoffs.py#L133-L142) only writes a `role="agent"` `Message`; no outbound send to TG/WA/widget |

### Handoff / learning loop (PRD §7.3, §7.4, §8.3)

| # | Capability | Status | Evidence |
| --- | --- | --- | --- |
| 29 | Create handoff on escalation (idempotent, one pending/conv) | **Done** | `_ensure_handoff` [chat_service.py:179-192](backend/services/chat_service.py#L179-L192) |
| 30 | List pending handoffs newest-first, filter by channel | **Done** | [handoffs.py:102-123](backend/routers/handoffs.py#L102-L123) |
| 31 | Agent reply persisted as `agent` message | **Done** | [handoffs.py:126-142](backend/routers/handoffs.py#L126-L142) |
| 32 | Resolve sets handoff `resolved` + conversation `closed` | **Done** | [handoffs.py:145-160](backend/routers/handoffs.py#L145-L160) |
| 33 | Add-to-KB creates `LearnedAnswer`, embeds best-effort | **Done** | `backend/routers/learn.py`; `learned-{id}` vector [vectorstore.py:51](backend/services/ai/vectorstore.py#L51) |
| 34 | Live delivery / polling of agent reply to web widget | **Missing** | widget is HTTP request/response only (see #45); no poll/WS subscription for agent messages |

### Purchase flow & intent routing (beyond PRD; implemented)

| # | Capability | Status | Evidence |
| --- | --- | --- | --- |
| 35 | Bilingual keyword + optional-LLM intent classification | **Done** | `classify_intent` [intent_classifier.py:85-108](backend/services/intent_classifier.py#L85-L108); enums [:17-23](backend/services/intent_classifier.py#L17-L23) |
| 36 | Purchase state machine product→quantity→address→confirm | **Done** | `advance_purchase_flow` [purchase_flow.py:87-102](backend/services/purchase_flow.py#L87-L102) |
| 37 | Complaint → auto-handoff (gated by `auto_handoff_on_complaint`) | **Done** | [chat_service.py:92-110](backend/services/chat_service.py#L92-L110) |

### Frontend (PRD §9)

| # | Capability | Status | Evidence |
| --- | --- | --- | --- |
| 38 | Central API client (`apiGet/apiSend/apiUpload`), `NEXT_PUBLIC_API_URL` default `:8000`, `problem+json` detail surfacing | **Done** | [api.ts:8](MoreClient/src/lib/api.ts#L8), [:18-27](MoreClient/src/lib/api.ts#L18-L27), [:29-56](MoreClient/src/lib/api.ts#L29-L56) |
| 39 | Dashboard analytics page (backend-backed) | **Done** | `apiGet("/api/analytics")` [dashboard/page.tsx:62](MoreClient/src/app/dashboard/page.tsx#L62) |
| 40 | Files page (backend-backed) | **Done** | `apiGet("/api/files")` |
| 41 | Handoffs page (backend-backed) | **Done** | `apiGet("/api/handoffs")` |
| 42 | Settings page (backend-backed PUT) | **Done** | `apiSend("/api/settings","PUT",…)` |
| 43 | Bilingual EN/AR + RTL via hand-rolled provider; brand "clientMORE" | **Done** | `language-provider.tsx`; `dir="rtl"` when `language==="ar"`; no "Naseh" in `src/` |
| 44 | Pricing / sign-up / welcome / `(public)/t/[handle]` | **Scaffold-only** | static + mock `setTimeout` "auth"; no backend calls |
| 45 | Embeddable widget answering from KB; escalation banner | **Done (HTTP)** | `apiSend("/api/chat","POST",…)` [widget/page.tsx:106](MoreClient/src/app/widget/page.tsx#L106); escalation UI ~`:280-287` |
| 46 | Widget uses the WebSocket endpoint | **Missing** | widget uses HTTP `/api/chat`; `/ws/chat` is unused by the frontend (PRD §15 medium-pri) |

### Auth / tenancy / admin / billing (PRD §4 "not production-ready", §15)

| # | Capability | Status | Evidence |
| --- | --- | --- | --- |
| 47 | Backend auth router / login / session / route guards | **Missing** | no auth router in `backend/routers/`; every endpoint only `Depends(get_db)`; `AuthUser` table never queried |
| 48 | Auth schema + model scaffold | **Scaffold-only** | `backend/schemas/auth.py` (LoginIn/SignUpIn unused); `AuthUser` in `backend/models/tables.py` |
| 49 | Frontend login flow | **Scaffold-only** | `sign-up`/`welcome` use mock `setTimeout` redirect; no `src/middleware.ts`, no `src/proxy.ts` |
| 50 | Admin tenant CRUD API | **Done (unauthenticated)** | [admin.py:51-160](backend/routers/admin.py#L51-L160): tenants CRUD, toggle, KPIs, health |
| 51 | Admin console UI wired to real API | **Done** | [admin/page.tsx](MoreClient/src/app/admin/page.tsx) fetch* calls; route "guard" is client-side `sessionStorage` role only |
| 52 | Real multi-tenancy / per-tenant data isolation | **Missing** | `Setting` is single-row id=1 (`get_or_create_settings`); `Document`/`Conversation`/`Handoff`/`Message` have **no `tenant_id`**; `Tenant` table is orphaned (not joined to data) |
| 53 | Billing / Stripe / plan enforcement / usage caps | **Missing** | no Stripe anywhere; `used_messages` incremented ([chat_service.py:49,64,82,102,132](backend/services/chat_service.py#L49)) but **never checked** against any limit; `Tenant.limit_messages` unused for gating |

---

## 2. Critical Gaps (Vision → Code) with Severity

| Sev | Gap | Why it matters | Evidence |
| --- | --- | --- | --- |
| **Critical** | **No authentication or authorization anywhere.** Dashboard, settings, file upload/delete, and admin tenant CRUD are all open. Admin "guard" is client-side `sessionStorage` only. | Anyone reaching `:8000` controls every tenant's data, channel tokens, and settings. Blocks PRD "Definition of Done" (§17). | no `Depends(auth)`; [admin.py:1-5](backend/routers/admin.py#L1-L5) header notes client-side-only control |
| **Critical** | **No multi-tenancy.** Single global `Setting` row and no `tenant_id` on data tables. The `Tenant` table is a disconnected registry. | The product is sold as multi-business SaaS but is architecturally single-tenant; all KB/chats/handoffs are shared. | single-row `get_or_create_settings`; no `tenant_id` columns in `backend/models/tables.py` |
| **High** | **Agent handoff replies never reach the customer** on Telegram/WhatsApp/web. | Breaks the core support promise (PRD §7.3 explicitly flags this; §17 DoD requires it). A human "replies" into a void on external channels. | [handoffs.py:133-142](backend/routers/handoffs.py#L133-L142) writes DB only; no channel `deliver()` invoked |
| **High** | **No usage/plan enforcement.** Subscription tiers and `used_messages` exist but gate nothing. | Revenue model and quota promises are cosmetic; no cap stops abuse. | `used_messages` bumped but never compared to a limit |
| **High** | **Plaintext channel credentials** (`telegram_token`, `twilio_token`) in SQLite `Setting`. | Token theft → account takeover of customer channels. PRD §15 high-pri. | `Setting` columns in `backend/models/tables.py`; no encryption |
| **Medium** | **No DB migrations.** Schema evolves via `create_all()` + a one-off `upgrade_existing_schema()` ALTER shim. | Column changes risk data loss / manual SQLite surgery in prod. | [tables.py:198](backend/models/tables.py#L198) `upgrade_existing_schema`; no Alembic |
| **Medium** | **Widget has no live agent-reply channel.** HTTP request/response only; `/ws/chat` exists but unused. | Escalated web customers can't receive the agent's answer in-session. | widget [widget/page.tsx:106](MoreClient/src/app/widget/page.tsx#L106); `ws.py` unused by FE |
| **Medium** | **No per-answer persistence of confidence/source/CSAT.** Analytics are aggregate, CSAT is a placeholder. | Limits eval, audit, and trust-building analytics (PRD §8.4). | `feedback_score` constant in `backend/schemas/analytics.py`; no per-message confidence column |
| **Low** | **Keyless confidence floor.** Hash-embed confidence is lexical (~0.50 floor), so threshold-based escalation doesn't separate cleanly. | Demos must escalate via the "human" keyword, not confidence. Documented, not a bug. | hash path [embeddings.py:56-58](backend/services/ai/embeddings.py#L56-L58); CLAUDE.md keyless caveat |

---

## 3. Technical-Debt & Risk Register

| Item | Risk | Evidence / Note |
| --- | --- | --- |
| No migration tool | Schema drift; destructive local resets | `create_all()` in `main.py` lifespan; `upgrade_existing_schema()` [tables.py:198](backend/models/tables.py#L198) is the only ALTER path |
| Single-row `Setting` (id=1) | Hard blocker for tenancy; must not instantiate a 2nd row | `get_or_create_settings` |
| Webhooks always 200 | Real delivery failures are swallowed (intentional anti-retry); needs a webhook-event log for observability | [channels.py:75,104,108](backend/routers/channels.py#L75) |
| ChromaDB single-writer | Seeding from a separate process invalidates a running uvicorn's cached collection → 500s until restart | CLAUDE.md ChromaDB gotcha; warmup in `main.py` lifespan |
| `check_env.py` requires `OPENAI_API_KEY` but runtime supports keyless | Contradictory onboarding signal | PRD §15; `check_env.py` |
| Analytics schema breaks the camelCase convention | `backend/schemas/analytics.py` uses snake_case (`total_questions`, `deflection_rate`, …) while other schemas expose camelCase aliases. FE matches it, but it's an inconsistency that will trip the next schema author | [analytics.py:6-10,32-36](backend/schemas/analytics.py#L6-L10) |
| Stale "Naseh" branding in `embed.js` | Cosmetic; PRD §15 product/naming risk | `MoreClient/public/embed.js` console-warn string |
| Stale `@clerk/nextjs` in `node_modules` (not in `package.json`) | Misleads readers into thinking Clerk is wired | `package.json` has no `@clerk/*` |
| CLAUDE.md / PRD describe already-removed scaffold | Onboarding docs lag the code; future agents may chase ghosts | dead `src/server`, `api/v1`, top-level `frontend/` all untracked (see Headline table) |
| No automated test depth beyond units | `backend/tests/` covers routing/intent/purchase; no router/integration/e2e/RAG-eval coverage | `backend/tests/`; PRD §16 P4 |
| Long-term memory has no retention/deletion policy | Privacy/compliance exposure as data grows | `backend/core/long_term_memory.py`; PRD §15 |

---

## 4. Per-Axis Alignment Scores

Scores reflect implementation completeness vs. the **stated MVP vision** (PRD §4 explicitly defers auth,
tenancy, billing to "not production-ready"), with production-readiness called out separately.

| Axis | Score | Justification |
| --- | --- | --- |
| **AI / RAG** | **9 / 10** | Strategy resolution, top-K retrieval, confidence math, keyword/empty-KB/threshold escalation, multi-provider chains, and keyless fallback all implemented exactly as specified ([rag.py](backend/services/ai/rag.py), [vectorstore.py](backend/services/ai/vectorstore.py), [config.py](backend/core/config.py)). Loses a point only for unpersisted per-answer confidence/sources and the documented keyless floor. |
| **Backend (core architecture)** | **8 / 10** | Clean router→service→ORM layering, single `ChatService` brain, idempotent handoff creation, explicit commits, durable conversation/message rows ([chat_service.py](backend/services/chat_service.py)). Docked for no migrations and the single-row `Setting` ceiling. |
| **Channels** | **6 / 10** | Inbound is excellent: shared brain, scoped sessions, gated signature checks, always-200. But the **outbound agent-reply leg is entirely missing** ([handoffs.py:133-142](backend/routers/handoffs.py#L133-L142)) and the widget ignores the WS endpoint — half of a two-way support loop. |
| **Frontend** | **8 / 10** | All four dashboard surfaces + widget + admin are genuinely backend-wired; bilingual RTL is solid; dead scaffold removed. Docked for scaffold-only public/auth pages and the analytics snake_case inconsistency. |
| **Auth** | **1 / 10** | Schema + `AuthUser` table exist but nothing is wired; zero route protection; FE login is mock `setTimeout`. Matches PRD's "not production-ready," but it is effectively absent. |
| **Admin / Billing** | **3 / 10** | Admin tenant CRUD + KPIs/health are real and FE-wired ([admin.py](backend/routers/admin.py)) — better than CLAUDE.md claims. But it's unauthenticated, the `Tenant` registry is disconnected from real data, and billing/usage enforcement is entirely absent (no Stripe, no caps). |

**Weighted read:** the *product MVP* (answer from docs, bilingual, multi-channel inbound, escalate,
dashboard) is **largely delivered**. The *production SaaS* layer (auth, tenancy, billing, two-way handoff)
is **early-stage** — consistent with the PRD's own self-assessment, with two items (handoff outbound
delivery, any auth) being the most business-critical.

---

## 5. Top 10 Prioritized Recommendations (impact vs. effort)

| Rank | Recommendation | Impact | Effort | Rationale / anchor |
| --- | --- | --- | --- | --- |
| 1 | **Deliver agent handoff replies to the origin channel.** In `reply_handoff`, resolve the conversation's channel and call the matching `Channel.deliver()`; add web-widget polling or reuse `/ws/chat`. | Very High | Medium | Closes the core support loop; PRD §7.3/§17. [handoffs.py:133-142](backend/routers/handoffs.py#L133-L142) |
| 2 | **Add minimal backend auth + route guards** (session/JWT dependency on all `/api/*` and `/api/admin/*`; protect upload/delete/settings/admin). | Very High | Medium | Removes the open-door critical risk; unblocks any real deployment. `AuthUser` scaffold already exists. |
| 3 | **Introduce Alembic migrations** and retire `upgrade_existing_schema()` as the migration path. | High | Low–Med | Prerequisite for adding `tenant_id` and any prod schema change without data loss. [tables.py:198](backend/models/tables.py#L198) |
| 4 | **Encrypt channel credentials at rest** (`telegram_token`, `twilio_token`, Twilio SID) and stop returning them to non-admin surfaces. | High | Low | Token theft = channel takeover; PRD §15 high-pri. |
| 5 | **Enforce plan/usage caps.** Compare `used_messages` against a per-plan limit in `ChatService.handle()` and return a quota response when exceeded. | High | Low | Makes the subscription model real; field already tracked. [chat_service.py:132](backend/services/chat_service.py#L132) |
| 6 | **Add `tenant_id` to `Setting`/`Document`/`Conversation`/`Handoff` and scope all queries** (depends on #2, #3). | Very High | High | Converts the app from single-tenant to genuine SaaS; PRD §11 future model. |
| 7 | **Persist per-message confidence, source IDs, language, and escalation reason.** | Medium | Medium | Enables real analytics/CSAT, audit, and RAG eval (PRD §8.4, §16 P2/P4). |
| 8 | **Enforce backend upload size/type limits** in the `/api/upload` path. | Medium | Low | Abuse/DoS hardening; PRD §15 medium-pri. [files.py](backend/routers/files.py) |
| 9 | **Refresh CLAUDE.md & PRD to match reality**: scaffold removed, `/admin` now backend-backed, Clerk not a dep, analytics snake_case. Fix the stale "Naseh" string in `embed.js`. | Medium | Low | Prevents future agents from chasing removed code (see Headline table). |
| 10 | **Expand automated tests**: router/integration tests for chat/handoff/files, plus a small AR/EN RAG-eval set. | Medium | Medium | Current `backend/tests/` covers routing/intent/purchase only; PRD §16 P4. |

---

### Appendix — Verification commands used (read-only)

- `git ls-files frontend/` / `MoreClient/src/server/*` / `MoreClient/src/app/api/*` → all empty (scaffold removed).
- `git ls-files "*schema.prisma*"` (excl. node_modules) → none.
- `git ls-files | grep -iE "alembic|migrat"` → none.
- Direct reads: `chat_service.py`, `handoffs.py`, `rag.py`, `vectorstore.py`, `config.py`, `analytics.py`, `tables.py`, plus FE `api.ts`/page sources via Explore agents.

*No source or configuration file was modified during this audit. The only write was this report.*
