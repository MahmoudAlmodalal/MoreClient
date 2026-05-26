import { test, expect } from "@playwright/test"

const MOCK_AUTH_RESPONSE = {
  token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEsInRpZCI6MSwidGsiOiJ0ZXN0LWNvcnAiLCJyb2xlIjoiY29tcGFueSJ9.test",
  user_id: 1,
  email: "test@example.com",
  name: "Test User",
  role: "company",
  redirect_to: "/dashboard",
  tenant_key: "test-corp",
}

const MOCK_ANALYTICS = {
  kpis: { total_questions: 42, deflection_rate: 78.5, cost_savings: 21.0, feedback_score: 4.2 },
  top_questions: [],
  channel_distribution: [],
  unanswered: [],
}

const MOCK_SETTINGS = {
  tenant_key: "test-corp",
  company_name: "Test Corp",
  bot_name: "Aria",
  company_logo: null,
  bot_tone: "professional",
  system_prompt_extra: null,
  telegram_token: null,
  is_telegram_active: false,
  twilio_sid: null,
  twilio_token: null,
  twilio_number: null,
  is_whatsapp_active: false,
  subscription_plan: "pro",
  confidence_threshold: 0.35,
  purchase_flow_enabled: false,
  purchase_collect_address: false,
  purchase_collect_quantity: true,
  purchase_auto_forward_to_support: false,
  purchase_confirmation_required: true,
  purchase_session_minutes: 30,
  purchase_currency_label: null,
  intent_llm_enabled: false,
  intent_confidence_threshold: 0.6,
  auto_handoff_on_complaint: false,
  used_messages: 0,
}

test.describe("Auth Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Mock all API endpoints
    await page.route("**/auth/login", (route) =>
      route.fulfill({ json: MOCK_AUTH_RESPONSE }),
    )
    await page.route("**/auth/me", (route) =>
      route.fulfill({ json: { user_id: 1, email: "test@example.com", name: "Test User", role: "company", tenant_key: "test-corp" } }),
    )
    await page.route("**/analytics**", (route) =>
      route.fulfill({ json: MOCK_ANALYTICS }),
    )
    await page.route("**/settings**", (route) =>
      route.fulfill({ json: MOCK_SETTINGS }),
    )
    await page.route("**/ws/**", (route) => route.abort())
  })

  test("login page renders sign-in elements", async ({ page }) => {
    await page.goto("/welcome")
    // The login view has Sign In and Create New Account links
    await expect(page.getByText(/sign in/i).first()).toBeVisible()
  })

  test("successful login redirects to dashboard", async ({ page }) => {
    await page.goto("/welcome")

    // Fill login form
    await page.getByPlaceholder(/email/i).fill("test@example.com")
    await page.getByPlaceholder(/password/i).fill("password123")
    await page.getByRole("button", { name: /sign in/i }).click()

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test("sign-up page is reachable from welcome", async ({ page }) => {
    await page.route("**/auth/register", (route) =>
      route.fulfill({ json: MOCK_AUTH_RESPONSE }),
    )
    await page.goto("/welcome")
    await page.getByText(/create new account/i).click()
    await expect(page).toHaveURL(/\/sign-up/)
  })
})
