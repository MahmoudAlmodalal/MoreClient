# More Client — Fullstack Plan (Locked Architecture · Replit Production)

**Owner:** Frontend Architecture + Product · **Status:** CTO-approved blueprint · **Revision:** 2.0 · **Date:** 2026-05-23

> All technology choices, versions, and infrastructure decisions in this document are **locked**. No optionality. Changes require an architecture-review PR.

---

## 1. Product Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│            Cloudflare (DNS, WAF, CDN, Turnstile)                 │
└──────────┬──────────────────────────────────┬────────────────────┘
           │                                  │
           ▼                                  ▼
   ┌─────────────────────────────────┐     ┌─────────────────────┐
   │ Replit Reserved VM Deployment   │     │ Replit Preview      │
   │ Next.js 16.2.6 (single app)     │     │ (per-PR auto deploy)│
   │  - marketing / dashboards       │     └─────────────────────┘
   │  - talent + company + admin     │
   │  - public profiles              │
   │  - /api/v1/* route handlers     │
   │  - SSE for AI streaming         │
   │  - Inngest HTTP handler         │
   └─────────────────┬───────────────┘
                     │
   ┌─────────────────┴───────────────────────────────────────────┐
   │                                                              │
   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼     ▼
Clerk  Neon  Upstash Pinecone Cloudflare Stripe Pusher Resend Persona Inngest Sentry Axiom PostHog OpenAI Cohere Anthropic
 Auth  PG16  Redis            R2                Channels                                                                  (fallback)
```

### Subdomains — locked
| Subdomain | Purpose | Hosting |
|---|---|---|
| `moreclient.com` | Marketing + public site | Replit (edge cached) |
| `app.moreclient.com` | Authenticated app (talent + company dashboards) | Replit |
| `admin.moreclient.com` | Admin control plane | Replit (same app, middleware-gated) |
| `api.moreclient.com` | REST + webhooks | Replit (same app) |
| `cdn.moreclient.com` | Static assets (`embed/widget.js`, OG images) | Cloudflare cached |

All five subdomains point to the same Replit Reserved VM Deployment; Cloudflare routes based on host + path.

### Product surfaces
| Surface | Audience |
|---|---|
| Marketing site | Visitors |
| Talent dashboard | Talent (individual professionals) |
| Company dashboard | Company users (recruiters, admins, owners) |
| Admin dashboard | Platform admins |
| Public talent profile | Anyone with link |
| Public job listing | Anyone with link |

---

## 2. User Flows

### 2.1 Talent signup & onboarding
```
Landing → "Join as Talent"
   ▼
Clerk sign-up (email / Google / Microsoft)
   ▼
Clerk webhook creates Talent row (status=active, verification=unverified)
   ▼
Onboarding wizard (4 steps, progressive):
   1. Basic info (name, country, language proficiencies)
   2. Skills + years experience (autocomplete from skill catalog)
   3. Hourly rate + availability
   4. Upload CV (optional → triggers ai.enrich-profile)
   ▼
Talent dashboard: checklist (complete profile, get verified, browse jobs)
```

### 2.2 Company signup & onboarding
```
Landing → "Hire Talent"
   ▼
Clerk sign-up (creates Clerk Org)
   ▼
Clerk webhook creates Company row + initial CompanyUser (role=owner)
   ▼
Onboarding wizard:
   1. Company info (name, country, website)
   2. Hiring need (drives AI suggested skills)
   3. Invite teammates (optional)
   ▼
Company dashboard: checklist (post first job, verify business, invite team)
```

### 2.3 Post a job (company)
```
Dashboard → Jobs → "New Job"
   ▼
Form: title + description + skills + budget + duration
   ▼
Inline AI assist: "Improve description" → Vercel AI SDK streamText
   ▼
Save draft → publish
   ▼
Server Action POST /api/v1/jobs (publish=true)
   ▼
Emit job.published → Inngest jobs.embed-posting → jobs.match-talent
   ▼
Within ~90s: Matches tab populated with top 25 talent
   ▼
SSE notification: "10 top matches ready"
```

### 2.4 Submit a proposal (talent)
```
Talent → Jobs → Browse / Matches → Open job
   ▼
"Submit Proposal" button
   ▼
Form: cover letter + bid amount + duration + attachments
   ▼
Plan check (free: 10/mo, pro: unlimited)
   ▼
Server Action POST /api/v1/proposals
   ▼
Emit proposal.submitted → ai.score → notification to company
   ▼
Realtime UI update on company inbox via Pusher
```

### 2.5 Messaging (both sides)
```
Open thread (auto-created on first proposal interest from company side)
   ▼
Subscribe Pusher private-thread-<id>
   ▼
Send message (optimistic UI)
   ▼
Server Action POST /api/v1/messaging/threads/:id/messages
   ▼
Emit message.created → moderation.scan (sync block if obviously bad)
   ▼
On moderation pass → Pusher fan-out to recipient
   ▼
Recipient sees message live with read receipts
```

### 2.6 Contract & milestones
```
Company shortlists → "Send Contract"
   ▼
Server Action creates Contract (status=pending_signature)
   ▼
Both parties sign (UI: legal-style markdown viewer + click-through)
   ▼
contract.signed event
   ▼
Company funds milestone 1 → Stripe PaymentIntent (escrow)
   ▼
Talent works → submits milestone
   ▼
Company approves → milestone.released
   ▼
Inngest billing.reconcile-commissions → Stripe Transfer to talent Connect account (after 10% platform fee)
```

### 2.7 Talent verification
```
Talent dashboard → Verification → "Get Verified"
   ▼
Persona inquiry started (Persona Embed)
   ▼
User completes ID + selfie
   ▼
Persona webhook → updates Talent.verificationStatus
   ▼
Admin verification-queue/[id] shows for manual review (optional second pass)
   ▼
Approved → badge on profile + listing boost
```

### 2.8 Admin moderation flow
```
User reports content → Report row (status=open)
   ▼
Inngest moderation.review-report auto-classifies severity
   ▼
Admin sees in /admin/moderation/queue (live via SSE)
   ▼
Click → full context (target user history, prior actions, message thread)
   ▼
Decide: warn / suspend / ban / shadow_ban / unflag
   ▼
ModerationAction row created → emit admin.action.taken
   ▼
Target user notified; audit log written; report closed
```

### 2.9 Admin: featured placement
```
Admin → /admin/featured → "Add Placement"
   ▼
Select principal (company or talent) + position + duration
   ▼
Server Action creates FeaturedPlacement
   ▼
Talent search / company directory shows featured items in top slots
   ▼
Auto-expires; admin can extend or cancel
```

### 2.10 Error flows
| Flow | Trigger | UI |
|---|---|---|
| Upload unsupported file | Client validation | Inline error before upload |
| Plan quota exceeded | Server 429 + problem+json `quota-exceeded` | Modal with usage stats + upgrade CTA |
| LLM down | Server 503 | Banner: "AI assist temporarily degraded" |
| Auth expired | 401 | Clerk silent refresh → retry; on fail, redirect to sign-in |
| Pusher disconnect | onclose | Reconnect with backoff; banner "Reconnecting…" |
| Offline | navigator.onLine | Banner; queue Server Actions; replay on reconnect |
| Stripe Connect not onboarded | Server 400 `connect-required` | Redirect to onboarding flow |
| KYC not complete (contract sign) | Server 403 `kyc-required` | Redirect to verification |
| Moderation block | Server 422 `content-blocked` | Inline error + reason snippet |

### 2.11 Empty states
| Page | Copy |
|---|---|
| Talent dashboard, no proposals | "Browse jobs or wait to be matched." |
| Company dashboard, no jobs | "Post your first job. Talent gets matched within minutes." |
| Matches tab (job, no matches yet) | "Matching in progress. Top talent appears within 90 seconds." |
| Talent search (no filters) | "Search by skill, country, language, hourly rate." |
| Inbox (no threads) | "Conversations appear when you connect with a counterparty." |
| Admin moderation queue | "All clear. No open reports." |
| Admin support tickets | "No open tickets." |

### 2.12 Feedback loop (end-user + company)

#### End-user feedback on AI chat
```
User and bot exchange messages
   ▼
Every AI bubble renders inline thumbs ↑ / ↓
   ▼
On ↓ click → reason picker (Wrong answer · Missing context · Off-topic · Tone · Latency · Other)
   ▼
Optional free-text comment (max 500 chars)
   ▼
Server Action POST /api/v1/feedback (surfaceType=chat)
   ▼
Optimistic UI: "Thanks — we'll review."
   ▼
Inngest feedback.classify runs; if p1, admin gets Slack ping; user is unaware
   ▼
On conversation end (5min idle OR user closes chat panel):
   Post-conversation card:
     "How was this conversation?" → 1..5 stars + 0..10 NPS + optional comment
   ▼
POST /api/v1/feedback/nps (one per session, enforced server-side)
```

#### Company feedback (per AI feature)
```
Company opens /jobs/:id/matches
   ▼
Each match row has [👍 / 👎 / Hide] affordances + reason picker on negative
   ▼
POST /api/v1/feedback/match → creates Feedback + RerankSignal rows
   ▼
Hiding a match removes it from list with undo toast
   ▼
Same pattern on /talent-search (search results) and on AI-suggested job description edits
   ▼
Weekly digest banner in company dashboard (Monday):
     "Rate your AI experience this week" → in-app survey card (NPS + 1 question)
   ▼
Talent surface: same pattern on AI-enriched profile fields and AI-drafted proposals
```

#### Admin feedback workflow
```
Inbound Feedback → auto-classified by feedback.classify
   ▼
/admin/feedback shows queue (filters: surface, severity, status, area)
   ▼
Click row → context panel: AI snapshot, model, prompt_version, locale, related feedback cluster
   ▼
Admin actions: reclassify · resolve with note · dismiss as spam/duplicate · create improvement task
   ▼
Improvement task → assigns area (prompt | retrieval | rerank | ui | content_policy)
   ▼
Approve task → backend opens draft PR with proposed prompt edit (gpt-4o)
                + adds failing case to golden eval set
   ▼
PR runs CI eval → mergeable only if no regression
   ▼
On merge: feedback marked resolved with PR link in resolution
```

### 2.13 Edge cases
- Talent and company are the same user → single Clerk account can hold both principals; UI surfaces a "principal switcher"
- Company suspended mid-contract → contract continues; company cannot post new jobs; existing milestones can still release
- Talent banned mid-contract → contract enters dispute; admin arbitrates manually
- Job with zero proposals after 14 days → suggested edits via AI assist + reminder email
- Duplicate proposal from same talent on same job → server returns existing proposal id, UI flashes "Already submitted"
- Pusher channel auth fails → fallback to polling every 10s
- KYC fails (Persona declined) → admin manual override or appeal flow

---

## 3. Frontend Architecture

### Framework — **Next.js 16.2.6** (locked)
- App Router only
- React 19.2.4
- TypeScript 5.9.3 strict + `verbatimModuleSyntax: true`
- Turbopack dev (default)

### Rendering strategy — locked per route group
| Route group | Strategy | Runtime |
|---|---|---|
| `(marketing)` | SSG + ISR (revalidate 3600s) | Node |
| `(auth)` | SSR | Node |
| `(talent)`, `(company)` | RSC shell + client islands | Node |
| `(admin)` | RSC shell + client islands | Node |
| `(public)` (e.g. `/t/[handle]`) | ISR (revalidate 300s), edge-cached at Cloudflare | Edge |
| `/api/v1/ai/chat` | SSE streaming | Node |
| `/api/v1/admin/activity` | SSE streaming | Node |
| `/api/v1/*` (reads) | Node | Node |
| `/api/v1/*` (writes) | Node | Node |
| `/api/webhooks/*` | Node | Node |

### Component architecture — locked
- **Primitives** (`src/components/ui/*`) — shadcn/ui generated from the **2024-11 register** (Tailwind 4 compatible)
- **Patterns** (`src/components/patterns/*`) — DataTable, EmptyState, ErrorBoundary, ConfirmDialog, UsageMeter, PrincipalSwitcher
- **Features** (`src/features/<domain>/components/*`) — domain-bound (TalentCard, JobCard, ProposalCard, AdminUserRow, ModerationActionMenu)
- **Layouts** (`src/app/(...)/layout.tsx`) — server components

### State management — locked
| State type | Library / Version | Examples |
|---|---|---|
| Server state | `@tanstack/react-query 5.62.x` | jobs list, talent list, analytics |
| Realtime state | Pusher hooks + Zustand 4.5.x | live messaging, admin activity |
| Global client state | `zustand 4.5.x` | sidebar, command palette, theme, current principal |
| Form state | `react-hook-form 7.54.x` + `@hookform/resolvers/zod 3.10.x` | all forms |
| URL state | `next/navigation` + `nuqs 2.2.x` | filters, search params, pagination cursors |
| Auth state | `@clerk/nextjs 6.12.x` hooks | `useUser`, `useOrganization` |

### API layer — locked
- `src/lib/api/` typed clients written by hand (no codegen); Zod schemas in `src/schemas/` are the single source of truth
- One file per resource: `talent.ts`, `companies.ts`, `jobs.ts`, `proposals.ts`, `contracts.ts`, `messaging.ts`, `admin.ts`
- All client calls go through `src/lib/api/fetcher.ts`:
  - Injects Clerk JWT via `await getToken()`
  - Adds `X-Request-Id` (ULID via `ulid 3.x`)
  - On 401 → `clerk.session.refresh()` → retry once → redirect on second 401
  - Maps problem+json → typed errors

### Caching — locked
- TanStack Query: `staleTime: 30_000`, `gcTime: 300_000`, `retry: 3`, `refetchOnWindowFocus: false`
- Next.js `fetch` cache: `cache: 'no-store'` for authenticated reads; `next: { revalidate: 300 }` for public profile pages
- Cloudflare cache: marketing + public profile pages + `embed/widget.js`
- Semantic AI cache: Upstash, key = sha256(query + filter), TTL 1h

### Forms — locked
- `react-hook-form` + Zod
- One hook per form (`use<Domain>Form`)
- Server Actions for in-dashboard submissions; REST + TanStack mutation for cross-app (e.g. mobile)
- Server errors map back to field-level errors via `error.meta.fields`

### Validation — locked
- Client: Zod (immediate feedback)
- Server: same Zod schema re-imported (single source of truth)

### Error boundaries — locked
- Per-route boundary (`error.tsx` in every route group)
- Per-feature boundary on risky components (AI streaming, charts, file upload)
- Global fallback → Sentry capture + card with `requestId`

### Realtime — locked
- **Pusher Channels** (client SDK `pusher-js 8.4.x`)
- One connection per browser tab, shared across components via `src/providers/pusher-provider.tsx`
- Channels:
  - `private-user-<clerkUserId>` — user-targeted events (notifications, account changes)
  - `private-thread-<threadId>` — messaging
  - `presence-admin-activity` — admin live activity (admin role only)
- Authentication via `POST /api/v1/realtime/auth`
- Reconnect: Pusher SDK handles automatically with backoff
- Polling fallback: TanStack `refetchInterval: 10_000` when Pusher reports `disconnected` state

---

## 4. Frontend Folder Structure

```
src/
├── middleware.ts                    # Clerk + locale + admin gate
│
├── app/                             # (see backend-plan.md §4 for full tree)
│
├── components/
│   ├── ui/                          # shadcn-generated primitives
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx
│   │   └── …
│   ├── patterns/
│   │   ├── data-table.tsx
│   │   ├── empty-state.tsx
│   │   ├── error-boundary.tsx
│   │   ├── confirm-dialog.tsx
│   │   ├── usage-meter.tsx
│   │   ├── principal-switcher.tsx
│   │   ├── admin-action-menu.tsx
│   │   └── status-pill.tsx
│   └── layout/
│       ├── talent-sidebar.tsx
│       ├── company-sidebar.tsx
│       ├── admin-sidebar.tsx
│       ├── topbar.tsx
│       └── command-palette.tsx
│
├── features/
│   ├── talent/
│   │   ├── components/
│   │   │   ├── profile-form.tsx
│   │   │   ├── skill-picker.tsx
│   │   │   ├── portfolio-grid.tsx
│   │   │   ├── verification-banner.tsx
│   │   │   └── talent-card.tsx
│   │   ├── hooks/
│   │   │   ├── use-talent-profile.ts
│   │   │   └── use-portfolio.ts
│   │   └── lib/
│   ├── company/
│   │   ├── components/
│   │   │   ├── company-profile-form.tsx
│   │   │   ├── team-table.tsx
│   │   │   └── company-card.tsx
│   │   └── hooks/
│   ├── jobs/
│   │   ├── components/
│   │   │   ├── job-form.tsx
│   │   │   ├── job-card.tsx
│   │   │   ├── ai-description-assist.tsx
│   │   │   └── match-list.tsx
│   │   └── hooks/
│   ├── proposals/
│   │   ├── components/
│   │   │   ├── proposal-form.tsx
│   │   │   ├── proposal-card.tsx
│   │   │   └── proposal-status-pill.tsx
│   │   └── hooks/
│   ├── contracts/
│   │   ├── components/
│   │   │   ├── contract-viewer.tsx
│   │   │   ├── milestone-list.tsx
│   │   │   ├── milestone-fund-button.tsx
│   │   │   └── signature-block.tsx
│   │   └── hooks/
│   ├── messaging/
│   │   ├── components/
│   │   │   ├── thread-list.tsx
│   │   │   ├── thread-window.tsx
│   │   │   ├── message-bubble.tsx
│   │   │   ├── composer.tsx
│   │   │   └── moderation-notice.tsx
│   │   └── hooks/
│   │       ├── use-thread.ts
│   │       └── use-pusher-thread.ts
│   ├── reviews/
│   ├── ai/
│   │   ├── components/
│   │   │   ├── ai-chat-panel.tsx
│   │   │   ├── ai-match-list.tsx
│   │   │   └── ai-search-bar.tsx
│   │   └── hooks/
│   │       ├── use-ai-chat-stream.ts
│   │       └── use-ai-match.ts
│   ├── billing/
│   ├── verification/
│   ├── moderation/
│   │   ├── components/
│   │   │   ├── report-form.tsx
│   │   │   └── report-button.tsx
│   │   └── hooks/
│   ├── feedback/
│   │   ├── components/
│   │   │   ├── thumbs-feedback.tsx           # inline ↑/↓ on AI bubble
│   │   │   ├── reason-picker-modal.tsx       # taxonomy + free text
│   │   │   ├── post-conversation-card.tsx    # NPS + stars + comment
│   │   │   ├── match-feedback-row.tsx        # 👍/👎/Hide on /matches
│   │   │   ├── search-feedback-row.tsx       # 👍/👎 on talent search
│   │   │   ├── enrichment-feedback-field.tsx # correct AI field
│   │   │   ├── weekly-survey-banner.tsx      # dashboard NPS banner
│   │   │   └── feedback-success-toast.tsx
│   │   ├── hooks/
│   │   │   ├── use-submit-feedback.ts
│   │   │   ├── use-nps-trigger.ts            # idle 5min OR panel close
│   │   │   └── use-feedback-throttle.ts      # prevent spam per session
│   │   └── lib/
│   │       └── reason-codes.ts               # shared taxonomy
│   ├── admin/
│   │   ├── components/
│   │   │   ├── companies-table.tsx
│   │   │   ├── talent-table.tsx
│   │   │   ├── moderation-queue.tsx
│   │   │   ├── verification-queue.tsx
│   │   │   ├── featured-placements-table.tsx
│   │   │   ├── subscriptions-table.tsx
│   │   │   ├── support-ticket-list.tsx
│   │   │   ├── support-ticket-thread.tsx
│   │   │   ├── ai-usage-chart.tsx
│   │   │   ├── audit-log-table.tsx
│   │   │   ├── feedback-queue.tsx
│   │   │   ├── feedback-detail-panel.tsx
│   │   │   ├── feedback-classification-form.tsx
│   │   │   ├── feedback-improvement-tasks.tsx
│   │   │   ├── feedback-aggregates-chart.tsx
│   │   │   ├── feedback-export-button.tsx
│   │   │   ├── activity-feed.tsx
│   │   │   ├── flags-editor.tsx
│   │   │   ├── plans-editor.tsx
│   │   │   └── admins-table.tsx
│   │   └── hooks/
│   │       ├── use-admin-companies.ts
│   │       ├── use-admin-talent.ts
│   │       ├── use-moderation-queue.ts
│   │       └── use-admin-activity-stream.ts
│   └── settings/
│
├── lib/
│   ├── api/
│   │   ├── fetcher.ts
│   │   ├── talent.ts
│   │   ├── companies.ts
│   │   ├── jobs.ts
│   │   ├── proposals.ts
│   │   ├── contracts.ts
│   │   ├── messaging.ts
│   │   ├── reviews.ts
│   │   ├── ai.ts
│   │   ├── billing.ts
│   │   ├── moderation.ts
│   │   ├── feedback.ts
│   │   ├── admin.ts
│   │   └── types.ts
│   ├── auth.ts                      # Clerk hooks wrappers
│   ├── principal.ts                 # client-side principal resolver
│   ├── format.ts                    # dates, money, numbers per locale
│   ├── analytics.ts                 # PostHog wrapper
│   ├── flags.ts                     # PostHog feature flags
│   ├── locale.ts                    # next-intl helpers
│   ├── pusher.ts                    # Pusher client setup
│   └── utils.ts
│
├── stores/
│   ├── ui-store.ts                  # zustand
│   ├── messaging-store.ts
│   ├── principal-store.ts           # selected principal (when both)
│   └── admin-store.ts
│
├── providers/
│   ├── query-provider.tsx
│   ├── theme-provider.tsx
│   ├── pusher-provider.tsx
│   ├── principal-provider.tsx
│   └── locale-provider.tsx
│
├── hooks/
│   ├── use-principal.ts
│   ├── use-sse.ts
│   ├── use-pusher.ts
│   ├── use-debounce.ts
│   └── use-media-query.ts
│
├── i18n/
│   ├── config.ts                    # next-intl 3.x
│   ├── routing.ts
│   └── locales/
│       ├── en.json
│       └── ar.json
│
├── schemas/                         # shared with backend
│
└── styles/
    └── tokens.css
```

---

## 5. Design System Plan

### Typography — locked
| Use | English | Arabic |
|---|---|---|
| Display | Inter 700 | Cairo 700 |
| Body | Inter 400/500 | Cairo 400/500 |
| Mono | JetBrains Mono | JetBrains Mono |

Loaded via `next/font/google` with subsetting (Arabic + Latin only). Variable fonts where available.

### Spacing — Tailwind 4 default scale, 4px base.

### Color system — semantic tokens (locked)
```
--bg            background base
--bg-elevated   cards, popovers
--bg-overlay    modal scrim
--fg            primary text
--fg-muted      secondary text
--fg-subtle     placeholder, disabled
--border        default border
--border-strong focus, divider emphasis
--accent        primary brand
--accent-fg     contrast on accent
--success       verified, milestone-released
--warning       pending, action-needed
--danger        errors, banned, rejected
--info          notices
```
Dark and light variants. RTL-aware (logical properties, `start`/`end` over `left`/`right`).

### Component standards — locked
- All interactive elements: focus ring 2px
- All form controls: visible label or `aria-label`
- All actions: idempotent + reversible where possible (undo toast `sonner 1.7.x`)
- All async actions: loading state within 100ms
- All errors: human-readable + `requestId` + retry CTA

### Accessibility — locked
- WCAG 2.1 AA baseline
- Keyboard: Tab order tested, Esc closes modals, Enter submits forms
- Screen reader: `aria-live` for chat stream, admin activity feed, real-time messaging
- Reduced motion respected (`prefers-reduced-motion`)
- Colour never the only signal
- RTL via Tailwind 4 RTL utilities + logical properties

### Responsive — locked
Breakpoints: `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`.

- `< md`: hamburger sidebar, single-column dashboards, bottom action sheet for primary CTAs
- `md+`: persistent sidebar, multi-column
- Marketing: mobile-first, hero image swaps to vertical crop < md

---

## 6. UX Engineering Review

### Friction points — locked mitigations
| Friction | Mitigation |
|---|---|
| Empty marketplace on day 1 | Seeded sample jobs + sample talent (clearly marked "Demo") |
| Talent doesn't know what to fill in profile | AI enrichment after CV upload pre-fills 70% |
| Company writes weak job descriptions | "Improve description" AI button on job form |
| Proposal cover-letter blank-page | "Draft from my profile + this job" AI assist |
| Verification feels invasive | Verification is opt-in for talent; required only for payouts/contracts |
| Long admin queues overwhelm moderators | Inngest auto-triage assigns severity; high-severity surfaces first |
| Users abandon when AI gets it wrong silently | Inline ↑/↓ + reason picker on every AI message; post-conversation NPS card |
| Companies don't trust AI matches | Per-match 👍/👎/Hide affordances; aggregated signal feeds re-rank |
| Talent confused by AI-enriched profile fields | Per-field correction affordance; ai-edited fields visually marked |
| Feedback noise / spam | Per-session throttling; dedupe by semantic hash; spam classification |
| Feedback loops feel one-way ("did anyone read this?") | When admin resolves with PR link, user gets notification: "We acted on your feedback" |

### User overload risks
- Talent dashboard sidebar: 4 primary items only — **Dashboard, Jobs, Proposals, Contracts**. Inbox is an icon in the topbar. Settings under user menu.
- Company dashboard sidebar: 5 primary items — **Dashboard, Jobs, Talent Search, Contracts, Team**. Same pattern.
- Admin sidebar: grouped — **People** (Companies, Talent, Admins), **Trust** (Moderation, Verification, Reports), **Platform** (Subscriptions, Featured, Plans, Flags), **Insights** (Analytics, AI Usage, Audit, Activity), **Support** (Tickets).

### Conversion bottlenecks
| Funnel step | Drop-off mitigation |
|---|---|
| Land → talent signup | Hero with live "match preview" — type a skill, see real (anonymised) talent count |
| Land → company signup | "Post a job in 60 seconds" CTA |
| Talent signup → first proposal | Onboarding wizard ends on "Browse 30 open jobs" |
| Company signup → first match | Auto-publish a demo job during onboarding; deactivate at first real publish |
| Trial → paid | In-app upgrade prompt at 80% quota; usage meter in topbar |

### Dashboard complexity — locked layouts
- Topbar: principal switcher (if user has both talent + company), locale, notifications, user menu
- Sidebar: 4-5 primary items + secondary under each
- Breadcrumbs on nested routes
- Command palette (Cmd-K) via `cmdk 1.x`: jump-to-resource, switch principal, run admin commands

### Mobile UX
- Messaging fully mobile-first; threads use bottom sheet on `< md`
- Job posting mobile is supported but constrained — desktop banner suggests "Better on a larger screen"
- Admin dashboard is desktop-first; mobile shows read-only views with action confirmation flows

---

## 7. Backend + Frontend Integration

### API communication — locked
- REST under `api.moreclient.com/v1/...` for cross-cutting endpoints
- Server Actions for in-dashboard mutations (lower latency, no extra round-trip)
- SSE for AI streaming and admin activity feed
- Pusher Channels for bidirectional realtime
- CORS allowlist on `api.moreclient.com`: `app.moreclient.com`, `admin.moreclient.com`, `moreclient.com`

### Auth synchronisation — locked
- Clerk JS manages token lifecycle
- `fetcher.ts` injects `Authorization: Bearer <jwt>` per request
- 401 → `clerk.session.refresh()` → retry once → redirect to `/sign-in`
- Pusher channel auth piggybacks on Clerk session via `POST /api/v1/realtime/auth`
- SSE connections inherit Clerk cookies; revalidated on reconnect

### Realtime updates — locked event bus on the client
```ts
// src/providers/pusher-provider.tsx (sketch)
const dispatchers: Record<EventName, (data: unknown) => void> = {
  'thread.message': (m) => queryClient.setQueryData(['thread', m.threadId], …),
  'proposal.received': () => queryClient.invalidateQueries({ queryKey: ['proposals'] }),
  'job.match.ready': (j) => queryClient.invalidateQueries({ queryKey: ['matches', j.jobId] }),
  'admin.report.created': () => queryClient.invalidateQueries({ queryKey: ['admin','moderation'] }),
  'admin.activity': (e) => adminStore.pushActivity(e),
  'subscription.changed': () => queryClient.invalidateQueries({ queryKey: ['me','subscription'] }),
  'verification.updated': () => queryClient.invalidateQueries({ queryKey: ['me','verification'] }),
  'feedback.classified': () => queryClient.invalidateQueries({ queryKey: ['admin','feedback'] }),
  'feedback.task.updated': () => queryClient.invalidateQueries({ queryKey: ['admin','feedback','tasks'] }),
  'feedback.resolved': (f) => toast.success(f.resolution ?? 'We acted on your feedback'),
};
```

### Upload strategy — locked
1. Client requests presigned R2 upload URL: `POST /api/v1/files/upload-url`
2. Client uploads directly to R2 with progress
3. Client confirms: returns final URL stored on resource (e.g. portfolio item)
4. Worker scans (Inngest moderation step)
5. SSE / Pusher notifies on scan complete

### Retry strategy — locked
- TanStack Query: 3 retries on network error, exponential backoff
- No retries on 4xx (except 408, 429 with `Retry-After`)
- Server Action mutations: retry only on explicit user action
- Pusher: SDK auto-reconnect; on > 30s outage, switch to TanStack polling

### Optimistic updates — locked policy
| Action | Optimistic |
|---|---|
| Send message | Yes (bubble immediately, dimmed until ack) |
| Withdraw proposal | Yes (immediate state change, undo toast) |
| Shortlist proposal | Yes |
| Add skill to profile | Yes |
| Submit verification | No (server side-effects) |
| Fund milestone | No (Stripe call must resolve) |
| Sign contract | No (legal action; require server confirmation) |
| Admin suspend/ban | No (high-impact; require server confirmation) |
| Update settings | No |
| Delete portfolio item | Yes with undo toast |
| Submit AI feedback (↑/↓, NPS, comment) | Yes (immediate "Thanks" toast; rolled back on server 4xx) |
| Hide match from list (negative signal) | Yes with undo toast (10s) |
| Correct AI-enriched profile field | Yes (server reconciles via diff) |

---

## 8. State Management Strategy

### Global state (Zustand)
```ts
// src/stores/ui-store.ts
type UIStore = {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
  commandPaletteOpen: boolean
  toggleCommandPalette: () => void
  theme: 'light' | 'dark' | 'system'
  setTheme: (t: 'light' | 'dark' | 'system') => void
}

// src/stores/principal-store.ts
type PrincipalStore = {
  activePrincipal: { type: 'company' | 'talent'; id: string } | null
  setActivePrincipal: (p: …) => void
}
```

### Server state (TanStack Query)
- Query keys: arrays `['<resource>', { …params }]`
- Each feature exports its own queries: `features/<domain>/queries.ts`
- Default options identical across the app (see §3 caching)
- Mutations invalidate explicit keys, never blanket

### Local state (useState / useReducer)
- Component-internal only (toggles, hover, focus)
- Never used for cross-component coordination

### Form state (react-hook-form)
- Schema-first (Zod)
- One hook per form
- Submit handler calls a Server Action or TanStack mutation
- Server errors map back to field-level errors via `error.meta.fields`

---

## 9. Performance Optimization Plan

### Lazy loading — locked
- Charts (Recharts 2.13.x) → `dynamic(() => import('...'), { ssr: false })`
- Markdown renderer → dynamic
- Admin tabs → dynamic per route
- AI chat panel → dynamic on first open

### Code splitting — locked
- Per-route (App Router default)
- Per-feature: each `src/features/<x>` is a natural chunk boundary

### SSR / ISR — locked per §3 table

### Caching — locked per §3 table

### Image optimization — locked
- `next/image` everywhere
- AVIF + WebP via Next.js Image Optimization
- LCP image priority on landing
- Talent avatars: served from R2 via Next.js image loader

### Bundle optimization — locked
- `@next/bundle-analyzer 15.x` in CI; PR comment shows delta
- Budget: **220 KB** JS for dashboard initial load (gzipped)
- Budget: **120 KB** JS for public talent profile (gzipped)
- Tree-shake icons (`lucide-react 1.16.x` per-icon imports)
- No moment, no lodash; use `date-fns 4.1.x` + native methods

### Performance targets — locked
| Metric | Target |
|---|---|
| Marketing LCP | < 1.5s |
| Marketing CLS | < 0.05 |
| Dashboard TTI | < 2.0s on cable |
| Public talent profile LCP | < 1.8s |
| AI stream first token | < 1.2s |
| AI stream full response | < 4.0s P95 |
| Match generation end-to-end | < 90s P95 |
| Message send → recipient render | < 500ms P95 |

---

## 10. Security Considerations

### XSS prevention — locked
- React default escaping
- Markdown rendered via `react-markdown 9.x` + `rehype-sanitize 6.x` allowlist
- No `dangerouslySetInnerHTML` in user content
- CSP via `next.config.ts`:
  ```
  default-src 'self';
  script-src 'self' https://clerk.moreclient.com https://js.stripe.com https://*.pusher.com https://app.posthog.com;
  connect-src 'self' https://api.moreclient.com https://*.clerk.accounts.dev https://*.pusher.com https://app.posthog.com https://api.stripe.com;
  img-src 'self' data: https://*.r2.cloudflarestorage.com https://img.clerk.com;
  frame-src https://js.stripe.com https://challenges.cloudflare.com https://*.persona.io;
  style-src 'self' 'unsafe-inline';
  ```

### CSRF — locked
- Bearer-token-based API calls → no cookie-only CSRF surface
- Server Actions: Next.js 16's action signing prevents cross-site replay
- Stripe portal redirects use signed return URLs
- Webhook endpoints verify provider signatures

### Secure storage — locked
- Tokens: Clerk-managed (memory + httpOnly cookies)
- No `localStorage` for sensitive data
- File uploads: signed R2 URLs scoped to principal prefix

### Token handling — locked
- JWT never logged
- Sent via `Authorization` header only
- Pusher channel auth re-issues short-lived per-channel tokens

### Frontend attack vectors — locked
| Vector | Mitigation |
|---|---|
| Iframe clickjacking | `X-Frame-Options: DENY` on dashboards |
| Embed token theft via referer leak | `Referrer-Policy: strict-origin-when-cross-origin` |
| Open redirect via `returnTo` | Allowlist of allowed paths |
| Stored XSS via user content | Sanitise on render; CSP fallback |
| Supply chain (npm) | Renovate + pnpm audit + Socket.dev |
| Admin route exposure | Middleware checks `PlatformAdmin` row + active flag; route group hidden behind `/admin/*` host gate |

---

## 11. Fullstack Feature Dependency Map

| Frontend feature | Backend endpoints | Inngest jobs | Realtime channels |
|---|---|---|---|
| Talent onboarding | `POST /talent`, `PATCH /talent/:id`, R2 upload-url | `talent.enrich-profile`, `talent.embed-profile` | `private-user-<clerkUserId>` (verification, enrichment) |
| Company onboarding | `POST /companies`, `PATCH /companies/:id` | — | `private-user-<clerkUserId>` |
| Job posting | `POST /jobs`, `POST /jobs/:id/publish` | `jobs.embed-posting`, `jobs.match-talent` | `private-user-<>` for match-ready event |
| Proposal submit | `POST /proposals` | `proposals.score`, notification | `private-user-<companyOwner>` |
| Talent search | `POST /ai/search` (semantic), `GET /talent` (filter) | — | — |
| Match list | `GET /jobs/:id/matches` | `jobs.match-talent` | `private-user-<>` |
| AI chat assistant | `GET /ai/chat` SSE | — | — |
| Messaging | `POST /messaging/threads/:id/messages`, `GET /messaging/threads/:id/messages` | `messaging.scan` | `private-thread-<id>` |
| Contract sign | `POST /contracts/:id/sign` | — | `private-user-<>` |
| Milestone fund | `POST /contracts/:id/milestones/:mid/fund` (Stripe) | — | `private-user-<talent>` |
| Milestone release | `POST /contracts/:id/milestones/:mid/release` | `billing.reconcile-commissions` | `private-user-<talent>` |
| Reviews | `POST /reviews` | — | — |
| Subscription upgrade | `POST /billing/checkout`, Stripe webhook | `billing.sync-subscription` | `private-user-<>` |
| Stripe Connect onboard | `POST /billing/connect/onboard` | — | `private-user-<talent>` |
| Verification (talent) | `POST /talent/:id/verification`, Persona webhook | — | `private-user-<talent>` |
| Report content | `POST /moderation/reports` | `moderation.review-report` | `presence-admin-activity` |
| Admin: company suspend | `POST /admin/companies/:id/suspend` | — | `presence-admin-activity`, `private-user-<>` |
| Admin: talent verify | `POST /admin/talent/:id/verify` | — | `presence-admin-activity`, `private-user-<talent>` |
| Admin: featured placement | `POST /admin/talent/:id/feature` | — | `presence-admin-activity` |
| Admin: moderation decide | `POST /admin/moderation/:id/decide` | — | `presence-admin-activity`, `private-user-<target>` |
| Admin: support reply | `POST /admin/support/tickets/:id/reply` | — | `private-user-<opener>` |
| Admin: AI usage | `GET /admin/ai-usage` | nightly rollup `analytics.rollup-platform` | — |
| Inline AI feedback (↑/↓, reasons) | `POST /feedback` | `feedback.classify` | `presence-admin-activity` |
| Post-conversation NPS card | `POST /feedback/nps` | `feedback.classify` | — |
| Match feedback (👍/👎/Hide) | `POST /feedback/match` | `feedback.classify`, `feedback.rerank-signal-rollup` | — |
| Search result feedback | `POST /feedback/search` | `feedback.classify`, `feedback.rerank-signal-rollup` | — |
| Enrichment correction | `POST /feedback/enrichment` | `feedback.classify`, `talent.embed-profile` | `private-user-<talent>` |
| Weekly NPS banner | `GET /me/feedback/prompt`, `POST /feedback` | `feedback.aggregate-weekly` | — |
| Admin: feedback queue | `GET /admin/feedback`, `POST /admin/feedback/:id/*` | — | `presence-admin-activity` |
| Admin: improvement tasks | `GET /admin/feedback/tasks`, `PATCH /admin/feedback/tasks/:id`, `POST /admin/feedback/tasks/:id/approve` | `feedback.update-eval-set` (on approve) | `presence-admin-activity` |
| Admin: weekly aggregates | `GET /admin/feedback/aggregates` | `feedback.aggregate-weekly` | — |
| User notified of resolved feedback | n/a | n/a | `private-user-<>` (`feedback.resolved`) |
| Admin: audit log | `GET /admin/audit-log` | — | — |
| Admin: activity feed | `GET /admin/activity` SSE | — | `presence-admin-activity` |
| Admin: flags / plans / admins | `GET/PATCH /admin/flags|plans|admins` | — | — |

---

## 12. Development Workflow

### Git workflow — locked
- Trunk-based with short-lived feature branches
- Branch naming: `feat/<area>-<short>`, `fix/<area>-<short>`, `chore/...`
- All branches off `main`; rebase before merge; squash merge
- `main` always deployable to staging
- Production tagged: `v0.1.0`, `v0.2.0` (semver-ish)

### Code review — locked
- PR template: summary, screenshots/video for UI, test plan, migration notes
- Required reviewers: 1 for `app/` + `features/` changes; 2 for `server/core/`, `prisma/`, `lib/api/fetcher.ts`, admin routes
- Auto-checks (block merge):
  - `pnpm typecheck`
  - `pnpm lint` (ESLint + Prettier)
  - `pnpm test`
  - `pnpm eval:fast`
  - `pnpm prisma validate`
  - Playwright smoke
  - Bundle-size budget
  - Two-tenant probe
- Replit Preview deploy auto-comments PR with URL

### Environment strategy — locked
| Env | Branch | URL | DB |
|---|---|---|---|
| local | feature/* | localhost | docker-compose Postgres |
| preview | PR | per-fork `*.replit.app` | Neon branch (auto-created) |
| staging | main | `staging.moreclient.com` | Neon `staging` branch |
| production | tag | `moreclient.com` | Neon main |

### Release workflow — locked
- Daily: merges to `main` auto-deploy to staging (Replit)
- Weekly: cut a release tag Tuesday; deploys production after smoke
- Hotfix: cherry-pick to `release/<tag>`; one-click deploy

### Commit message style — locked
Conventional commits: `feat(talent): add portfolio item form`, `fix(billing): handle invoice.payment_failed`.

---

## 13. QA & Testing Strategy

### Unit tests — locked
- Frontend + Backend: **Vitest 2.1.8** + React Testing Library 16.x
- Coverage target 80% on lib functions, schemas, pure utilities

### Integration tests — locked
- Backend modules with real Neon branch DB (testcontainers fallback for offline)
- Test full Server Action / Route Handler paths with principal scoping active
- Run on every PR

### E2E tests — locked
- **Playwright 1.49.1**
| Critical path | Cadence |
|---|---|
| Talent signup → profile → submit proposal | every PR |
| Company signup → post job → see matches → message talent | every PR |
| Contract flow: sign → fund milestone → release | every PR |
| Verification: Persona simulated success → status updates | nightly |
| Admin: suspend company → confirm revoked access | every PR |
| Admin: moderation decide → audit log entry | every PR |
| Two-tenant isolation (login as A, attempt to read B) | every PR |
| Locale switch (AR ↔ EN) → no layout shift | nightly |
| Stripe webhook replay (idempotency) | nightly |

### AI testing — locked
- Golden sets per pipeline (matching, search, chat) — 100 EN + 100 AR each
- Metrics: faithfulness, citation accuracy, match nDCG@10, latency P50/P95, cost/query
- Run nightly + on PRs touching `src/server/ai/**` or prompts
- Merge blocked if faithfulness drops > 3 pts OR cost rises > 20%

### Load testing — locked
- **k6 0.55.x** scripts in `/load/`
- Scenarios:
  - 200 concurrent dashboard sessions, 5min steady
  - 50 concurrent AI matches (cold cache)
  - 100 concurrent Pusher subscriptions
  - 500 RPS on `GET /api/v1/jobs`
- Weekly on staging
- Targets: dashboard P95 < 1.5s; AI match P95 < 90s; no 5xx under target load

---

## 14. Production Readiness Checklist

### Application
- [ ] All endpoints behind Clerk auth (except marketing + public profile)
- [ ] Principal scoping enforced via repo layer + two-tenant probe in CI
- [ ] All errors return problem+json with `requestId`
- [ ] All mutations idempotent (key on `Idempotency-Key` header where required)
- [ ] Rate limits configured per principal + per IP (Upstash Ratelimit)
- [ ] Webhook signature verification on every webhook endpoint
- [ ] PII redaction in logs

### Data
- [ ] Neon PITR enabled, restore drill passed
- [ ] Pinecone nightly Parquet export to R2, re-embed drill passed
- [ ] R2 object versioning enabled
- [ ] GDPR delete tested end-to-end (DB + Pinecone + R2 + Stripe scrub)
- [ ] GDPR export tested

### Observability
- [ ] Sentry capturing errors with PII scrubbed
- [ ] Axiom receiving structured logs with correlation IDs
- [ ] Inngest function failures alerting to Slack
- [ ] BetterStack monitors: marketing, sign-in, AI match round-trip
- [ ] Pusher Insights wired
- [ ] Alerts to Slack: P1 (page), P2 (channel)

### Security
- [ ] Cloudflare WAF rules active
- [ ] CSP headers strict
- [ ] Secrets in Replit Secrets only, none in repo
- [ ] Dependabot enabled
- [ ] Snyk + `pnpm audit` in CI
- [ ] External pentest scheduled before first paying customer

### Business
- [ ] Stripe products live, $1 charge tested in real mode
- [ ] Stripe Connect Express onboarding tested with sandbox bank
- [ ] Pricing page matches Stripe products
- [ ] ToS + Privacy Policy published
- [ ] DPA template available
- [ ] Support inbox monitored

### AI
- [ ] OpenAI ZDR confirmed
- [ ] Cohere usage scoped to org
- [ ] Eval golden sets passing baseline
- [ ] Prompt versioning enforced via PR
- [ ] Cost alerts at 50% / 80% / 100% of monthly budget

### Admin
- [ ] At least 2 super_admins seeded
- [ ] All admin endpoints exercised in E2E
- [ ] Audit log working end-to-end
- [ ] Featured placements expire correctly
- [ ] AI usage dashboard reading from `PlatformDailyMetrics`

### Feedback loop
- [ ] Inline ↑/↓ + reason picker rendered on every AI bubble
- [ ] Post-conversation NPS card fires on 5min idle OR chat panel close (one per session)
- [ ] Per-match 👍/👎/Hide affordances on `/jobs/:id/matches`
- [ ] Per-result thumbs on `/talent-search`
- [ ] Per-field correction on AI-enriched talent profile fields
- [ ] Weekly NPS banner shows in company + talent dashboards Mondays
- [ ] `feedback.classify` Inngest function running; dedupe by semantic hash verified
- [ ] Admin `/admin/feedback` queue functional with severity, surface, area filters
- [ ] Slack alert on p1 feedback within 60s (synthetic test)
- [ ] Improvement-task → PR bot wiring tested end-to-end (synthetic)
- [ ] Weekly aggregates rolling up on schedule; visible in `/admin/ai-usage`
- [ ] RerankSignal influence verified offline: 5 "Hide" actions de-rank affected talent
- [ ] `feedback.resolved` notification fires to user when their report leads to a merged PR

---

## 15. Fullstack Roadmap

### Phase 1 — MVP (Weeks 1-4)
**Goal:** Two-sided marketplace skeleton live; talent and company can transact a free contract.

Frontend:
- Marketing landing + pricing
- Sign-in / sign-up via Clerk
- Talent dashboard shell + profile + portfolio
- Company dashboard shell + jobs + talent search (filter-only, no AI)
- Job posting form
- Proposal submit form
- Contract viewer + signature
- Messaging (basic, no Pusher yet — polling fallback)

Backend dependencies: Phase 1-2 of backend-plan.md.

### Phase 2 — AI + Realtime (Weeks 5-6)
**Goal:** AI matching live; Pusher realtime; eval harness.

Frontend:
- Matches tab on jobs
- AI search bar on talent search
- AI description assist on job form
- AI chat panel (in-app help)
- Pusher-driven live messaging
- Notifications center

Backend dependencies: Phase 3 of backend-plan.md.

### Phase 3 — Money & Trust (Weeks 7-8)
**Goal:** Real money moves; talent gets paid; admin controls platform.

Frontend:
- Stripe billing (checkout, portal, subscription state)
- Stripe Connect onboarding for talent
- Milestone fund/release UI
- Verification flow (Persona embed)
- **Full admin dashboard** (companies, talent, moderation, verification, support, AI usage, audit, activity, flags, plans, admins, featured)
- Moderation report UI on user-generated content

Backend dependencies: Phase 4 of backend-plan.md.

### Phase 4 — Public launch (Weeks 9-10)
**Goal:** Open the marketplace publicly.

Frontend:
- Public talent profile (`/t/[handle]`)
- Public job listings indexable
- Reviews + ratings UI
- Talent featured upgrade UI
- Mobile dashboard pass (read-only + key actions)
- Onboarding wizard polish
- Marketing content (3 articles, case studies)
- Status page

Backend dependencies: Phase 5 of backend-plan.md.

### Phase 5 — Growth (Weeks 11-12)
- Notifications center polish
- Email digests (Resend + React Email)
- Command palette
- Search filters expanded
- Admin bulk operations
- Admin moderation automations
- API keys for third-party integrations

---

## 16. Final Technical Recommendations

### Locked decisions (do not revisit)
- **Replit Reserved VM** for hosting — no AWS/GCP/K8s
- **Single Next.js 16.2.6 app** — no Python service, no microservices
- **Inngest** for jobs/cron — no Celery, no BullMQ, no Replit Always-On worker
- **Pusher Channels** for realtime — no self-hosted WS, no Socket.io
- **Prisma 5.22 + Neon Postgres 16** — no SQLite, no Drizzle
- **Clerk** for auth — no NextAuth, no Auth.js
- **Pinecone serverless** — no Qdrant self-host, no ChromaDB
- **Cohere multilingual** for embeddings + rerank
- **OpenAI gpt-4o-mini default** with **Anthropic Claude 4.6 fallback**
- **shadcn/ui + Tailwind 4** — no custom primitives, no MUI/Mantine
- **next-intl** for i18n — no custom provider
- **TanStack Query + Zustand + react-hook-form + Zod** — locked client stack

### What is overengineering — banned at MVP
- Multi-region deployment (single Replit region is fine)
- Per-tenant database (single Postgres with principal scoping)
- Service mesh / sidecars
- GraphQL
- Microservices
- Custom design system from scratch
- Native mobile apps (web is mobile-first)
- Plugin / extension system
- Multi-marketplace verticals (one marketplace, one product)
- WhatsApp / Telegram integrations
- Voice / video calls inside platform

### What should be delayed
- WhatsApp business onboarding — Phase 6+, after PMF
- Native mobile app — never if web is sufficient
- Multi-currency (other than USD) — Phase 6+
- Multi-region Pinecone — at $50k MRR
- Custom AI fine-tuning — after 10,000 real interactions
- Self-hosted models — never if external APIs work
- SOC2 — Phase 6 once enterprise leads appear

### Smartest MVP strategy — locked
1. **Weeks 1-4:** Two-sided marketplace skeleton, both dashboards, free contracts (no money yet)
2. **Weeks 5-6:** AI matching + messaging — the differentiator
3. **Weeks 7-8:** Money flows + admin control plane (Stripe Connect + admin dashboards)
4. **Weeks 9-10:** Public profiles + reviews → open the marketplace publicly
5. **Weeks 11-12:** Polish, content, growth loops

Ship nothing beyond this scope before validating PMF with 50 active talent + 10 active companies and at least 5 completed paid contracts.

---

## 17. Launch Readiness Gate

Mirror of backend-plan.md §13 with frontend-specific items. Production launch is **blocked** until every item in §17.1 is passing in staging for 7 consecutive days.

### 17.1 Hard gates — any failure blocks launch
| # | Item | Verification |
|---|---|---|
| 1 | All public routes (marketing, public profile, embed) auth-free, TTFB < 200ms | Lighthouse CI |
| 2 | All dashboard routes hard-redirect unauthenticated users | E2E `tests/e2e/auth-redirects.spec.ts` |
| 3 | `/admin/*` blocked for non-admin users at middleware layer | E2E + manual |
| 4 | Locale switch (AR ↔ EN) preserves state with zero layout shift | E2E `tests/e2e/locale.spec.ts` |
| 5 | RTL pixel-perfect on signup, dashboard home, messaging, AI chat, public profile | Visual regression (Playwright screenshots) |
| 6 | Mobile dashboard usable on iOS Safari + Android Chrome (last 2 versions) | Manual + BrowserStack |
| 7 | WCAG 2.1 AA verified on signup, dashboard, messaging, AI chat, public profile | axe-core CI + screen reader pass |
| 8 | CSP locked down (no `unsafe-eval`, no wildcard sources beyond known providers) | Header check |
| 9 | Bundle size under budget: 220KB dashboard, 120KB public, 80KB widget (gzipped) | CI bundle-analyzer |
| 10 | Sentry sourcemaps uploaded; PII scrubbed in error payloads | Sentry inspection |
| 11 | PostHog autocapture configured; key funnels live (signup, first job, first proposal, first contract, feedback submission) | PostHog dashboards |
| 12 | **Feedback widget renders on every AI surface** (chat, match, search, enrichment) | E2E `tests/e2e/feedback.spec.ts` |
| 13 | **Post-conversation NPS card** appears on 5min idle OR panel close (one per session) | E2E + manual |
| 14 | **Per-match 👍/👎/Hide** rendered on `/jobs/:id/matches` with optimistic UI + undo | E2E |
| 15 | **Per-result thumbs** rendered on `/talent-search` results | E2E |
| 16 | **Weekly NPS banner** shows in dashboards Mondays (controlled by feature flag) | E2E |
| 17 | **`feedback.resolved` notification** delivered via Pusher to authors when PR merges | E2E synthetic |
| 18 | Empty states + error states reviewed on every dashboard page | Manual screenshot review |
| 19 | Loading skeletons render within 100ms on every async view | Manual |
| 20 | Optimistic updates roll back on server 4xx (messaging, feedback, proposals, match hide) | E2E |
| 21 | Cmd-K command palette wired with ≥ 20 actions | Manual |
| 22 | All flows verified on a real Replit Reserved VM deployment | Manual smoke |

### 17.2 Soft gates — warnings, may ship with stakeholder waiver
- Lighthouse score ≥ 90 on marketing + public profile
- Dashboard P95 TTI ≤ 2.0s on cable
- AI chat first-token P95 ≤ 1.2s
- AI match generation P95 ≤ 90s
- LCP < 1.5s on marketing, < 1.8s on public profile
- CLS < 0.05 on every public route

### 17.3 Content readiness
| Item | Owner |
|---|---|
| Marketing copy reviewed by native AR + EN speakers | PM |
| Pricing page mirrors Stripe Prices exactly | Billing |
| ToS, Privacy Policy, DPA published; cookie banner live | Legal |
| Help center seeded with 20+ articles (10 EN + 10 AR) feeding AI chat RAG | Product |
| Onboarding tooltips reviewed; ~12 contextual hints across talent + company dashboards | UX |
| All email templates (Resend) reviewed in AR + EN; previews render correctly | UX |
| Error copy reviewed for tone; never blames the user | UX |
| Empty state CTAs link to the right next action | Product |
| Feedback taxonomy (reason codes) translated AR + EN; reviewed by native speakers | Product |
| Privacy disclosure on feedback widget ("We use this to improve, never share publicly") | Legal |

### 17.4 Feedback UX sanity check
- [ ] Inline ↑/↓ animation < 16ms; doesn't block scroll
- [ ] Reason picker modal accessible via keyboard only (Tab + Enter)
- [ ] Post-conversation card dismissable without filling (don't block exit)
- [ ] One NPS card per session, server-enforced (frontend trusts but verifies)
- [ ] Hidden matches surface in "Undo" toast within 10s; "Show again" link in dropdown
- [ ] Talent can see "AI suggested · you corrected" badge on profile fields they edited
- [ ] User receives in-app + email notification on feedback.resolved with PR link if non-sensitive

### 17.5 Soft launch sequence (frontend-side)
1. **Closed beta (Week 0):** Invite-only flag in Clerk; magic-link onboarding sequence active; in-app announcement bar; **feedback prompts aggressively shown** (every 2 conversations)
2. **Open beta (Week 2):** Public signup; trial banner; feedback prompts every 3 conversations
3. **Public launch (Week 4):** Trial banner removed; full pricing live; Product Hunt + MENA channels assets ready (10 screenshots, 1 demo video, 3 case studies)

Sign-offs required at each stage from: PM, Frontend lead, UX lead, AI lead, CTO.
