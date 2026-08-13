import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";


test.describe("super admin session and tenant lifecycle", () => {
  test("restores admin role before guarding a direct admin deep link", async ({ page }) => {
    await loginAsAdmin(page);
    await page.evaluate(() => window.sessionStorage.removeItem("userRole"));
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByTestId("admin-active-tenants-kpi")).toBeVisible();
    await expect(page.getByTestId("tenant-row-e2e-north")).toBeVisible();
  });

  test("refreshes KPI cards after create, edit, toggle, and delete", async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page.getByTestId("admin-active-tenants-kpi")).toContainText("2");
    await expect(page.getByTestId("admin-mrr-kpi")).toContainText("$2,000");

    await page.getByTestId("admin-provision-tenant").click();
    await page.getByTestId("admin-create-name").fill("Automation E2E Tenant");
    await page.getByTestId("admin-create-email").fill("automation.e2e@example.test");
    await page.getByTestId("admin-create-plan").selectOption("pro");
    await page.getByTestId("admin-create-limit").fill("750");
    await page.getByTestId("admin-create-form").getByRole("button", { name: "Create" }).click();

    await expect(page.getByTestId("admin-active-tenants-kpi")).toContainText("3");
    await expect(page.getByTestId("admin-mrr-kpi")).toContainText("$2,500");
    await expect(page.getByTestId("tenant-row-automation-e2e-tenant")).toBeVisible();

    await page.getByTestId("tenant-edit-automation-e2e-tenant").click();
    await page.getByTestId("admin-edit-plan").selectOption("custom");
    await page.getByTestId("admin-edit-form").getByRole("button", { name: "Save" }).click();

    await expect(page.getByTestId("admin-mrr-kpi")).toContainText("$5,000");

    await page.getByTestId("tenant-toggle-automation-e2e-tenant").click();
    await expect(page.getByTestId("admin-active-tenants-kpi")).toContainText("2");
    await expect(page.getByTestId("admin-mrr-kpi")).toContainText("$2,000");

    await page.getByRole("button", { name: "Delete Automation E2E Tenant" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Automation E2E Tenant");
    await dialog.getByRole("button", { name: "Delete permanently" }).click();

    await expect(page.getByTestId("tenant-row-automation-e2e-tenant")).not.toBeVisible();
    await expect(page.getByTestId("admin-active-tenants-kpi")).toContainText("2");
    await expect(page.getByTestId("admin-mrr-kpi")).toContainText("$2,000");
  });
});
