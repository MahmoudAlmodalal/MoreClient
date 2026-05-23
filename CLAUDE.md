# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout — read this first

The git root (this directory) is **not** the app root. The actual Next.js application lives in the nested **`MoreClient/`** subdirectory. Everything below — `package.json`, `src/`, `prisma/`, `node_modules/` — is inside `MoreClient/`. Run all `npm`/`prisma`/`next` commands from there:

```bash
cd MoreClient
```

The git-root level holds planning docs and Replit config only:
- `fullstack-plan.md`, `backend-plan.md`, `REPLIT-ADMIN-PROMPT.md` — the **locked architecture blueprints**. These are aspirational/CTO-approved specs; the implemented code is a subset and sometimes diverges on dependency versions and UI libraries. **Trust the code over the plans** for what actually exists; use the plans for intent and roadmap.
- `.replit` — Replit deploy config. Runs `cd MoreClient && npm run dev -- -p 5000`; `postMerge` runs `scripts/post-merge.sh`.

## Commands (run from `MoreClient/`)

| Task | Command |
|---|---|
| Dev server (port **5000**, not 3000) | `npm run dev` |
| Production build | `npm run build` |
| Typecheck | `npm run typecheck` (`tsc --noEmit`) |
| Lint | `npm run lint` (flat ESLint, `eslint.config.mjs`) |
| Prisma client regen | `npx prisma generate` (also runs on `postinstall`) |
| Apply migrations (dev) | `npx prisma migrate dev` |
| Seed DB | `npm run seed` (`tsx prisma/seed.ts`) |
| AI eval (fast subset) | `npm run eval:fast` |
| AI eval (full golden sets) | `npm run eval:full` |

There is no configured unit-test runner script yet — `vitest` is installed but no `test` script exists. To run a single test directly: `npx vitest run path/to/file.test.ts`.

## Critical: this is Next.js 16, not the version you know

Per `MoreClient/AGENTS.md`: APIs, conventions, and file structure differ from older Next.js. Two consequences that will trip you up:

- **Middleware is renamed to "proxy".** The file is `src/proxy.ts` and it exports `proxy` (not `middleware`). It does Clerk auth gating + builds the nonce-based CSP per request. `next.config.ts` only sets static headers; the real CSP is in `proxy.ts`.
- Before writing nontrivial framework code, consult `node_modules/next/dist/docs/` rather than relying on training-data conventions.

## Backend architecture — strict 3-layer per module

All backend logic is a **modular monolith inside the Next.js app**. There is no separate service. Every domain module follows the same layering, and you should preserve it:

```
Route Handler  app/api/v1/<resource>/route.ts   ← HTTP, auth guard, Zod parse, audit, error→problem+json
   └─ Service  server/<module>/service.ts        ← business rules, ownership/status checks, emits Inngest events
        └─ Repo server/<module>/repo.ts          ← Prisma queries only
```

Cross-cutting primitives live in `src/server/core/` (`auth`, `db`, `errors`, `rbac`, `entitlements`, `rate-limit`, `pagination`, `audit`, `storage`, `stripe`, `pusher`, `redis`, plus `core/ai/` provider clients for openai/anthropic/cohere/pinecone).

### Route handler contract (follow this exactly)

Every route handler wraps its body in `try/catch` and returns errors as RFC 7807 problem+json:

```ts
try {
  const ctx = await requireRole("recruiter");        // auth guard, throws AppError
  await checkRateLimit("jobPost", ctx.company.id);
  const input = createJobSchema.parse(await request.json());  // Zod from src/schemas
  const job = await JobService.createJob(ctx, input);
  await writeAudit(auditContextFromPrincipal(ctx, request), "job.create", "Job", job.id);
  return NextResponse.json(job, { status: 201 });
} catch (err) {
  const appErr = toAppError(err);
  return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
}
```

- **Errors:** throw `new AppError(code, message, status, meta?)` from anywhere; never return ad-hoc error JSON. `toAppError` normalizes unknowns; `toProblemJson` serializes. Each `AppError` self-assigns a `requestId`.
- **Validation:** Zod schemas in `src/schemas/` are the single source of truth. Parse at the handler boundary.
- **Mutations** that matter should `writeAudit(...)`.

### Auth & multi-tenancy (`src/server/core/auth.ts`)

Two-sided tenancy plus admins. A request resolves to one `PrincipalContext`:
- **Company** (`clerkOrgId` → `Company` + `CompanyUser` with a `CompanyRole`)
- **Talent** (`clerkUserId` → single-owner `Talent`)
- **Admin** (`PlatformAdmin`, bypasses tenant scoping)

Use the guards rather than calling Clerk directly:
- `requirePrincipal(["company"|"talent"]?)` — 401 if anon, 403 if wrong type
- `requireRole(minRole)` — company user with at least a `CompanyRole` (role ladder in `core/rbac.ts`)
- `requireAdmin(minRole?)` — platform admin with at least an `AdminRole`
- `requireOwnership(resourcePrincipalId)` — caller owns the resource (admins always pass)

Services receive the resolved `ctx` and re-check ownership (e.g. `job.companyId !== ctx.company.id → FORBIDDEN`). Tenant isolation is enforced in the service/repo layer, not the DB — be careful never to query across tenants without an ownership check.

### Background jobs — Inngest

Async work (embeddings, matching, scoring, moderation scans, billing reconcile, GDPR, analytics rollups, weekly digests) runs as Inngest functions in `src/inngest/functions/*`. **Every function must be registered in the `serve(...)` array in `src/app/api/inngest/route.ts`** or it won't run. Trigger work from services with `inngest.send({ name: "job/published", data: {...} })`. Pusher is used only for client-facing realtime fan-out; the backend never subscribes to Pusher.

### Webhooks

`src/app/api/webhooks/{clerk,stripe,kyc}/route.ts` — verify provider signatures (svix for Clerk, Stripe SDK for Stripe) before doing anything. These routes are public in `proxy.ts`.

## AI layer

`src/server/ai/` holds matching, search, enrichment, scoring, chat, moderation, embedding, plus `guards.ts`. Prompts are plain text files in `src/server/ai/prompts/*.txt` loaded via `prompts/index.ts` — edit the `.txt`, don't inline prompt strings. Models (per blueprint): OpenAI `gpt-4o-mini` default chat, Cohere `embed/rerank-multilingual-v3.0`, Anthropic `claude-sonnet-4-6` fallback. AI changes should be validated against the golden sets in `tests/eval/golden-sets/*.jsonl` via `npm run eval:fast`.

## Frontend / i18n

The UI surface is currently thin (`src/app/dashboard/*`, public talent profile `(public)/t/[handle]`, `widget`). Path alias `@/*` → `src/*`. Tailwind 4 via `@tailwindcss/postcss`. The app is **bilingual EN/AR with RTL**; i18n is currently a hand-rolled `src/components/language-provider.tsx` (a typed translations object + context), **not** next-intl despite what the plan says. The product brand in UI strings is "clientMORE".

## Conventions

- TypeScript strict; ESM (`"module": "esnext"`, bundler resolution).
- Prisma `5.22.0`, Postgres 16. Enums (`CompanyStatus`, `CompanyRole`, `JobStatus`, `VerificationStatus`, …) are defined in `prisma/schema.prisma` and imported as types from `@prisma/client`. Soft-deletes use `deletedAt` — filter it in repo queries.
- IDs via `src/server/core/ids.ts` (`generateId`).
- Conventional Commits: `feat(talent): …`, `fix(billing): …`.
- Secrets come from env / Replit Secrets only; `proxy.ts` and clients no-op gracefully when keys (e.g. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`) are absent, so the app boots in dev without full config.
</content>
</invoke>
