# MoreClient Testing and Operations Guide

## Quality gates

Every pull request and every push to `main` runs the same deterministic quality sequence in `.github/workflows/quality.yml`: backend tests, frontend lint, TypeScript validation, production build, and Playwright browser tests. A change is considered releasable only when all stages pass.

The local equivalent is:

```bash
python3 -m pytest -q
cd MoreClient
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run test:e2e
```

Playwright starts a fresh backend and frontend pair by default and recreates the isolated E2E SQLite database before the browser suite. Set `E2E_REUSE_SERVER=1` only when intentionally connecting to already-running services. Failure traces, screenshots, and videos are kept locally under `MoreClient/test-results`; CI uploads the HTML report as a workflow artifact.

## Test data safety

The committed seed script is `e2e/seed.py`. It refuses to operate on a non-SQLite URL or a path that does not contain `e2e`, preventing an accidental reset of a development or production database. E2E credentials are synthetic and must never be reused outside the test environment.

## Multi-tenant security contract

Every resource that belongs to a tenant must derive its scope from the authenticated JWT rather than from a client-provided tenant identifier. The current tests cover purchase orders, files, handoffs, and analytics-oriented dashboard access. Company users must receive a not-found response when they attempt to read or mutate another tenant's resource; administrators may access platform-wide data through the dedicated admin guard.

Any new tenant-owned endpoint should add two tests before implementation is considered complete: one proving that a company can access its own resource, and one proving that the same company cannot access a resource belonging to another tenant. Mutation tests must also assert that the foreign row remains unchanged after the rejected request.

## Production monitoring baseline

The application should expose the existing `/health` endpoint to the deployment platform's liveness check and keep `/api/admin/health` restricted to the admin authorization guard. Runtime monitoring should collect structured request logs with method, route, status code, latency, tenant scope where safe, and a correlation ID. Alert thresholds should be reviewed against real traffic, but the initial operational signals should include sustained 5xx responses, spikes in 401/403 responses, failed database health probes, elevated purchase-update errors, and repeated WebSocket disconnects.

The CI workflow is not a substitute for production observability. A deployment should also retain application logs, database backups, and Playwright artifacts from failed release checks. Secrets, JWTs, admin keys, customer content, and full authorization headers must be redacted before logs leave the server.

## Maintenance cadence

When adding a route, update the relevant unit isolation test and at least one browser scenario if the route changes a user-facing flow. When changing authentication or session storage, run the deep-link and logout tests explicitly. When changing a destructive UI action, preserve an accessible in-app confirmation control rather than introducing a blocking native browser dialog.

The test suite currently emits deprecation warnings for legacy naive UTC timestamps in older backend modules. These warnings do not fail the quality gate, but they should be removed incrementally by standardizing on timezone-aware UTC values in a dedicated maintenance change.
