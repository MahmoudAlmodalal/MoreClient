import { inngest } from "../client";
import { logger } from "@/server/core/logger";

/** Stub: roll up daily platform metrics into PlatformDailyMetrics (Phase 3+). */
export const rollupDailyAnalytics = inngest.createFunction(
  { id: "analytics.rollup-daily", name: "Rollup Daily Analytics" },
  { cron: "0 1 * * *" },
  async ({ step }) => {
    await step.run("log-receipt", () => {
      logger.info("analytics.rollup-daily fired — stub, skipping aggregation until Phase 3");
    });
    return { skipped: true };
  },
);
