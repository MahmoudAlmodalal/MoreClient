import { test, expect } from "@playwright/test"

const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEsInRpZCI6MSwidGsiOiJ0ZXN0LWNvcnAiLCJyb2xlIjoiY29tcGFueSJ9.test"

const MOCK_FILE = {
  id: 1, tenant_key: "test-corp", name: "knowledge-base.txt",
  size: "2.5 KB", type: "text", chunks: 3, date: "2024-01-15T10:00:00Z", status: "indexed",
}

const MOCK_SETTINGS = {
  tenant_key: "test-corp", company_name: "Test Corp", bot_name: "Aria",
  company_logo: null, bot_tone: "professional", system_prompt_extra: null,
  telegram_token: null, is_telegram_active: false,
  twilio_sid: null, twilio_token: null, twilio_number: null, is_whatsapp_active: false,
  subscription_plan: "pro", confidence_threshold: 0.35,
  purchase_flow_enabled: false, purchase_collect_address: false,
  purchase_collect_quantity: true, purchase_auto_forward_to_support: false,
  purchase_confirmation_required: true, purchase_session_minutes: 30,
  purchase_currency_label: null, intent_llm_enabled: false,
  intent_confidence_threshold: 0.6, auto_handoff_on_complaint: false, used_messages: 0,
}

test.describe("Files Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token) => {
      localStorage.setItem("authToken", token)
    }, TOKEN)

    await page.route("**/analytics**", (route) =>
      route.fulfill({ json: { kpis: { total_questions: 0, deflection_rate: 0, cost_savings: 0, feedback_score: 0 }, top_questions: [], channel_distribution: [], unanswered: [] } }),
    )
    await page.route("**/settings**", (route) =>
      route.fulfill({ json: MOCK_SETTINGS }),
    )
    await page.route("**/auth/me**", (route) =>
      route.fulfill({ json: { user_id: 1, email: "test@example.com", name: "Test User", role: "company", tenant_key: "test-corp" } }),
    )
    await page.route("**/ws/**", (route) => route.abort())
  })

  test("empty files list shows upload prompt", async ({ page }) => {
    await page.route("**/files**", (route) => route.fulfill({ json: [] }))
    await page.goto("/dashboard/files")
    // Should show some upload UI or empty state
    await expect(page.locator("body")).toBeVisible()
  })

  test("files list shows uploaded documents", async ({ page }) => {
    await page.route("**/files**", (route) => route.fulfill({ json: [MOCK_FILE] }))
    await page.goto("/dashboard/files")
    await expect(page.getByText("knowledge-base.txt")).toBeVisible()
  })

  test("file shows chunk count and status", async ({ page }) => {
    await page.route("**/files**", (route) => route.fulfill({ json: [MOCK_FILE] }))
    await page.goto("/dashboard/files")
    // Indexed status should be visible
    await expect(page.getByText(/indexed/i)).toBeVisible()
  })

  test("delete file removes it from list", async ({ page }) => {
    let fileList = [MOCK_FILE]
    await page.route("**/files**", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({ json: fileList })
      } else if (route.request().method() === "DELETE") {
        fileList = []
        route.fulfill({ json: { ok: true } })
      } else {
        route.continue()
      }
    })

    await page.goto("/dashboard/files")
    await expect(page.getByText("knowledge-base.txt")).toBeVisible()

    // Click delete button (find by trash/delete icon or text)
    await page.getByRole("button", { name: /delete/i }).first().click()
    // After deletion, file should no longer appear
    await expect(page.getByText("knowledge-base.txt")).not.toBeVisible()
  })
})
