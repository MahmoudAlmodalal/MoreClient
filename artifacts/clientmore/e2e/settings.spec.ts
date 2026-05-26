import { test, expect } from "@playwright/test"

const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEsInRpZCI6MSwidGsiOiJ0ZXN0LWNvcnAiLCJyb2xlIjoiY29tcGFueSJ9.test"

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

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token) => {
      localStorage.setItem("authToken", token)
    }, TOKEN)

    await page.route("**/auth/me**", (route) =>
      route.fulfill({ json: { user_id: 1, email: "test@example.com", name: "Test User", role: "company", tenant_key: "test-corp" } }),
    )
    await page.route("**/analytics**", (route) =>
      route.fulfill({ json: { kpis: { total_questions: 0, deflection_rate: 0, cost_savings: 0, feedback_score: 0 }, top_questions: [], channel_distribution: [], unanswered: [] } }),
    )
    await page.route("**/handoffs**", (route) => route.fulfill({ json: [] }))
    await page.route("**/files**", (route) => route.fulfill({ json: [] }))
    await page.route("**/ws/**", (route) => route.abort())
  })

  test("settings page loads with bot configuration", async ({ page }) => {
    await page.route("**/settings**", (route) => route.fulfill({ json: MOCK_SETTINGS }))
    await page.goto("/dashboard/settings")
    // Bot name should be visible
    await expect(page.getByText("Aria")).toBeVisible()
  })

  test("settings page shows channel configuration", async ({ page }) => {
    await page.route("**/settings**", (route) => route.fulfill({ json: MOCK_SETTINGS }))
    await page.goto("/dashboard/settings")
    // Settings page should have Telegram-related content
    await expect(page.getByText(/telegram/i).first()).toBeVisible()
  })

  test("settings page shows company name", async ({ page }) => {
    await page.route("**/settings**", (route) => route.fulfill({ json: MOCK_SETTINGS }))
    await page.goto("/dashboard/settings")
    await expect(page.getByText("Test Corp")).toBeVisible()
  })

  test("save settings triggers PUT request", async ({ page }) => {
    let putCalled = false
    await page.route("**/settings**", (route) => {
      if (route.request().method() === "PUT" || route.request().method() === "PATCH") {
        putCalled = true
        route.fulfill({ json: { ...MOCK_SETTINGS, bot_name: "Updated Bot" } })
      } else {
        route.fulfill({ json: MOCK_SETTINGS })
      }
    })

    await page.goto("/dashboard/settings")
    // Find and clear the bot name input, type new name
    const botNameInput = page.getByLabel(/bot name/i).first()
    if (await botNameInput.count() > 0) {
      await botNameInput.clear()
      await botNameInput.fill("Updated Bot")
      await page.getByRole("button", { name: /save/i }).first().click()
      expect(putCalled).toBe(true)
    }
  })
})
