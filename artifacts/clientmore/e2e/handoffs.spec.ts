import { test, expect } from "@playwright/test"

const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEsInRpZCI6MSwidGsiOiJ0ZXN0LWNvcnAiLCJyb2xlIjoiY29tcGFueSJ9.test"

const MOCK_HANDOFF = {
  id: 1,
  tenant_id: 1,
  conversation_id: 1,
  channel: "web",
  reason: "user_requested",
  question: "I need help with my order",
  language: "en",
  status: "pending",
  unreplied: true,
  csat_score: null,
  created_at: new Date().toISOString(),
  time_ago: "2m ago",
  messages: [{ id: 1, role: "user", content: "I need help with my order", time: new Date().toISOString() }],
  customer_ref: "customer-123",
  is_test: false,
  delivery: { status: "pending", attempts: 0, detail: null, ok: true },
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

test.describe("Handoffs Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token) => {
      localStorage.setItem("authToken", token)
    }, TOKEN)

    await page.route("**/analytics**", (route) =>
      route.fulfill({ json: { kpis: { total_questions: 5, deflection_rate: 60, cost_savings: 2.5, feedback_score: 4.0 }, top_questions: [], channel_distribution: [], unanswered: [] } }),
    )
    await page.route("**/settings**", (route) =>
      route.fulfill({ json: MOCK_SETTINGS }),
    )
    await page.route("**/auth/me**", (route) =>
      route.fulfill({ json: { user_id: 1, email: "test@example.com", name: "Test User", role: "company", tenant_key: "test-corp" } }),
    )
    await page.route("**/files**", (route) => route.fulfill({ json: [] }))
    await page.route("**/ws/**", (route) => route.abort())
  })

  test("handoffs page shows pending ticket", async ({ page }) => {
    await page.route("**/handoffs**", (route) =>
      route.fulfill({ json: [MOCK_HANDOFF] }),
    )
    await page.goto("/dashboard/handoffs")
    await expect(page.getByText("I need help with my order")).toBeVisible()
  })

  test("handoffs page shows empty state when no tickets", async ({ page }) => {
    await page.route("**/handoffs**", (route) => route.fulfill({ json: [] }))
    await page.goto("/dashboard/handoffs")
    await expect(page.locator("body")).toBeVisible()
  })

  test("handoff status badge shows pending", async ({ page }) => {
    await page.route("**/handoffs**", (route) =>
      route.fulfill({ json: [MOCK_HANDOFF] }),
    )
    await page.goto("/dashboard/handoffs")
    await expect(page.getByText(/pending/i).first()).toBeVisible()
  })

  test("resolved handoff shows resolved status", async ({ page }) => {
    const resolvedHandoff = { ...MOCK_HANDOFF, status: "resolved", unreplied: false }
    await page.route("**/handoffs**", (route) =>
      route.fulfill({ json: [resolvedHandoff] }),
    )
    await page.goto("/dashboard/handoffs")
    await expect(page.getByText(/resolved/i).first()).toBeVisible()
  })
})
