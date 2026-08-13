import { test, expect } from "@playwright/test";
import { BACKEND_URL, loginAsCompany } from "./helpers";


test.describe("authentication and tenant-scoped purchases", () => {
  test("shows an explicit error for invalid credentials", async ({ page }) => {
    await page.goto("/welcome");
    await page.getByTestId("login-email").fill("unknown@example.test");
    await page.getByTestId("login-password").fill("wrong-password");
    await page.getByTestId("login-submit").click();

    await expect(page.getByTestId("login-error")).toContainText("Invalid email or password");
    await expect(page).toHaveURL(/\/welcome$/);
  });

  test("isolates orders, filters status, updates a status, and blocks cross-tenant mutation", async ({ page }) => {
    await loginAsCompany(page);
    await page.goto("/dashboard/purchases");

    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(2);
    await expect(page.getByText("Starter package")).toBeVisible();
    await expect(page.getByText("Premium package")).toBeVisible();
    await expect(page.getByText("South-only package")).not.toBeVisible();

    await page.getByTestId("purchase-status-filter").selectOption("pending");
    await expect(rows).toHaveCount(1);
    await expect(page.getByText("Starter package")).toBeVisible();
    await expect(page.getByText("Premium package")).not.toBeVisible();

    const starterStatus = page.getByTestId("purchase-status-1");
    await starterStatus.selectOption("forwarded");
    await expect(starterStatus).toHaveValue("forwarded");
    await starterStatus.selectOption("pending");
    await expect(starterStatus).toHaveValue("pending");

    const token = await page.evaluate(() => window.localStorage.getItem("authToken"));
    expect(token).toBeTruthy();
    const crossTenantResponse = await page.request.post(`${BACKEND_URL}/api/purchases/3/status`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: "forwarded" },
    });
    expect(crossTenantResponse.status()).toBe(404);
  });
});
