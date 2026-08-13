# MoreClient — End-to-End Test Report

## Test environment

The test run used an isolated SQLite database (`e2e.sqlite3`) with the FastAPI backend running in production mode on port 8000 and the Next.js frontend on port 5001. The environment used a dedicated application secret, admin API key, and seeded users for an administrator plus two isolated companies, North and South.

| Area | Test configuration |
| --- | --- |
| Backend | `ENV=prod`, FastAPI, isolated `e2e.sqlite3` database |
| Frontend | Next.js development server at `http://localhost:5001` |
| Authentication | JWT session restoration, company credentials, admin credentials, and admin API key |
| Test data | E2E North, E2E South, seeded orders, and temporary tenants created only for lifecycle tests |

## Executed scenarios

| Scenario | Result | Evidence |
| --- | --- | --- |
| Isolated production-mode environment and seeded data | Pass | Backend started against the E2E database with production auth settings; an admin, two company users, two tenants, and three orders were seeded. |
| Company sign-in and dashboard routing | Pass | E2E North authenticated in the browser and was routed to `/dashboard`. |
| Company-to-admin authorization boundary | Pass | Direct navigation from E2E North to `/admin` was redirected to `/dashboard`; the company navigation did not expose the admin portal. |
| Company order isolation | Pass | E2E North saw exactly its two seeded orders, `Starter package` and `Premium package`; the South-only order was absent. |
| Order status filtering | Pass | The `pending` filter returned only `Starter package` for E2E North. |
| Order status update | Pass | `Starter package` was changed from `pending` to `forwarded` through the UI and persisted. |
| Cross-tenant order mutation protection | Pass | An E2E North browser request to update E2E South order `#3` returned HTTP 404 and did not modify the order. |
| Logout and unauthenticated dashboard guard | Pass | Logout returned to `/welcome`; direct navigation to `/dashboard` without a session returned to `/welcome`. |
| Invalid password feedback | Pass | A wrong password remained on the sign-in screen, displayed `Invalid email or password`, and created no session. |
| Admin sign-in, overview, KPI, and health data | Pass | The admin was routed to `/admin`; tenant information, KPI values, and live service health values loaded from the E2E backend. |
| Admin tenant search and filters | Pass | Searching for E2E South reduced the tenant table to the matching record. |
| Tenant status lifecycle | Pass | E2E South was deactivated and reactivated successfully, with success feedback and persisted state. |
| Admin order visibility | Pass | The administrator saw all three orders, including E2E South data and the persisted `Forwarded` status for `Starter package`. |
| Tenant provision form and creation | Pass | The provision form accepted company name, email, plan tier, and message limit; creation added the tenant to the admin table. |
| Tenant edit form and integration snippets | Pass | The edit dialog prefilled tenant data and exposed valid JavaScript and iframe integration snippets. |

## Defects identified and corrected

| Defect | Reproduction | Correction |
| --- | --- | --- |
| Admin session hydration race | With a valid admin JWT in local storage but no `userRole` in session storage, direct navigation to `/admin` redirected to `/dashboard` before `/api/auth/me` restored the role. | The admin layout now waits for session validation before deciding whether a non-admin redirect is required. |
| Stale KPI cards after tenant lifecycle actions | Creating, editing, or toggling a tenant updated the table but left Active tenants and MRR stale until the user manually refreshed. | Successful create, edit, status-toggle, and delete actions now reload the admin overview data. |
| Native browser confirmation blocked automated deletion | The tenant delete action used `window.confirm`, which blocks headless browser automation and provides a less consistent UI. | The native dialog was replaced with an accessible in-app confirmation modal containing Cancel and Delete permanently actions. |

## Post-fix regression checks

| Scenario | Result | Evidence |
| --- | --- | --- |
| Admin deep link after session-storage reset | Pass | After clearing `sessionStorage` while retaining the valid JWT, direct navigation to `/admin` remained in the admin console after `/api/auth/me` restored the role. |
| KPI refresh after tenant creation | Pass | Creating a temporary Pro tenant immediately changed Active tenants from 3 to 4 and MRR from `$3,500` to `$4,000`, without using Refresh data. |
| KPI refresh after tenant edit | Pass | Changing that temporary tenant from Pro to Custom immediately changed MRR from `$4,000` to `$6,500`. |
| KPI refresh after status toggle | Pass | Deactivating the temporary Custom tenant immediately changed Active tenants from 4 to 3 and MRR from `$6,500` to `$3,500`. |
| Embedded deletion confirmation | Pass | The new confirmation modal appeared with Cancel and Delete permanently controls and did not block automation. |
| Tenant deletion and final KPI refresh | Pass | Confirming deletion removed the temporary tenant and restored the dashboard to 3 active / 3 total tenants and `$3,500` MRR. |

## Conclusion

The executed authentication, authorization, tenant-management, order-flow, isolation, KPI, and platform-health scenarios passed after the three corrected defects were retested. Final environment cleanup removed both temporary tenants created during exploratory and regression testing. The E2E database was restored to the two seeded active tenants (North and South), with 2 active / 2 total tenants and `$2,000` MRR.
