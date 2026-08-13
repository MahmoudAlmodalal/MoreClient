import { expect, type Page } from "@playwright/test";

export const BACKEND_URL = process.env.E2E_BACKEND_URL ?? "http://127.0.0.1:8000";

export const USERS = {
  admin: { email: "e2e.admin@example.test", password: "E2eAdmin!2026" },
  north: { email: "e2e.north@example.test", password: "E2eNorth!2026" },
  south: { email: "e2e.south@example.test", password: "E2eSouth!2026" },
} as const;

export async function loginAs(
  page: Page,
  user: (typeof USERS)[keyof typeof USERS],
): Promise<void> {
  await page.goto("/welcome");
  await page.getByTestId("login-email").fill(user.email);
  await page.getByTestId("login-password").fill(user.password);
  await page.getByTestId("login-submit").click();
}

export async function loginAsCompany(page: Page): Promise<void> {
  await loginAs(page, USERS.north);
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await loginAs(page, USERS.admin);
  await expect(page).toHaveURL(/\/admin$/);
  await page.evaluate(() => window.sessionStorage.setItem("adminKey", "e2e-admin-key"));
  await page.reload();
  await expect(page.getByTestId("admin-active-tenants-kpi")).toBeVisible();
}

export async function kpiValue(page: Page, testId: string): Promise<string> {
  return (await page.getByTestId(testId).locator("p").nth(1).textContent())?.trim() ?? "";
}
