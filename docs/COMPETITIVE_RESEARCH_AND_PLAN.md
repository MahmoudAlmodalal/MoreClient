# clientMORE — Competitive Research & Parallel Build Plan

**Author:** Product strategist / lead architect session
**Date:** 2026-05-24
**Scope:** Read-only competitive analysis + execution plan. No code was modified producing this document.
**Sources of truth used:** [`CLAUDE.md`](../CLAUDE.md), [`docs/PROJECT-PRD-SPEC.md`](PROJECT-PRD-SPEC.md), and direct reads of [`backend/`](../backend/) and [`MoreClient/`](../MoreClient/). Market data is cited inline.

---

## 0. What clientMORE actually is today (grounded in the code)

clientMORE is a **bilingual (Arabic/English) RAG customer-support bot** with a Python FastAPI brain and a thin Next.js 16 dashboard/widget. The following is **verified built** (not aspirational):

| Capability | Evidence in repo | Maturity |
|---|---|---|
| Single shared chat brain across Web / Telegram / WhatsApp | [`backend/services/chat_service.py`](../backend/services/chat_service.py) `handle()` | **Solid** |
| RAG with confidence-gated escalation | [`backend/services/ai/rag.py`](../backend/services/ai/rag.py), [`vectorstore.py`](../backend/services/ai/vectorstore.py) | **Solid** |
| Multi-provider LLM + keyless fallback (Gemini→DeepSeek→OpenAI, MD5-hash embeds) | [`backend/core/config.py`](../backend/core/config.py), [`embeddings.py`](../backend/services/ai/embeddings.py) | **Solid / distinctive** |
| Document ingestion (PDF/DOCX/XLSX/TXT/MD) | [`backend/services/ingestion/ingest.py`](../backend/services/ingestion/ingest.py) | **Solid** |
| Intent gate chain → purchase flow / support / complaint | [`chat_service.py`](../backend/services/chat_service.py), [`intent_classifier.py`](../backend/services/intent_classifier.py), [`purchase_flow.py`](../backend/services/purchase_flow.py) | **Working, novel** |
| Purchase order state machine (product→qty→address→confirm) | `PurchaseOrder` in [`tables.py`](../backend/models/tables.py) | **Working** |
| Human handoff queue (reply / resolve / learn-back) | [`backend/routers/handoffs.py`](../backend/routers/handoffs.py), [`learn.py`](../backend/routers/learn.py) | **Working** |
| Bilingual EN/AR UI + RTL (hand-rolled) | [`MoreClient/src/components/language-provider.tsx`](../MoreClient/src/components/language-provider.tsx) | **Solid** |
| Analytics dashboard (deflection, top questions, channel split) | [`backend/routers/analytics.py`](../backend/routers/analytics.py) | **Best-effort aggregate** |

**Verified NOT real (do not sell or build on as-is):**

- **No real auth / no tenant isolation.** `Setting` is a **single row, `id=1`** ([`tables.py:129`](../backend/models/tables.py#L129)); `AuthUser` exists but no auth router/login flow; `/admin` is unguarded.
- **No billing enforcement.** `Tenant` table ([`tables.py:169`](../backend/models/tables.py#L169)) is an admin registry with `limit_messages` but **nothing enforces caps**; `used_messages` is just incremented.
- **Handoff replies are NOT delivered back** to Telegram/WhatsApp/widget (PRD §7.3 gap).
- **Channel tokens stored plaintext** in SQLite; **no DB migrations** (additive `create_all` + one manual `upgrade_existing_schema`).
- TS monolith under `MoreClient/src/server`, `src/app/api/v1`, top-level `frontend/` = **dead scaffold.**
- The currency default is `"ريال"` (SAR) — the product is already implicitly **Gulf/KSA-targeted** ([`tables.py:163`](../backend/models/tables.py#L163)).

**Strategic read:** clientMORE is a *working bilingual RAG MVP with a genuinely differentiated purchase/intent flow and keyless resilience*, sitting on a *non-production foundation* (auth, tenancy, billing, channel delivery). The competitive opening is **Arabic-first + WhatsApp-first + affordable/self-hostable**, not feature parity with enterprise platforms.

---

## 1. Competitive summary

### 1.1 The landscape splits into three tiers

**Tier A — Enterprise outcome-priced agents (Intercom Fin, Ada, Sierra).** Highest answer quality, deepest tooling, but **opaque, expensive, English-first.**
- **Intercom Fin:** $0.99 per resolution, 50/mo minimum; no feature gating; channel-wide incl. voice. ([Intercom pricing](https://www.intercom.com/pricing), [minami.ai breakdown](https://minami.ai/blog/intercom-fin-ai-agent-pricing))
- **Ada:** no public pricing; ~$30K–$300K+/yr; ~$1–$3.50 per resolution; 8–16 wk deployment. ([featurebase](https://www.featurebase.app/blog/ada-cx-pricing), [Ada pricing post](https://www.ada.cx/blog/unpacking-ai-agent-pricing-resolution-based-vs-conversation-based-models/))
- **Sierra:** no public pricing/trial; ~$2–$5 per resolved conversation; year-one $200K+; 4–10+ wk sales-led onboarding. ([myaskai Sierra guide](https://myaskai.com/blog/sierra-ai-complete-guide-2026), [OpenNash 3-yr cost](https://opennash.com/blog/ai-agent-platforms-vs-custom-built-ai-the-real-3-year-cost/))

**Tier B — SMB no-code RAG builders (Chatbase, Voiceflow, Botpress).** Self-serve, affordable, where clientMORE competes head-on for SMBs.
- **Chatbase:** Free→$32 (Hobby)→$120 (Standard)→$400 (Pro); credit/message metered; fastest "upload docs → widget." ([CostBench](https://costbench.com/software/ai-chatbot-platforms/chatbase/), [builts.ai compare](https://builts.ai/blog/chatbase-vs-botpress-vs-voiceflow/))
- **Voiceflow:** free tier; pro from ~$50/mo; **per-editor seat pricing gets expensive** ($750/mo for a 5-person Business team); strong visual flow + voice. ([botpress Voiceflow review](https://botpress.com/blog/voiceflow-review))
- **Botpress:** open-source core (self-host free + infra), usage plans from ~$1; developer-heavy (2–8h basic, weeks to master). ([gptbots](https://www.gptbots.ai/blog/botpress-alternatives))

**Tier C — Open-source support stacks (Chatwoot, LibreChat, Rasa, OpenAssistantGPT).** Free software, you run it. Chatwoot = omnichannel helpdesk but **only basic native AI** (needs Rasa/Dialogflow bolt-ons); LibreChat = multi-provider chat with pre-wired RAG but **not a support product.** ([Chatwoot GitHub](https://github.com/chatwoot/chatwoot), [eesel on Chatwoot](https://www.eesel.ai/blog/chatwoot), [LibreChat](https://railway.com/deploy/librechat))

**Tier D — MENA/Arabic specialists (the real competitive set): DOO, Teammates.ai, Wittify, BotPenguin Arabic, YourGPT.** These already pitch Najdi/Hijazi/Arabizi dialects, WhatsApp Business, and GCC data residency / PDPL compliance — clientMORE must beat *these*, not Sierra. ([DOO](https://www.doo.ooo/), [teammates.ai](https://teammates.ai/arabic-chatbot), [Wittify 2026 review](https://blog.wittify.ai/en/blog-posts/the-best-arabic-voice-ai-and-chat-agents-2026-review-scaling-enterprise-government-service), [GulfSaasReview KSA 2026](https://gulfsaasreview.com/guide/best-ai-chatbot-software-saudi-arabia-2026))

### 1.2 Feature comparison — clientMORE vs. competitors

Legend: ✅ built · 🟡 partial/MVP · 🔜 planned/missing · ❌ not offered · 💲 paid add-on

| Capability | **clientMORE (today)** | Intercom Fin | Ada | Sierra | Chatbase | Voiceflow | Botpress (OSS) | Chatwoot (OSS) | MENA specialists (DOO/Teammates) |
|---|---|---|---|---|---|---|---|---|---|
| RAG from own docs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 (bolt-on) | ✅ |
| **Native Arabic + RTL + dialects** | ✅ EN/AR detect+RTL; 🟡 dialects | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ✅ (Najdi/Hijazi/Arabizi) |
| **WhatsApp-first** | 🟡 inbound works; 🔜 outbound reply | 💲 | 💲 | 💲 | 💲 | ✅ (Twilio) | 🟡 | ✅ | ✅ |
| Telegram | ✅ (long-poll + webhook) | 🟡 | ❌ | ❌ | 🟡 | 🟡 | ✅ | ✅ | 🟡 |
| Web widget / embed | ✅ `/widget` + embed.js | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Human handoff queue | ✅ queue; 🔜 reply delivery | ✅ | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ✅ (core strength) | ✅ |
| Learn-back (agent answer → KB) | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ | 🟡 |
| **Purchase / order flow in chat** | ✅ state machine | 🟡 (Procedures) | 🟡 | ✅ (workflows) | ❌ | ✅ (flows) | ✅ | ❌ | 🟡 |
| **Keyless / offline fallback** | ✅ (hash embed + extractive) | ❌ | ❌ | ❌ | ❌ | ❌ | 🟡 | ❌ | ❌ |
| Multi-LLM provider routing | ✅ Gemini/DeepSeek/OpenAI | ❌ | ❌ | ❌ | 🟡 | ✅ | ✅ | 🟡 | 🟡 |
| **GCC data residency / self-host** | 🟡 (self-hostable; not packaged) | ❌ | 💲 | 💲 | ❌ | ❌ | ✅ | ✅ | ✅ |
| Multi-tenant + auth | 🔜 **missing** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Billing / usage enforcement | 🔜 **missing** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Analytics / CSAT | 🟡 aggregate; CSAT placeholder | ✅ (CX Score) | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 |
| Transparent low price | 🔜 (to set) | ❌ ($0.99/res) | ❌ | ❌ | ✅ | 🟡 (seats) | ✅ | ✅ | 🟡 |

**Where we already win:** keyless resilience, multi-provider cost control, in-chat purchase flow, true EN/AR+RTL, Telegram-native, self-hostable Python stack.
**Where we lose today:** auth/tenancy/billing (table stakes), handoff reply delivery, dialect depth, packaged data-residency story, analytics depth.

---

## 2. Differentiation opportunities (how clientMORE wins)

Each tied to evidence and a concrete bet.

1. **Arabic-first, not Arabic-bolted-on.** WhatsApp penetration is ~92% in UAE and similarly extreme in KSA/Qatar/Kuwait ([eshal.ai MENA guide](https://eshal.ai/blog/whatsapp-business-ai-mena)). The enterprise leaders are English-first; MENA specialists own dialects. clientMORE already has EN/AR detection + RTL ([`core/language.py`](../backend/core/language.py), [`language-provider.tsx`](../MoreClient/src/components/language-provider.tsx)) and SAR currency defaults. **Bet:** invest in Gulf-dialect + Arabizi handling and Arabic RAG eval to reach *specialist parity*, then undercut on price.

2. **WhatsApp-first commerce, not just support.** The unique asset is the **in-chat purchase state machine** ([`purchase_flow.py`](../backend/services/purchase_flow.py)). Pair it with WhatsApp (the dominant MENA channel) and clientMORE becomes "**AI support + ordering on WhatsApp**" — a story neither Chatbase nor Sierra tells well. **Prerequisite:** outbound WhatsApp delivery (currently missing).

3. **Transparent, affordable, predictable pricing.** Enterprise is opaque/$30K–$200K+; Fin's $0.99/resolution scares SMBs. Recommend **flat monthly tiers with generous message caps + transparent overage**, undercutting Chatbase's $120 Standard for the SMB segment, and a **WhatsApp message-cost passthrough** model (Meta MENA marketing msgs ≈ $0.013–$0.06 + BSP markup $0.003–$0.01) so the bot's value is decoupled from Meta's per-message fees. ([WhatsApp 2026 pricing](https://www.engagelab.com/blog/whatsapp-business-api-pricing))

4. **Deployment model = data-sovereignty wedge.** GCC government/enterprise require **sovereign data residency + PDPL compliance**; self-hosting addresses it ([GulfSaasReview](https://gulfsaasreview.com/guide/best-ai-chatbot-software-saudi-arabia-2026)). The Python+SQLite/Postgres+Chroma stack is already self-hostable. **Bet:** package a "**deploy in your KSA/UAE cloud**" option (Docker + Postgres + local embeddings) that Tier A/B SaaS cannot match.

5. **Keyless / low-cost resilience as a real feature.** The hash-embed + extractive fallback ([`embeddings.py`](../backend/services/ai/embeddings.py)) lets the bot run with zero LLM spend — uniquely valuable for NGOs/SMBs and for **demos that never go dark**. No competitor offers this. Frame it as "**never offline, even without an API key**."

6. **Cost-routed multi-provider brain.** `chat_provider_chain()` already routes Gemini→DeepSeek→OpenAI ([`config.py`](../backend/core/config.py)). This is a margin lever competitors locked to one vendor don't have — lead with cheap models, escalate to premium only on hard queries.

---

## 3. Phased product roadmap (Now / Next / Later)

Tied directly to current code maturity. (Mirrors and extends PRD §16, re-sequenced for go-to-market.)

### NOW (0–6 weeks) — "Make it a real product you can sell to one paying tenant"
*Unlocks: first paid pilot. Closes table-stakes gaps.*
- **Real auth** (login/session) on top of existing `AuthUser` ([`tables.py:115`](../backend/models/tables.py#L115)) — guard `/dashboard` and `/admin`.
- **Single-tenant → real tenant isolation:** migrate the single-row `Setting` to per-tenant; scope `Document`/`Conversation`/`Handoff` by tenant.
- **Handoff reply delivery** back to Telegram/WhatsApp/widget — the #1 functional gap (PRD §7.3). Reuses channel `deliver()` in [`services/channels/`](../backend/services/channels/).
- **DB migrations (Alembic)** + **Postgres** path — kill the "delete the SQLite file" workflow ([`tables.py:5`](../backend/models/tables.py#L5)).
- **Encrypt channel tokens** (currently plaintext) + backend upload size/type limits.
- **Brand/lint cleanup:** standardize "clientMORE", remove dead TS scaffold, green `lint`/`typecheck`/`build`.

### NEXT (6–16 weeks) — "Win the MENA SMB segment"
*Unlocks: self-serve signups, WhatsApp commerce story, repeatable sales.*
- **WhatsApp-first onboarding** (BSP/Twilio setup wizard) + **outbound purchase-flow** on WhatsApp.
- **Arabic dialect + Arabizi** handling and an **Arabic/English RAG eval harness** (extend [`scripts/benchmark_chat.py`](../backend/scripts/benchmark_chat.py)).
- **Billing + usage enforcement:** wire `Tenant.limit_messages` to real caps; Stripe (or local invoicing for KSA) + plan gates.
- **Analytics depth:** persist per-answer confidence/source/latency/escalation reason; real CSAT capture (replace placeholder constant).
- **Real-time widget** (use the existing `/ws/chat` endpoint for live agent replies).

### LATER (4–9 months) — "Defensible & enterprise-ready"
*Unlocks: GCC enterprise/government, partner/reseller motion.*
- **Sovereign self-host package** (Docker Compose, Postgres, local embedding model) + PDPL/data-residency docs.
- **Super-admin platform** backed by real APIs (replace mock `/admin`).
- **Voice channel** (close gap vs. Fin/Voiceflow) and richer commerce (catalog, payment links).
- **Eval/observability suite:** RAG datasets, Playwright E2E, structured logging/tracing, error monitoring (PRD §16 P4).

---

## 4. Parallel execution plan — 5 agents, non-overlapping file lanes

**Goal:** five agents (or four code + one already-running research) work **simultaneously with zero merge conflicts**. Conflict-freedom is guaranteed by **strict file/directory ownership** plus a **frozen contract layer** no one edits without an RFC.

### 4.0 Frozen contracts (edited by NO agent without a contract RFC)

These two files are the API boundary. Changing them ripples across lanes, so they are **frozen** for the sprint; changes go through the coordination protocol (§4.7):

- **`backend/schemas/*`** (Pydantic camelCase aliases) — the wire shape.
- **[`MoreClient/src/lib/api.ts`](../MoreClient/src/lib/api.ts)** — the TS mirror of those schemas.

If a lane *must* change a contract, it writes the diff into `docs/handoff/CONTRACTS.md` and pings affected lanes **before** merging. Frontend and Backend lanes co-own `api.ts`/`schemas` edits via that protocol only.

### 4.1 Lane ownership map (the conflict-free split)

| Agent | Owns (writeable) | Read-only | Branch |
|---|---|---|---|
| **A — Frontend** | `MoreClient/src/app/**`, `MoreClient/src/components/**`, `MoreClient/public/**` | `api.ts`, `backend/**` | `feat/fe-*` |
| **B — Backend core** | `backend/routers/{chat,files,analytics,handoffs,learn,purchases,settings}.py`, `backend/services/{chat_service,intent_classifier,purchase_flow}.py`, `backend/core/**` | `models/**`, `schemas/**` | `feat/be-*` |
| **C — AI/RAG** | `backend/services/ai/**`, `backend/services/ingestion/**`, `backend/scripts/**`, `backend/tests/**` | `core/config.py`, `models/**` | `feat/ai-*` |
| **D — Integrations/Channels** | `backend/services/channels/**`, `backend/routers/{channels,ws}.py` | `chat_service.py`, `schemas/chat.py` | `feat/ch-*` |
| **E — DevOps/Auth/Billing** | `backend/models/**`, `backend/routers/admin.py`, `backend/schemas/{auth,tenants}.py`, new `backend/migrations/**`, `backend/core/auth*` (new), root infra (`Dockerfile`, `docker-compose.yml`, CI, `.env.example`) | everything | `feat/ops-*` |

**Why this is conflict-free:** every Python module and every frontend directory has exactly one writer. The only shared files (`models/tables.py`, `schemas/*`, `api.ts`) are **owned by E (models) and gated by the contract RFC (schemas/api.ts)** — see §4.7. Agent E owns `models/tables.py` because auth/tenancy/migrations is the only lane that legitimately needs schema columns; others request columns via handoff file.

> ⚠️ **Worktree isolation recommended:** run each lane in its own git worktree/branch (`git worktree add`) so concurrent edits never touch the same working tree.

### 4.2 Agent A — Frontend
- **Scope:** Auth UI wiring, handoff reply UX (incl. delivery status), real-time widget via `/ws/chat`, analytics depth UI, billing/upgrade screens, brand cleanup, dialect language toggle.
- **Deliverables:** working login → guarded dashboard; handoff reply box that shows delivered/failed; widget consuming WebSocket; CSAT capture widget; green `npm run lint`/`typecheck`/`build`.
- **Acceptance:** All pages render EN+AR/RTL; no new demo-only local state on backend-backed pages; types consumed from `api.ts` unchanged (or via §4.7); Lighthouse/build pass.
- **Depends on:** E (auth endpoints), B (analytics fields), D (delivery status field) — consumes via frozen contracts; can mock against `api.ts` types until ready.

### 4.3 Agent B — Backend core
- **Scope:** Per-tenant scoping of chat/files/analytics/handoffs/settings logic; persist per-answer confidence/source/latency/escalation reason; CSAT endpoint; tighten intent/purchase routing.
- **Deliverables:** tenant-scoped queries in routers/services; new analytics fields populated; CSAT write path; updated `backend/tests/` for routing.
- **Acceptance:** `py -X utf8 -m pytest backend/tests` green; `_checkpoint1.py` smoke passes; deflection/confidence persisted per message; no schema edits (requests columns from E).
- **Depends on:** E (tenant model + migrations, `get_current_tenant` dependency). Stubs tenant=1 until E lands.

### 4.4 Agent C — AI/RAG
- **Scope:** Arabic dialect/Arabizi normalization, Arabic+English RAG eval harness, retrieval quality (chunking, reranking, threshold tuning per embedding mode), ingestion robustness.
- **Deliverables:** eval dataset + scoring script under `backend/scripts/`; dialect preprocessor in `services/ai/`; documented accuracy/latency baselines; keyless-mode escalation tuning.
- **Acceptance:** eval harness reports answer-accuracy & p95 latency; `benchmark_chat` still passes p95 < 3s; retrieval changes behind `Setting`/config flags (no contract change).
- **Depends on:** none hard (reads config/models). Coordinates with B on any new `Setting` flag (request to E).

### 4.5 Agent D — Integrations/Channels
- **Scope:** **Handoff reply delivery** back to each channel (the priority gap), WhatsApp BSP/Twilio outbound for purchase flow, webhook signature hardening, channel setup wizard endpoints.
- **Deliverables:** `deliver()` paths invoked on agent reply; outbound message API; signature checks gated by config; channel health/status surfaced for the dashboard.
- **Acceptance:** agent reply in dashboard reaches Telegram + WhatsApp test numbers; webhooks still return HTTP 200 on all paths; `_checkpoint1.py` channel flow passes.
- **Depends on:** B (handoff reply event hook) — agree on the internal function signature in `chat_service.py` (B owns the file; D consumes a documented hook).

### 4.6 Agent E — DevOps/Auth/Billing (owns the foundation)
- **Scope:** Alembic migrations + Postgres; real auth (sessions/JWT) on `AuthUser`; per-tenant `Setting`; billing + `limit_messages` enforcement; token encryption; Docker/CI; super-admin real APIs.
- **Deliverables:** `backend/migrations/`, `auth` module + router, encrypted-token storage, plan-gate middleware, `Dockerfile`/`docker-compose.yml`, CI running lint/typecheck/build/pytest.
- **Acceptance:** migrations apply cleanly to Postgres; login issues/validates sessions; usage cap blocks at limit; tokens encrypted at rest; CI green on all branches.
- **Depends on:** none (foundation lane). **Publishes** new columns/contracts first so others unblock.

### 4.7 Coordination protocol

1. **Branch/worktree per lane** off `main` (or current `hardening/safe-fixes`): `feat/{fe,be,ai,ch,ops}-<topic>`. Use `git worktree` to isolate working trees.
2. **Handoff directory `docs/handoff/`** (create it; it's outside every code lane so it never conflicts):
   - `CONTRACTS.md` — proposed `schemas/*` + `api.ts` changes; **must be accepted before** the owning lane edits the frozen files.
   - `SCHEMA_REQUESTS.md` — lanes B/C/D request new `Setting`/table columns; **E implements** them in `models/tables.py` + a migration.
   - `STATUS.md` — one line per lane per day: what merged, what's blocked.
3. **Merge order to minimize churn:** **E first** (migrations/auth/tenant scaffolding land early so B/A/D build on real columns) → then B/C/D/A in any order. Rebase onto `main` before each merge; lanes never rebase *each other's* in-flight branches.
4. **Frozen-contract rule:** no edit to `backend/schemas/*` or `api.ts` without an accepted `CONTRACTS.md` entry. Frontend (A) and Backend (B) are the only two that touch these, and only via the RFC.
5. **Green gate before merge:** every lane runs its acceptance commands (`pytest`, `_checkpoint1.py`, `npm run lint/typecheck/build`) on its branch before opening the PR.

### 4.8 Dependency graph (who unblocks whom)

```
        E (auth/tenant/migrations/CI) ──► B (tenant-scoped logic, analytics fields)
              │                              │
              │                              ├──► A (auth UI, analytics UI, CSAT)
              ▼                              │
        D (handoff delivery, WhatsApp) ◄─────┘ (consumes B's reply hook)
                                              ▲
        C (RAG quality / Arabic eval) ────────┘ (independent; flags via E)
```

---

## 5. Success metrics & targets

Tracks the gaps in [`analytics.py`](../backend/routers/analytics.py) (today: aggregate, CSAT placeholder) toward instrumented KPIs.

| Metric | Definition | How measured | Target (MVP→GA) |
|---|---|---|---|
| **Answer accuracy** | % grounded, correct answers on eval set | New AR/EN eval harness (Agent C) | ≥ 80% EN / ≥ 70% AR → ≥ 90% / ≥ 85% |
| **p50 / p95 latency** | Chat turn round-trip | [`benchmark_chat.py`](../backend/scripts/benchmark_chat.py) gate | p95 **< 3s** (existing gate); p50 < 1.2s |
| **Escalation rate** | % conversations creating a handoff | `Handoff` rows / conversations | Healthy band **10–25%** (too low = hallucination risk; too high = poor coverage) |
| **Deflection rate** | % questions resolved w/o human | existing `deflection_rate` KPI | ≥ 70% → ≥ 85% |
| **CSAT** | Post-chat thumbs/rating | New CSAT capture (A+B); replace placeholder | ≥ 4.2 / 5 |
| **Handoff reply delivery success** | % agent replies delivered to channel | Delivery status (Agent D) | **≥ 99%** (currently 0 — undelivered) |
| **First-response time (human)** | Handoff created → agent reply sent | `Handoff.created_at` → agent `Message` | < 5 min business hours |
| **Arabic share & quality** | % AR conversations; AR accuracy delta vs EN | language field on messages | AR accuracy within 5 pts of EN |
| **Cost per resolved conversation** | LLM+WhatsApp cost / resolution | provider routing logs + WhatsApp passthrough | Beat Fin's $0.99 by ≥ 50% via cheap-model routing |
| **Usage cap accuracy** | enforced vs `limit_messages` | billing gate (Agent E) | 100% enforced, 0 overage leakage |

---

## Sources

- [Intercom pricing](https://www.intercom.com/pricing) · [Intercom Fin pricing breakdown (minami.ai)](https://minami.ai/blog/intercom-fin-ai-agent-pricing) · [Fin.ai pricing comparison](https://fin.ai/learn/ai-customer-service-agent-pricing-comparison)
- [Ada CX pricing (featurebase)](https://www.featurebase.app/blog/ada-cx-pricing) · [Ada resolution-vs-conversation pricing](https://www.ada.cx/blog/unpacking-ai-agent-pricing-resolution-based-vs-conversation-based-models/) · [Sierra guide (myaskai)](https://myaskai.com/blog/sierra-ai-complete-guide-2026) · [Build-vs-buy 3-yr cost (OpenNash)](https://opennash.com/blog/ai-agent-platforms-vs-custom-built-ai-the-real-3-year-cost/)
- [Chatbase vs Botpress vs Voiceflow (builts.ai)](https://builts.ai/blog/chatbase-vs-botpress-vs-voiceflow/) · [Chatbase pricing (CostBench)](https://costbench.com/software/ai-chatbot-platforms/chatbase/) · [Voiceflow review (Botpress)](https://botpress.com/blog/voiceflow-review) · [Botpress alternatives (gptbots)](https://www.gptbots.ai/blog/botpress-alternatives)
- [Chatwoot GitHub](https://github.com/chatwoot/chatwoot) · [Chatwoot analysis (eesel)](https://www.eesel.ai/blog/chatwoot) · [LibreChat deploy](https://railway.com/deploy/librechat) · [Best open-source chatbots 2026](https://www.openassistantgpt.io/articles/best-open-source-ai-chatbots-2026)
- [WhatsApp Business AI in MENA (eshal.ai)](https://eshal.ai/blog/whatsapp-business-ai-mena) · [Best AI chatbot software KSA 2026 (GulfSaasReview)](https://gulfsaasreview.com/guide/best-ai-chatbot-software-saudi-arabia-2026) · [DOO](https://www.doo.ooo/) · [Teammates.ai Arabic chatbot](https://teammates.ai/arabic-chatbot) · [Arabic voice/chat agents 2026 (Wittify)](https://blog.wittify.ai/en/blog-posts/the-best-arabic-voice-ai-and-chat-agents-2026-review-scaling-enterprise-government-service) · [Arabic chatbot dialects (BotPenguin)](https://www.botpenguin.com/blogs/arabic-chatbot)
- [WhatsApp Business API pricing 2026 (EngageLab)](https://www.engagelab.com/blog/whatsapp-business-api-pricing) · [WhatsApp API per-message rates by country (whautomate)](https://whautomate.com/whatsapp-business-api-pricing)
