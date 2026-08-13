import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin, loginAsCompany } from "./helpers";

async function expectNoSeriousAccessibilityViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const seriousViolations = results.violations.filter((violation) =>
    violation.impact === "critical" || violation.impact === "serious",
  );
  expect(seriousViolations).toEqual([]);
}

test.describe("critical accessibility checks", () => {
  test("welcome page has no serious accessibility violations", async ({ page }) => {
    await page.goto("/welcome");
    await expect(page.getByTestId("login-form")).toBeVisible();
    await expectNoSeriousAccessibilityViolations(page);
  });

  test("tenant purchases page has no serious accessibility violations", async ({ page }) => {
    await loginAsCompany(page);
    await page.goto("/dashboard/purchases");
    await expect(page.getByTestId("purchase-status-filter")).toBeVisible();
    await expectNoSeriousAccessibilityViolations(page);
  });

  test("admin console has no serious accessibility violations", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByTestId("admin-active-tenants-kpi")).toBeVisible();
    await expectNoSeriousAccessibilityViolations(page);
  });
});
