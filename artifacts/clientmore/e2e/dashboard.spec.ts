import { test, expect } from "@playwright/test"

const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEsInRpZCI6MSwidGsiOiJ0ZXN0LWNvcnAiLCJyb2xlIjoiY29tcGFueSJ9.test"

const MOCK_ANALYTICS = {
  kpis: { total_questions: 120, deflection_rate: 82.5, cost_savings: 60.0, feedback_score: 4.6 },
  top_questions: [
    { name: "What is your return policy?", count: 15 },
    { name: "How do I track my order?", count: 10 },
  ],
  channel_distribution: [
    { name: "web", value: 80 },
    { name: "telegram", value: 40 },
  ],
  unanswered: [],
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

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Set auth token
    await page.addInitScript((token) => {
      localStorage.setItem("authToken", token)
    }, TOKEN)

    await page.route("**/analytics**", (route) =>
      route.fulfill({ json: MOCK_ANALYTICS }),
    )
    await page.route("**/settings**", (route) =>
      route.fulfill({ json: MOCK_SETTINGS }),
    )
    await page.route("**/handoffs**", (route) =>
      route.fulfill({ json: [] }),
    )
    await page.route("**/files**", (route) =>
      route.fulfill({ json: [] }),
    )
    await page.route("**/ws/**", (route) => route.abort())
    await page.route("**/auth/me**", (route) =>
      route.fulfill({ json: { user_id: 1, email: "test@example.com", name: "Test User", role: "company", tenant_key: "test-corp" } }),
    )
  })

  test("dashboard page loads and shows KPI values", async ({ page }) => {
    await page.goto("/dashboard")
    // KPI cards with the mocked data should be visible
    await expect(page.getByText("120").first()).toBeVisible()
  })

  test("dashboard has navigation links", async ({ page }) => {
    await page.goto("/dashboard")
    // Should have links to sub-pages
    await expect(page.getByRole("link", { name: /files/i }).first()).toBeVisible()
  })

  test("dashboard shows deflection rate", async ({ page }) => {
    await page.goto("/dashboard")
    // 82.5% deflection rate from mock data
    await expect(page.getByText(/82/)).toBeVisible()
  })
})
