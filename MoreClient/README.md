# clientMORE — B2B AI Customer Support Agent

clientMORE is a bilingual B2B SaaS customer-support application with a Next.js frontend, a FastAPI backend, JWT authentication, tenant-scoped resources, purchase-order workflows, and a SuperAdmin tenancy console.

## Local development

Install the frontend dependencies from the `MoreClient` directory:

```bash
cd MoreClient
pnpm install
```

Start the backend from the repository root:

```bash
ENV=dev APP_SECRET=local-app-secret \
  python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Start the frontend in a second terminal:

```bash
cd MoreClient
pnpm run dev
```

The frontend is available at `http://localhost:5001` and the backend health endpoint is available at `http://localhost:8000/health`.

## Quality commands

The frontend exposes separate commands for static checks, production compilation, and browser automation:

```bash
cd MoreClient
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run test:e2e
```

Run the backend suite from the repository root:

```bash
python3 -m pytest -q
```

The combined frontend gate is available as:

```bash
cd MoreClient
pnpm run test:ci
```

## E2E tests

Playwright tests live under `MoreClient/e2e/tests`. The Playwright configuration starts an isolated FastAPI server and frontend server when they are not already running. Before the browser tests begin, `e2e/seed.py` recreates a SQLite database containing only deterministic E2E users, tenants, conversations, and purchase orders.

The seed script refuses to operate on a non-E2E SQLite URL. To use another isolated database path, provide a URL containing `e2e`:

```bash
E2E_DATABASE_URL=sqlite:////tmp/my-moreclient-e2e.sqlite3 \
  pnpm run test:e2e
```

The browser suite covers invalid credentials, tenant-scoped order visibility, status filtering, order updates, cross-tenant mutation protection, admin session restoration, and tenant lifecycle KPI refreshes. Test reports and traces are generated under `playwright-report` and `test-results` when failures occur.

## CI

`.github/workflows/quality.yml` runs on every pull request and every push to `main`. It installs backend and frontend dependencies, installs Chromium, runs the complete Python test suite, performs lint and TypeScript checks, builds the frontend, and executes the Playwright suite. Playwright reports are uploaded as workflow artifacts when available.

## Main routes

- `/` — landing page
- `/welcome` — authentication entry point
- `/dashboard` — tenant analytics dashboard
- `/dashboard/purchases` — tenant-scoped purchase orders
- `/dashboard/files` — tenant-scoped knowledge-base files
- `/dashboard/handoffs` — tenant-scoped support handoffs
- `/dashboard/settings` — tenant configuration
- `/admin` — SuperAdmin tenancy console
- `/widget` — embeddable support widget
