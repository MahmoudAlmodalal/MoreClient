# CHANGE_IMPACT_ANALYSIS

> Governance baseline maintained by the Project Preservation & Architecture Alignment Agent.
> Last updated: 2026-05-24 · Branch: `frontend-dev` · HEAD: `f6259ee`

For every **major** change, append an entry using the template in §3. "Major" = touches a protected
workflow, a cross-app contract, the data layer, routing, channels, or auth. Routine, in-module edits
do not need an entry.

---

## 1. Standing impact map (what depends on what)

Use this to reason about blast radius before editing.

- **`backend/schemas/*`** ↔ **`MoreClient/src/lib/api.ts`** — hand-synced contract. Editing a Pydantic
  alias is a **cross-app breaking change**; both sides must change together.
- **`chat_service.handle()`** — the convergence point for *all* channels (web/tg/wa) and the web WS
  route. Any change here affects every transport simultaneously.
- **`Setting` (single row)** — read app-wide via `get_or_create_settings`. Adding a column needs the
  `upgrade_existing_schema()` ALTER shim path (no migration tool); a rename is high-risk.
- **Chroma ID convention** (`doc-{id}-{i}`, `learned-{id}`) — changing it breaks deletion-by-`where`
  and orphans existing vectors. Requires a re-index plan.
- **`config.*_provider_chain()`** — provider routing for chat + embeddings; changing order changes
  which key is used in `auto` mode and can alter latency/escalation behavior.
- **`api.ts` gateway** — every dashboard page depends on it; changing its error/`detail` handling
  affects all surfaced error messages.

---

## 2. Pending / recently observed changes assessed

### CA-2026-05-24-A · Uncommitted CLAUDE.md edit (documentation only)
- **Affected modules:** `CLAUDE.md` only (working-tree modification, +8 lines).
- **What:** documents the recent `useAsyncOnMount`/`usePolling` and `useSessionRole` hook patterns and
  component-grouping convention.
- **Compatibility impact:** none (docs).
- **Deployment impact:** none.
- **Rollback:** trivial (`git checkout CLAUDE.md`).
- **Verdict:** ✅ Approved. Consistent with commits `78f1c4f`→`d8aea5d`. *Recommend also fixing the
  now-stale stub references in the same doc — see ARCHITECTURE_ALIGNMENT_REPORT Risk #1.*

### CA-2026-05-24-B · Removal of dead scaffold (`4387065`, already landed)
- **Affected modules:** `src/server/`, top-level `frontend/` Vite prototype.
- **Compatibility impact:** none — these were never part of the running app.
- **Residual:** empty `MoreClient/src/app/api/` directory remains (see Tracker TD-04).
- **Verdict:** ✅ Good hygiene; finish by deleting the empty `api/` dir.

### CA-2026-05-24-C · Frontend hook refactors (`26d00b0`, `be518ce`, `78f1c4f`, already landed)
- **Affected modules:** `dashboard/*`, `src/lib/use-async-effect.ts`, `use-session-role.ts`.
- **Compatibility impact:** internal; no API/contract change.
- **Scalability/maintainability:** positive — centralizes fetch-on-mount and role reads, satisfies the
  `set-state-in-effect` lint rule.
- **Verdict:** ✅ Model example of approved incremental evolution.

---

## 3. Entry template (copy for each new major change)

```
### CA-YYYY-MM-DD-<id> · <short title>
- Affected modules:        <files / layers>
- Cross-app contract hit?: <yes/no — if yes, both sides updated in this change?>
- Compatibility impact:    <backward-compatible? breaking? runtime vs compile-time?>
- Deployment impact:       <env vars, seed/restart order, Chroma re-index, schema ALTER?>
- Rollback considerations: <how to revert; data implications>
- Scalability implications:<multi-tenant / Postgres / load notes>
- Keyless-mode safe?:      <does it still boot with zero secrets?>
- Verdict:                 <Approved / Approved-with-conditions / Rejected — rationale>
```

---

## 4. Recurring deployment gotchas (check on every relevant change)
- **ChromaDB single-writer:** seeding rewrites the persistent store; a running uvicorn caches the
  collection and 500s on retrieval until restarted. **Seed before starting, or restart after seeding.**
- **Schema additions** must go through `upgrade_existing_schema()` (additive ALTER) — there is no
  general migration tool. No destructive migrations.
- **Windows + Arabic:** test Arabic paths via `py -X utf8` (httpx / `--data-binary @file`), not raw
  curl — curl/bash mangle Arabic UTF-8.
- **Shared working tree:** assert branch before committing; stage by explicit path, never `git add -A`.
