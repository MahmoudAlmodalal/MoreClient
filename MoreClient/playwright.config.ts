import { defineConfig, devices } from "@playwright/test";

const frontendUrl = process.env.E2E_BASE_URL ?? "http://localhost:5001";
const databaseUrl = process.env.E2E_DATABASE_URL ?? "sqlite:////tmp/moreclient-e2e.sqlite3";
const reuseExistingServer = process.env.E2E_REUSE_SERVER === "1";

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]] : "list",
  use: {
    baseURL: frontendUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    testIdAttribute: "data-testid",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: `cd .. && E2E_DATABASE_URL=${databaseUrl} python3 e2e/seed.py && ENV=prod APP_SECRET=e2e-app-secret ADMIN_API_KEY=e2e-admin-key DATABASE_URL=${databaseUrl} FRONTEND_URL=${frontendUrl} python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000`,
      url: "http://127.0.0.1:8000/health",
      timeout: 120_000,
      reuseExistingServer,
    },
    {
      command: "pnpm run dev",
      url: `${frontendUrl}/welcome`,
      timeout: 120_000,
      reuseExistingServer,
    },
  ],
});
