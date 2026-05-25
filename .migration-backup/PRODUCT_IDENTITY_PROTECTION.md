# PRODUCT_IDENTITY_PROTECTION

> Governance baseline maintained by the Project Preservation & Architecture Alignment Agent.
> Last updated: 2026-05-24 · Branch: `frontend-dev`

Records the product's protected identity: the mission, the workflows and business logic that must not
be diluted, approved directions for expansion, and directions that are explicitly out of scope. The
goal is to let the product get *better* without letting it become a *different product*.

---

## 1. Protected mission (do not pivot)

**clientMORE** is a **bilingual (Arabic/English) AI customer-support bot that answers from a
customer's own documents (RAG), works across Web / Telegram / WhatsApp, and escalates to a human when
unsure.**

Three identity pillars — every feature must reinforce at least one and contradict none:
1. **Document-grounded answers (RAG).** The bot answers from the customer's ingested docs, not from
   open-ended generation. Long-term memory is *context only* — **never** a knowledge source.
2. **Arabic-first bilingual UX with RTL.** EN/AR parity is a differentiator, not a nice-to-have.
3. **Safe escalation to a human.** When unsure (low confidence, "talk to a human", complaint), the bot
   hands off rather than hallucinating.

The brand string is **"clientMORE"** (exact casing). Do not rename, re-theme, or sub-brand without
explicit owner approval.

---

## 2. Protected workflows (preserve behavior + ordering)

These are core flows. Changes here require change-impact analysis and a strong justification.

- **Ingestion pipeline** — single entry `ingest_document(db, filename, data)`: extract → chunk
  (~800/120) → embed → Chroma → commit `Document`. `status="processing"` first so mid-failure records
  `"failed"`. *Reuse this entry point; do not reimplement ingestion per file type.*
- **RAG strategy resolution** — human-keyword / empty-KB → escalate; else retrieve top-`K` and
  **escalate below `confidence_threshold` (0.45)**. A `Handoff` row is created on escalation.
- **Chat gate chain** (first match wins): handoff → active purchase flow → intent classification →
  RAG fallback. Ordering is product behavior, not an implementation detail.
- **Purchase flow state machine** — product → quantity → address → confirmation, persisted per
  conversation (`PurchaseOrder.state` + `order_data`). Bilingual.
- **Channel parity** — Web / Telegram / WhatsApp all funnel through one `ChatService.handle()`.
  Session IDs are channel-scoped (`web:`, `tg:`, `wa:`). A feature added to one channel should be
  reasoned about for all three.
- **Single-row tenant `Setting`** drives bot config and feature toggles
  (`purchase_flow_enabled`, `intent_llm_enabled`, `auto_handoff_on_complaint`, …). New behavior should
  be toggle-gated through `Setting`, consistent with existing flags.

---

## 3. Protected business logic / invariants
- **Keyless dev mode must keep working.** The app boots/demos with zero secrets (hash embeddings +
  extractive top-chunk fallback). Do not add a hard dependency on any provider key to core paths.
- **Webhooks always return HTTP 200** (providers retry otherwise); errors are swallowed by design.
- **Keyless confidence floors ~0.50** and does not separate cleanly — demo escalation via the
  "talk to a human" keyword, keep threshold 0.45. Do not "fix" this by raising the threshold in
  keyless mode.

---

## 4. Approved feature directions (extend the product naturally)
A feature is approvable if it extends an existing workflow, strengthens a pillar, fits the
architecture cleanly, and solves a real (ideally regional/Arabic-market) problem. Examples that fit:
- Better ingestion coverage (more document formats) through the existing `ingest_document` entry.
- Richer handoff tooling (agent inbox, canned replies) building on the existing `Handoff` model.
- Analytics that surface escalation/confidence trends from existing data.
- Additional OpenAI-compatible providers via the existing provider chain.
- Per-tenant widget theming that respects the EN/AR + RTL system.
- **Wiring real authentication** (see §6) — this is approved and *needed*, not a pivot.

## 5. Rejected feature directions (out of scope / identity risk)
- Product pivots or unrelated SaaS ideas bolted onto the bot.
- Open-ended/ungrounded generation that bypasses RAG and document grounding.
- AI gimmicks with no practical support-workflow value.
- Features blindly copied from competitors without regional/user-value justification.
- A second i18n system, a second chat entry path, or a second config store — all dilute coherence.
- Adopting blueprint stack pieces (Stripe/Clerk/Inngest/Pusher) into the live app ad hoc, outside an
  explicit "build the blueprint" decision.

---

## 6. UX & identity consistency notes
- **Auth is half-scaffolded and not functional**: sign-up UI + OAuth config keys + `AuthUser` table
  exist, but there is **no backend auth router and no working login**. `/admin` tenant CRUD is
  **unauthenticated**. This is an identity *and* security gap — the product presents as multi-tenant
  SaaS but cannot actually authenticate tenants. Closing this is the highest-value identity-preserving
  work item (tracked in TECHNICAL_DEBT_TRACKER as security-critical).
- Maintain EN/AR parity and RTL correctness in every new screen; an English-only addition is a
  regression of pillar #2.
- Loading/error states should use the established hooks/components (`useAsyncOnMount`, `error.tsx`,
  loading skeletons) so behavior stays coherent across the dashboard.
