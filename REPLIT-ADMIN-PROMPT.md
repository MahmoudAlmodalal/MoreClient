# Replit Build Prompt — “More Client” Admin Control Plane (Frontend)

> Paste this entire document into the Replit Agent as a single brief. It is a complete, self-contained specification for building the **platform admin dashboard** of *More Client*. Build exactly what is described; do not invent additional product surfaces (no marketing site, no talent/company dashboards). Treat every version and decision marked **LOCKED** as non-negotiable.

---

## 0. Role & Objective

You are a **senior frontend engineer**. Build a **production-grade, bilingual (Arabic + English), fully responsive admin control plane** for *More Client*, a two-sided talent marketplace for the MENA region.

This is **frontend only**, **mock-first**: the real backend (Prisma/Neon/Clerk/Stripe/Pinecone) does **not** exist yet. You will build the complete admin UI against a **typed mock API layer** whose contracts mirror the locked backend schemas, so that swapping to the real `/api/v1/admin/*` endpoints later is a one-file change. Do **not** stub business logic into components — all data must flow through the mock API/query layer.

Deliver an app that looks and behaves like a polished internal tool a platform operations team would use daily: dense but legible tables, fast filtering, keyboard-driven, accessible, and bilingual with full RTL.

---

## 1. Product Context (read once, then build)

*More Client* connects **companies** (who post jobs) with **talent** (individual professionals). The platform runs AI matching, semantic search, in-app messaging, Stripe-Connect escrow with a 10% take rate, KYC verification (talent) and business verification (companies), a moderation pipeline, and an AI feedback/improvement loop.

The **admin control plane** is the operator surface that governs all of the above. Admins are **not tenants** — they are platform staff (`PlatformAdmin`) who can view and act across every company and talent account. Your job is to build their tools.

The four admin roles, in descending power: **`super_admin` → `admin` → `moderator` → `support`**. The UI must respect a permission matrix (see §8).

---

## 2. Scope & Non-Goals

**In scope (build all of this):**
- The complete `(admin)` route group and every page listed in §11.
- Admin app shell: grouped sidebar, topbar, command palette (Cmd-K), breadcrumbs.
- Mock API layer + seeded fixtures + TanStack Query wiring for every page.
- Simulated auth + role switching to exercise RBAC.
- Simulated realtime (admin live activity) + simulated SSE activity feed.
- Full bilingual AR/EN with RTL, dark-first theming with light mode, WCAG 2.1 AA.

**Out of scope (do not build):**
- Marketing site, auth screens (Clerk UI), talent dashboard, company dashboard, public profiles, the chat widget.
- Real database, real Clerk, real Stripe, real Pinecone, real OpenAI/Cohere calls.
- Server-side business logic beyond mock handlers.

If you finish early, polish empty/loading/error states and accessibility — do **not** expand scope.

---

## 3. Tech Stack — LOCKED

Use these exact choices and versions. Do not substitute libraries.

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router, RSC, Server Actions, Turbopack dev) | **16.2.6** |
| UI runtime | React | **19.2.4** |
| Language | TypeScript (strict, `verbatimModuleSyntax: true`) | **5.9.3** |
| Styling | Tailwind CSS | **4.x** |
| Component primitives | **shadcn/ui** (2024-11 register, Tailwind 4 compatible) | latest compatible |
| Server state | `@tanstack/react-query` | **5.62.x** |
| Global client state | `zustand` | **4.5.x** |
| Forms | `react-hook-form` + `@hookform/resolvers/zod` | **7.54.x / 3.10.x** |
| Validation | `zod` | **3.23.8** |
| URL state (filters, cursors) | `nuqs` | **2.2.x** |
| Charts (lazy-loaded) | `recharts` | **2.13.x** (React 19 compatible 2.x) |
| Icons (per-icon imports) | `lucide-react` | per repo (`^1.16.0`) |
| Toasts / undo | `sonner` | **1.7.x** |
| Command palette | `cmdk` | **1.x** |
| Dates | `date-fns` | **4.1.x** |
| i18n | `next-intl` | **3.x** |
| Markdown render | `react-markdown` + `rehype-sanitize` | **9.x / 6.x** |
| Mock API | `msw` (Mock Service Worker, browser + node) | **2.x** |
| IDs | `ulid` | **3.x** |

**Banned:** MUI, Mantine, Chakra, Drizzle, GraphQL, Redux, moment, lodash, any custom design-system-from-scratch. Use shadcn/ui primitives only.

---

## 4. Replit & Project Setup

- Initialize a Next.js 16.2.6 TypeScript App-Router project (pnpm).
- Add a `.replit` run config: dev = `pnpm dev` (Next on port from `$PORT`, bind `0.0.0.0`), and a deploy build = `pnpm build` / start = `pnpm start`.
- `tsconfig.json`: `strict: true`, `verbatimModuleSyntax: true`, path alias `@/* → ./src/*`.
- `.env.example` only (no secrets): `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_USE_MOCKS=true`, `NEXT_PUBLIC_DEFAULT_LOCALE=en`.
- Initialize shadcn/ui (`components.json`) targeting Tailwind 4 and the `src/components/ui` directory.
- Configure MSW: a browser worker (`public/mockServiceWorker.js`) started in a client provider when `NEXT_PUBLIC_USE_MOCKS=true`, plus a node server for any RSC/route-handler fetches.
- Root route `/` redirects to `/admin/dashboard`.

---

## 5. Architecture & Folder Structure

Build this slice (admin-only subset of the locked full-app structure):

```
src/
├── middleware.ts                      # simulated admin gate (see §8)
├── app/
│   ├── layout.tsx                     # Providers: Query, Theme, Locale, Pusher(mock), Mocks
│   ├── globals.css                    # Tailwind 4 + tokens (see §6)
│   ├── page.tsx                       # redirect → /admin/dashboard
│   └── (admin)/
│       ├── layout.tsx                 # admin shell (sidebar + topbar + breadcrumbs)
│       ├── dashboard/page.tsx
│       ├── companies/page.tsx
│       ├── companies/[id]/page.tsx
│       ├── talent/page.tsx
│       ├── talent/[id]/page.tsx
│       ├── moderation/queue/page.tsx
│       ├── moderation/reports/page.tsx
│       ├── moderation/[id]/page.tsx
│       ├── verification-queue/page.tsx
│       ├── featured/page.tsx
│       ├── subscriptions/page.tsx
│       ├── support/page.tsx
│       ├── support/[ticketId]/page.tsx
│       ├── ai-usage/page.tsx
│       ├── feedback/page.tsx
│       ├── feedback/[id]/page.tsx
│       ├── feedback/tasks/page.tsx
│       ├── feedback/tasks/[id]/page.tsx
│       ├── audit-log/page.tsx
│       ├── activity/page.tsx
│       ├── analytics/page.tsx
│       └── settings/
│           ├── flags/page.tsx
│           ├── plans/page.tsx
│           └── admins/page.tsx
│
├── components/
│   ├── ui/                            # shadcn primitives (button, dialog, input, select, tabs, table, toast/sonner, badge, dropdown-menu, sheet, tooltip, skeleton, switch, checkbox, command, …)
│   ├── patterns/                      # DataTable, EmptyState, ErrorBoundary, ConfirmDialog, StatusPill, UsageMeter, PageHeader, FilterBar, MetricCard, AdminActionMenu, JsonViewer
│   └── layout/                        # admin-sidebar, topbar, command-palette, breadcrumbs, role-switcher, locale-switcher, theme-toggle
│
├── features/admin/
│   ├── companies/  (components, hooks, queries)
│   ├── talent/
│   ├── moderation/
│   ├── verification/
│   ├── featured/
│   ├── subscriptions/
│   ├── support/
│   ├── ai-usage/
│   ├── feedback/
│   ├── audit/
│   ├── activity/
│   ├── analytics/
│   └── settings/
│
├── lib/
│   ├── api/
│   │   ├── fetcher.ts                 # single fetch wrapper (JWT header stub, X-Request-Id, problem+json → typed error, 401 retry-once)
│   │   ├── admin.ts                   # typed admin client (one fn per endpoint in §10)
│   │   └── types.ts                   # response envelopes (cursor pagination, problem+json)
│   ├── rbac.ts                        # admin permission matrix + can() helper
│   ├── format.ts                      # money(minorUnits,ccy,locale), date, number, relativeTime — locale aware
│   └── utils.ts                       # cn(), etc.
│
├── mocks/
│   ├── browser.ts                     # setupWorker
│   ├── server.ts                      # setupServer
│   ├── handlers/                      # one file per resource, returns seeded data with latency + pagination
│   └── data/                          # deterministic seed fixtures (faker with fixed seed) for every entity in §9
│
├── stores/
│   ├── ui-store.ts                    # sidebar collapsed, command palette open, theme
│   └── admin-store.ts                 # simulated current admin (role), live activity buffer
│
├── providers/
│   ├── query-provider.tsx
│   ├── theme-provider.tsx
│   ├── locale-provider.tsx
│   ├── pusher-provider.tsx            # MOCK: emits fake presence-admin-activity events on an interval
│   └── mocks-provider.tsx             # starts MSW on the client
│
├── schemas/                           # zod schemas = single source of truth (mirrors §9/§10)
└── i18n/
    ├── config.ts
    └── locales/{en.json, ar.json}
```

**Conventions (LOCKED):** money = integer **minor units** + ISO currency code; timestamps = **ISO 8601 UTC**; ids = **ULID** strings; pagination = **cursor-based** (`{ items, nextCursor, hasMore }`); errors = **RFC 7807 problem+json**. Query keys are arrays: `['admin', '<resource>', params]`. Mutations invalidate explicit keys only, never blanket.

---

## 6. Design System — LOCKED

**Direction:** shadcn/ui on Tailwind 4 with **semantic CSS-variable tokens**, **dark-first** with a working **light** mode, carrying the existing brand: violet/purple accent on a near-black canvas. RTL-aware throughout (logical properties; `start`/`end`, never raw `left`/`right`).

**Token set (define in `globals.css` as CSS variables, both `:root` light and `.dark`):**
```
--bg            page canvas        (dark: #050508)
--bg-elevated   cards, popovers    (dark: #0d0d15)
--bg-sidebar    sidebar            (dark: #07070b)
--bg-overlay    modal scrim
--fg            primary text       (dark: #f3f4f6)
--fg-muted      secondary text     (dark: ~#9ca3af)
--fg-subtle     placeholder/disabled
--border        default border     (dark: #1f1f2e)
--border-strong focus/divider emphasis
--accent        brand              (#8b5cf6)
--accent-hover  (#7c3aed)
--accent-fg     contrast on accent (white)
--success       (#10b981)  verified, released
--warning       (#f59e0b)  pending, action-needed
--danger        (#ef4444)  banned, rejected, errors
--info          (#3b82f6)  notices
```
Map these into Tailwind 4 `@theme` so utilities like `bg-[--bg-elevated]` / semantic classes work. Cards: rounded-xl, 1px `--border`, subtle elevation. Provide a `.glow-purple` utility (soft violet box-shadow) for emphasis surfaces. Keep a thin custom scrollbar matching the dark theme.

**Typography:** Inter (Latin) + Cairo (Arabic) via `next/font/google`, plus JetBrains Mono for IDs/tokens/code. Switch body font by `dir`/locale (Cairo when `ar`).

**Channel/status color language (consistent everywhere):** verified/active = success; pending/under-review = warning; banned/suspended/rejected/blocked = danger; info/neutral = info/muted. Represent every status with a reusable `StatusPill` (`components/patterns/status-pill.tsx`) that maps each enum value → label + token color, and **never relies on color alone** (always text/icon too).

**Component standards (LOCKED):** 2px focus ring on all interactive elements; every control has a visible label or `aria-label`; destructive/high-impact actions are reversible where possible (undo via `sonner`) or gated by `ConfirmDialog`; every async action shows loading state within 100ms; every error is human-readable with a `requestId` and a retry affordance.

---

## 7. Internationalization & RTL — LOCKED

- `next-intl` with locales `en` and `ar`. All visible strings come from `i18n/locales/*.json` — **no hardcoded copy** in components.
- Locale switcher in the topbar. On `ar`: set `<html dir="rtl" lang="ar">`, swap to Cairo font, mirror layout via logical properties. On `en`: `dir="ltr"`, Inter.
- Numbers, currency, dates formatted per active locale via `lib/format.ts`.
- Translate the full feedback/report taxonomy and every enum label in both locales.
- Switching locale must cause **zero layout shift** and preserve current route + filters.

---

## 8. Simulated Auth & RBAC — LOCKED behavior

There is no real Clerk. Simulate it:

- `stores/admin-store.ts` holds the **current admin** `{ id, name, role }`. Default role `super_admin`.
- A **role switcher** in the topbar (super_admin / admin / moderator / support) lets you re-render the whole UI under a different role to verify gating. This is a dev/operator affordance — keep it but visually mark it “Simulated”.
- `middleware.ts`: simulate the admin gate — any `/admin/*` route requires an admin session (always true in mock), and conceptually blocks non-admins. Leave a clear comment showing where the real `PlatformAdmin` + `active` check goes.
- `lib/rbac.ts` exports `can(role, action)` driven by this matrix. **Hide or disable** actions the role lacks; protected pages show a “You don’t have access” state for `support`/`moderator` where noted.

**Admin permission matrix (LOCKED):**

| Capability | super_admin | admin | moderator | support |
|---|---|---|---|---|
| Companies — view | ✓ | ✓ | ✓ (read) | ✓ (read) |
| Companies — suspend/ban/verify | ✓ | ✓ | suspend/ban only | — |
| Talent — view | ✓ | ✓ | ✓ (read) | ✓ (read) |
| Talent — verify/feature | ✓ | ✓ | — | — |
| Talent — suspend/ban | ✓ | ✓ | ✓ | — |
| Moderation — decide | ✓ | ✓ | ✓ | view only |
| Verification queue — approve/reject | ✓ | ✓ | — | — |
| Subscriptions — view | ✓ | ✓ | — | ✓ (read) |
| Subscriptions — refund | ✓ | — | — | — |
| Support — reply/assign | ✓ | ✓ | — | ✓ |
| Plans / Flags — edit | ✓ | read | — | — |
| Admins — manage | ✓ | read | — | — |
| Feedback — triage/resolve/tasks | ✓ | ✓ | ✓ (triage) | view |
| Audit / Activity / AI-usage / Analytics | ✓ | ✓ | view | view |

---

## 9. Domain Model (mock data contracts)

Define these as Zod schemas in `src/schemas/` and infer TS types. Seed deterministic fixtures (fixed faker seed) covering realistic AR + EN content, every status value, and edge cases (suspended company mid-contract, banned talent, rejected KYC, p1 feedback cluster, etc.).

**Enums (LOCKED):**
```ts
CompanyStatus       = active | suspended | banned | closed
TalentStatus        = active | suspended | banned | paused
VerificationStatus  = unverified | pending | verified | rejected
AvailabilityStatus  = available | limited | unavailable
SearchVisibility    = public | hidden
EngagementType      = fixed | hourly
JobStatus           = draft | published | paused | closed | cancelled
ProposalStatus      = submitted | shortlisted | accepted | rejected | withdrawn
ContractStatus      = pending_signature | active | in_dispute | completed | cancelled
MilestoneStatus     = pending | funded | submitted | approved | released | disputed
SenderType          = company_user | talent | admin | system
ModerationStatus    = pending | approved | flagged | blocked
ReportTarget        = company | talent | message | job | profile
ReportCategory      = spam | fraud | harassment | inappropriate | ip_violation | other
ReportStatus        = open | under_review | resolved | dismissed
ModAction           = warn | suspend | ban | shadow_ban | unflag
AdminRole           = super_admin | admin | moderator | support
TicketPriority      = low | normal | high | urgent
TicketStatus        = open | in_progress | waiting_user | closed
PrincipalType       = company | talent
FeedbackSurface     = chat | match | search | enrichment | moderation_override | general
Thumbs              = up | down
FeedbackClassification = bug | improvement_idea | praise | complaint | spam | duplicate
FeedbackSeverity    = p1_critical | p2_high | p3_medium | p4_low
FeedbackArea        = prompt | retrieval | rerank | ui | content_policy | model_choice | latency | cost
FeedbackStatus      = received | triaged | in_progress | resolved | dismissed | duplicate
TaskStatus          = open | in_progress | in_review | merged | closed
TaskPriority        = p1 | p2 | p3 | p4
```

**Entities (fields the admin UI needs — money in minor units, dates ISO):**

- **Company**: `id, name, slug, legalName?, country, locale, websiteUrl?, logoUrl?, status, verificationStatus, planCode, featuredUntil?, suspendedAt?, suspendedReason?, usersCount, jobsCount, gmvCents, createdAt`.
- **Talent**: `id, handle, displayName, headline?, country, locale, avatarUrl?, hourlyRateCents?, currency, availability, yearsExperience?, status, verificationStatus, kycProvider?, payoutsEnabled, planCode, featuredUntil?, searchVisibility, suspendedAt?, suspendedReason?, skills[], rating?, contractsCount, createdAt`.
- **Job** (read-only context): `id, companyId, title, status, budgetMinCents?, budgetMaxCents?, currency, engagementType, proposalsCount, publishedAt?, createdAt`.
- **Contract** (read-only context): `id, companyId, talentId, amountCents, currency, status, platformFeeBps, createdAt`.
- **Report**: `id, reporterType, reporterId, targetType, targetCompanyId?, targetTalentId?, targetMessageId?, category, description, status, severity? (derived), decidedBy?, decidedAt?, decision?, createdAt`.
- **ModerationAction**: `id, targetType, targetId, action, reason, durationDays?, performedBy, reportId?, createdAt`.
- **VerificationItem** (queue row): `id, principalType, principalId, subjectName, kind (kyc|business), provider?, status (pending|verified|rejected), submittedAt, evidenceUrls[]`.
- **SupportTicket**: `id, openerType, openerId, openerName, subject, category, priority, status, assignedTo?, createdAt, updatedAt, messagesCount`.  **SupportMessage**: `id, ticketId, senderType, senderId, senderName, body (markdown), attachments[], createdAt`.
- **Subscription**: `id, principalType, principalId, principalName, planCode, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, mrrCents`.
- **PlanCatalog**: `code, principalType, nameEn, nameAr, monthlyCents, yearlyCents, features (string[] / json), active`.
- **FeaturedPlacement**: `id, principalType, principalId, principalName, position, startsAt, endsAt, createdBy, createdAt`.
- **FeatureFlag**: `key, description?, enabled, rules? (percentage rollout / target ids), updatedBy?, updatedAt`.
- **PlatformAdmin**: `id, clerkUserId, name, email, role, active, createdAt, createdBy?`.
- **AuditLog**: `id, actorType, actorId, actorName, action, resourceType, resourceId?, metadata (json), ipAddress?, userAgent?, createdAt`.
- **AdminActivity** (live feed item): `id, adminId, adminName, action, payload (json), createdAt`.
- **Feedback**: `id, surfaceType, surfaceId?, surfaceContext (json: aiResponse, model, promptVersion, locale), principalType?, principalId?, authorType, authorId, authorLocale?, rating?, thumbs?, reasonCode?, comment?, npsScore?, classification?, severity?, area?, status, triagedBy?, resolvedBy?, resolution?, improvementTaskId?, createdAt`.
- **FeedbackImprovementTask**: `id, title, description, area, status, priority, affectedSurfaces[], evidenceFeedbackIds[], proposedChange? (json diff), assignedTo?, prUrl?, approvedBy?, approvedAt?, closedAt?, createdAt, updatedAt`.
- **FeedbackAggregate**: `id, weekStart, surfaceType, principalType?, totalResponses, avgRating?, thumbsUp, thumbsDown, npsAvg?, npsPromoters, npsDetractors, topReasonCodes (json), topComments (json)`.
- **PlatformDailyMetrics**: `day, signupsTalent, signupsCompany, jobsPublished, proposalsSubmitted, contractsSigned, gmvCents, commissionCents, aiCostCents, activeTalent, activeCompanies`.

---

## 10. Mock API Surface (build handlers for all)

Implement MSW handlers for these endpoints (the real backend will expose the same paths). All list endpoints accept `?limit=&cursor=` plus the filters noted, return `{ items, nextCursor, hasMore }`, add ~150–400ms latency, and occasionally (behind a debug flag) return a problem+json error so error states are testable. `lib/api/admin.ts` exposes one typed function per endpoint.

```
GET   /api/v1/admin/companies               ?status=&q=&plan=&verification=
GET   /api/v1/admin/companies/:id           (company + jobs + contracts + reports + mod history)
POST  /api/v1/admin/companies/:id/suspend   { reason }
POST  /api/v1/admin/companies/:id/ban       { reason }
POST  /api/v1/admin/companies/:id/verify
GET   /api/v1/admin/talent                  ?status=&q=&country=&verification=&availability=
GET   /api/v1/admin/talent/:id              (talent + skills + proposals + contracts + reviews + mod history)
POST  /api/v1/admin/talent/:id/verify
POST  /api/v1/admin/talent/:id/feature      { durationDays }
POST  /api/v1/admin/talent/:id/suspend      { reason }
POST  /api/v1/admin/talent/:id/ban          { reason }
GET   /api/v1/admin/moderation/reports      ?status=&category=&target=
GET   /api/v1/admin/moderation/:id          (report + full target context + prior actions + related thread)
POST  /api/v1/admin/moderation/:id/decide   { action, reason, durationDays? }
GET   /api/v1/admin/verification-queue      ?kind=&status=
POST  /api/v1/admin/verification-queue/:id/approve
POST  /api/v1/admin/verification-queue/:id/reject  { reason }
GET   /api/v1/admin/subscriptions           ?plan=&status=&principalType=
POST  /api/v1/admin/subscriptions/:id/refund { amountCents, reason }
GET   /api/v1/admin/support/tickets         ?status=&priority=&assignedTo=
GET   /api/v1/admin/support/tickets/:id     (ticket + messages)
POST  /api/v1/admin/support/tickets/:id/assign { adminId }
POST  /api/v1/admin/support/tickets/:id/reply  { body }
GET   /api/v1/admin/ai-usage                ?from=&to=&principalId=   (tokens, cost, by-model, feedback rollups)
GET   /api/v1/admin/feedback                ?surface=&status=&severity=&area=&since=
GET   /api/v1/admin/feedback/:id
POST  /api/v1/admin/feedback/:id/classify   { classification, severity, area, reasonCode }
POST  /api/v1/admin/feedback/:id/resolve    { resolution, status }
POST  /api/v1/admin/feedback/:id/create-task { area, priority, title, description }
POST  /api/v1/admin/feedback/:id/dismiss    { reason }
GET   /api/v1/admin/feedback/tasks          ?status=&priority=&area=
GET   /api/v1/admin/feedback/tasks/:id
PATCH /api/v1/admin/feedback/tasks/:id      { status, assignee, priority }
POST  /api/v1/admin/feedback/tasks/:id/approve   (adds golden-set case + opens prompt PR — mock: sets prUrl)
POST  /api/v1/admin/feedback/tasks/:id/close     { reason, prUrl }
GET   /api/v1/admin/feedback/aggregates     ?surface=&principalType=&weeks=
GET   /api/v1/admin/feedback/export         (CSV/JSON download, audit-logged)
GET   /api/v1/admin/flags
PATCH /api/v1/admin/flags/:key              { enabled, rules? }
GET   /api/v1/admin/plans
PATCH /api/v1/admin/plans/:code             { ...fields }
GET   /api/v1/admin/admins
POST  /api/v1/admin/admins                  { email, role }
DELETE /api/v1/admin/admins/:id
GET   /api/v1/admin/audit-log               ?actorId=&action=&resourceType=&from=&to=
GET   /api/v1/admin/activity                (SSE-style live stream — mock with interval/EventSource shim)
GET   /api/v1/admin/analytics/platform      ?from=&to=   (PlatformDailyMetrics series)
```

`fetcher.ts` must: attach a stubbed `Authorization: Bearer <mock>` header and a `X-Request-Id` (ULID); parse problem+json into a typed `AppError` carrying `code`, `detail`, `requestId`, `meta`; on 401 attempt one silent “refresh” then surface error. This is the single seam the real backend later plugs into.

---

## 11. Admin Pages — detailed specs

For every page implement: header (title + bilingual subtitle), `FilterBar` where listed, `DataTable` or detail layout, the actions (gated by §8), realtime where noted, and **all three states** (loading skeleton ≤100ms, empty state with the exact copy where given, error card with retry + requestId). High-impact actions (suspend/ban/refund/verify reject/admin removal/plan & flag edits) use `ConfirmDialog` and are **never optimistic**. Low-risk list interactions (hide feedback row, dismiss as duplicate) use optimistic update + 10s undo toast.

### 11.0 Sidebar grouping (LOCKED)
Grouped, collapsible sidebar:
- **People** → Companies, Talent, Admins
- **Trust** → Moderation (Queue + Reports), Verification, (Reports surfaced under Moderation)
- **Platform** → Subscriptions, Featured, Plans, Flags
- **Insights** → Analytics, AI Usage, Feedback, Audit, Activity
- **Support** → Tickets

Topbar: breadcrumbs, global search/Cmd-K trigger, locale switcher, theme toggle, simulated role switcher, current-admin menu. A connection pill shows simulated realtime status (Connected / Reconnecting).

### 11.1 `/admin/dashboard` — Overview
Operator home. KPI `MetricCard` row (active companies, active talent, GMV this month, commission, contracts signed, open reports, open tickets, p1 feedback open) with period deltas. Two charts (lazy Recharts): signups (talent vs company) over time; GMV/commission trend. A compact **live activity** strip (latest admin actions) and a “Needs attention” panel linking to open reports, pending verifications, urgent tickets, and p1 feedback.

### 11.2 `/admin/companies` + `/companies/[id]`
List: `DataTable` columns — logo+name, country, plan, status `StatusPill`, verification, users, jobs, GMV, created. Filters: status, plan, verification, search (name/slug). Row → detail.
Detail: header with status/verification + action menu (Verify, Suspend, Ban — gated; each opens `ConfirmDialog` requiring a reason; ban/suspend not optimistic). Tabs: Overview (profile, plan, usage), Jobs, Contracts, Reports against this company, Moderation history, Audit (actions on this company). Show suspended/banned banner with reason when applicable.

### 11.3 `/admin/talent` + `/talent/[id]`
List: avatar+name+handle, country, headline, hourly rate (formatted), availability pill, verification, status, rating, contracts, featured badge if `featuredUntil` future. Filters: status, country, verification, availability, search.
Detail: header + actions (Verify, Feature [duration picker], Suspend, Ban — gated/confirmed). Tabs: Profile (skills, languages, experience, payouts/KYC state), Proposals, Contracts, Reviews, Reports, Moderation history, Audit. Mark AI-enriched fields with an “AI-suggested” affordance for context.

### 11.4 `/admin/moderation/queue`, `/reports`, `/[id]`
Queue: high-severity first (auto-triage severity badge), live-updating via mock realtime; columns — target (type+name), category, severity, reporter, age, status. Reports: same data, full filterable history (status, category, target). Empty state copy: **“All clear. No open reports.”**
Detail `/[id]`: full context panel — reported target’s history, prior `ModerationAction`s, and the related message thread/job/profile. Decision bar: **warn / suspend / ban / shadow_ban / unflag** with reason (+ durationDays for suspend) → `ConfirmDialog`, not optimistic; on decide, write an audit entry (mock), push an activity event, and close the report. `moderator` can decide; `support` is view-only.

### 11.5 `/admin/verification-queue`
Rows: subject (company/talent), kind (KYC vs business), provider, submitted age, evidence preview. Actions: Approve / Reject(reason) — gated to super_admin/admin, confirmed. Tabs or filter by kind & status.

### 11.6 `/admin/featured`
Table of active + scheduled `FeaturedPlacement`s (principal, position, window, createdBy). “Add Placement” dialog: pick principal (company/talent search-select), position, duration → creates placement. Allow Extend / Cancel. Show auto-expiry clearly.

### 11.7 `/admin/subscriptions`
Table: principal (type+name), plan, status, period, MRR, cancelAtPeriodEnd. Filters: plan, status, principal type. Row action **Refund** (amount + reason) — **super_admin only**, confirmed, not optimistic. Summary cards: total MRR, active subs by plan.

### 11.8 `/admin/support` + `/support/[ticketId]`
List: subject, opener, category, priority pill, status, assignee, updated age. Filters: status, priority, assignee. Empty: **“No open tickets.”**
Ticket: left = metadata + assign control (assign to admin) + status changer; right = threaded conversation (markdown via react-markdown + rehype-sanitize) with a reply composer (Server Action or mutation). `support` and `admin` can reply/assign.

### 11.9 `/admin/ai-usage`
Cost & usage analytics: tokens in/out and AI cost over time (lazy charts), by model, by pipeline (match/search/chat/enrichment/moderation), top principals by spend. Surface **weekly feedback aggregates** here too (NPS, thumbs ratio, top reason codes, clustered comment themes) per the spec. Date-range picker (`from`/`to`).

### 11.10 `/admin/feedback`, `/feedback/[id]`, `/feedback/tasks`, `/feedback/tasks/[id]`
Queue: filters — surface, severity, status, area; live-updating (`feedback.classified` mock events). Columns — surface, snippet/comment, classification, severity, area, status, age. Negative-but-low-risk triage (dismiss as spam/duplicate) optimistic with undo.
Detail `/[id]`: context panel showing AI snapshot (`surfaceContext`: model, promptVersion, locale, the AI response), the author’s rating/thumbs/comment, and the related feedback cluster. Actions: Reclassify (`classification/severity/area/reasonCode` form), Resolve with note, Dismiss (reason), **Create Improvement Task** (area, priority, title, description).
Tasks `/tasks`: improvement-task board/table by status (open → in_progress → in_review → merged → closed), priority, area, assignee, prUrl. Task `/tasks/[id]`: edit status/assignee/priority; **Approve** (mock: marks it as adding a golden-set case + sets a draft `prUrl`); **Close** (reason, prUrl). Show linked evidence feedback.

### 11.11 `/admin/audit-log`
Dense, filterable, virtualized table: actor (type+name), action, resourceType/resourceId, IP/agent, timestamp; `metadata` opens a `JsonViewer`. Filters: actor, action, resourceType, date range. Read-only.

### 11.12 `/admin/activity`
Real-time platform activity feed (simulated SSE / `presence-admin-activity`). New events animate in at top with `aria-live="polite"`. Connection status pill; pause/resume; filter by action type. Reuse the dashboard activity component.

### 11.13 `/admin/analytics`
Platform growth analytics from `PlatformDailyMetrics`: signups, jobs published, proposals, contracts, GMV, commission, active talent/companies, AI cost — multi-series lazy charts with a date-range picker and CSV export. Summary cards with deltas.

### 11.14 `/admin/settings/flags`, `/plans`, `/admins`
- **Flags:** list `FeatureFlag`s with enable toggle + rules (percentage rollout / target ids) editor (RHF + Zod). super_admin edits; admin read-only.
- **Plans:** editable `PlanCatalog` per plan code (names AR/EN, monthly/yearly price, features, active). super_admin edits. Validate money inputs (minor units).
- **Admins:** `PlatformAdmin` table with role; Invite admin (email + role), change role, deactivate/remove (confirmed). super_admin only; never allow removing the last super_admin (block with a clear message).

---

## 12. Cross-cutting Patterns (build once, reuse)

- **`DataTable`** (`components/patterns/data-table.tsx`): column defs, server-style cursor pagination, URL-synced sort/filter/page via `nuqs`, row click, bulk-select scaffold, sticky header, density-friendly, virtualization for large sets (audit log), RTL-correct.
- **`FilterBar`**: composable selects/search bound to URL state (`nuqs`); debounced text search.
- **`StatusPill`**, **`MetricCard`**, **`EmptyState`** (icon + copy + optional CTA), **`ConfirmDialog`** (title, body, destructive variant, reason field option), **`UsageMeter`**, **`PageHeader`** (title + subtitle + actions + breadcrumbs slot), **`AdminActionMenu`** (RBAC-aware dropdown), **`JsonViewer`** (collapsible, for metadata/payloads).
- **Error boundaries:** an `error.tsx` per route segment + a global fallback that shows the `requestId` and a retry; wrap charts, live feeds, and any risky island in a feature-level boundary.
- **Toasts:** `sonner` for success/undo; undo toasts persist 10s for reversible actions.
- **Optimistic policy (LOCKED):** optimistic = hide/dismiss feedback row, low-risk list toggles. **Never optimistic** = suspend/ban, refund, verification reject, admin removal, plan/flag edits, moderation decisions — these require server confirmation before UI changes.

---

## 13. Realtime (simulated)

`providers/pusher-provider.tsx` is a **mock**: on an interval it emits fake `presence-admin-activity` events (new report created, feedback classified, moderation decided, verification submitted) into `admin-store`. Components subscribe via a small `useAdminActivityStream` hook. The activity page and dashboard strip render these. Also implement an EventSource-style shim for `/api/v1/admin/activity` so the SSE seam exists. Show a connection-status pill (Connected / Reconnecting) and, when “disconnected,” fall back to TanStack `refetchInterval: 10000` on the live queries. Leave clear comments where real `pusher-js` would attach.

---

## 14. Performance, Security, Accessibility, Responsive — LOCKED

**Performance:** lazy-load Recharts and the markdown renderer with `dynamic(..., { ssr: false })`; per-route + per-feature code splitting; per-icon `lucide-react` imports; `next/image` for avatars/logos; keep admin initial JS lean (aim well under the 220 KB gzipped dashboard budget); skeletons within 100ms on every async view.

**Security:** all `/admin/*` conceptually behind the admin gate (middleware comment marks the real check); no `localStorage` for anything sensitive; render all user/markdown content through `rehype-sanitize` (no `dangerouslySetInnerHTML` on user content); add baseline security headers in `next.config.ts` (`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`) and a CSP comment block matching the locked policy; never log the (mock) token.

**Accessibility (WCAG 2.1 AA):** full keyboard support (Tab order, Esc closes modals/sheets, Enter submits, Cmd-K palette); `aria-live` on the activity feed and any streaming region; visible focus ring; color never the sole signal; respect `prefers-reduced-motion`; correct RTL semantics.

**Responsive:** breakpoints sm640/md768/lg1024/xl1280/2xl1536. `< md`: collapsible/hamburger sidebar (sheet), single-column, tables become stacked cards or horizontally scrollable with sticky first column; primary actions in a bottom action sheet. Admin is **desktop-first**; on mobile, default to read-only views with confirmation flows for actions.

---

## 15. Definition of Done (acceptance checklist)

Build is complete when all are true:
1. App boots on Replit; `/` → `/admin/dashboard`; every route in §11 renders with seeded data.
2. Every list page: working cursor pagination, URL-synced filters/sort, loading skeletons, the specified empty state, and a retry-able error state.
3. RBAC: switching role re-gates the entire UI per the §8 matrix (actions hidden/disabled; restricted pages blocked).
4. AR ↔ EN switch flips to full RTL with Cairo, zero layout shift, preserves route+filters; no hardcoded strings.
5. Dark + light themes both correct using the token set; brand purple accent present; `StatusPill` consistent everywhere.
6. High-impact actions go through `ConfirmDialog` and are not optimistic; reversible list actions show a 10s undo toast.
7. Moderation decision, feedback triage→task→approve, verification approve/reject, support reply/assign, featured create/extend, plan/flag/admin edits all function end-to-end against the mock API and write a (mock) audit entry + activity event where applicable.
8. Live activity feed + dashboard strip update from the mock realtime provider; connection pill reflects state; polling fallback wired.
9. Charts lazy-load; no console errors; TypeScript strict passes (`pnpm typecheck`), ESLint passes, `pnpm build` succeeds.
10. Keyboard-only operable; Cmd-K palette navigates to ≥20 admin destinations/actions; axe shows no critical violations on dashboard, a list page, a detail page, and the support thread.

---

## 16. Build Order (proceed in this sequence)

1. **Foundation:** project init, Tailwind 4 tokens + theme, shadcn primitives, fonts, i18n (en/ar) + RTL, providers (Query, Theme, Locale, Mocks, mock Pusher), MSW skeleton, `fetcher.ts` + `lib/api/types.ts`, `rbac.ts`, `format.ts`.
2. **Shell:** `(admin)/layout.tsx` with grouped sidebar, topbar (locale/theme/role switchers, connection pill), breadcrumbs, Cmd-K palette; shared patterns (`DataTable`, `FilterBar`, `StatusPill`, `MetricCard`, `EmptyState`, `ConfirmDialog`, `PageHeader`, `AdminActionMenu`, `JsonViewer`).
3. **Schemas + seed + handlers:** all Zod schemas (§9), deterministic fixtures, MSW handlers + typed `admin.ts` client for every endpoint (§10).
4. **People:** Companies (list+detail), Talent (list+detail), Admins settings.
5. **Trust:** Moderation (queue/reports/detail), Verification queue.
6. **Platform:** Subscriptions, Featured, Plans, Flags.
7. **Insights & quality:** Dashboard, Analytics, AI Usage, Feedback (queue/detail/tasks), Audit, Activity (realtime).
8. **Support:** Tickets list + thread.
9. **Polish pass:** empty/error/loading states, a11y, RTL audit, responsive, performance, DoD checklist (§15).

Begin now with step 1. Keep components small and typed; route everything through the mock API/query layer so the real backend swaps in cleanly later.
