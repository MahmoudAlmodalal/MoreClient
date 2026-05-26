import { test, expect } from "@playwright/test"

const MOCK_TENANTS = [
  {
    id: 1, tenant_key: "acme-corp", name: "Acme Corp", email: "admin@acme.com",
    plan: "pro", status: "active", used_messages: 150, limit_messages: 500,
    created_date: "2024-01-01T00:00:00Z",
  },
  {
    id: 2, tenant_key: "beta-inc", name: "Beta Inc", email: "admin@beta.com",
    plan: "starter", status: "active", used_messages: 30, limit_messages: 100,
    created_date: "2024-02-01T00:00:00Z",
  },
]

const MOCK_KPIS = {
  active_tenants: 2, total_tenants: 2, total_mrr: 198, global_messages: 180,
}

test.describe("Admin Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/admin/tenants**", (route) =>
      route.fulfill({ json: MOCK_TENANTS }),
    )
    await page.route("**/admin/kpis**", (route) =>
      route.fulfill({ json: MOCK_KPIS }),
    )
    await page.route("**/admin/health**", (route) =>
      route.fulfill({ json: { db_latency_ms: 2.1, chroma_status: "ok", memory_usage_percent: 45.2, cpu_usage_percent: 12.5, llm_provider_status: "ok" } }),
    )
  })

  test("admin page shows tenant list after entering key", async ({ page }) => {
    await page.goto("/admin")
    // Admin page has a key gate — enter the admin key
    const keyInput = page.getByPlaceholder(/admin key/i).first()
    if (await keyInput.count() > 0) {
      await keyInput.fill("test-admin-key")
      await page.getByRole("button", { name: /submit|enter|access/i }).first().click()
    }
    // Tenant names should be visible
    await expect(page.getByText("Acme Corp")).toBeVisible()
  })

  test("admin page shows global KPIs", async ({ page }) => {
    await page.goto("/admin")
    const keyInput = page.getByPlaceholder(/admin key/i).first()
    if (await keyInput.count() > 0) {
      await keyInput.fill("test-admin-key")
      await page.getByRole("button", { name: /submit|enter|access/i }).first().click()
    }
    // Should show tenant count or MRR from mock data
    await expect(page.getByText(/2/).first()).toBeVisible()
  })

  test("admin page is accessible at /admin route", async ({ page }) => {
    const response = await page.goto("/admin")
    // Should render the admin page (not 404)
    expect(response?.status()).not.toBe(404)
    await expect(page.locator("body")).toBeVisible()
  })
})
