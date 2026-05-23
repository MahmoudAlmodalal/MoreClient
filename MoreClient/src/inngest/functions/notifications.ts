import { inngest } from "../client";
import { logger } from "@/server/core/logger";

/**
 * Weekly digest notification stub.
 * Phase 6 will implement actual Resend email sending.
 */
export const weeklyDigest = inngest.createFunction(
  { id: "notifications.weekly-digest", name: "Weekly Digest (stub)" },
  { cron: "0 9 * * 1" }, // Every Monday 9am UTC
  async ({ step }) => {
    await step.run("log-stub", async () => {
      logger.info("weekly-digest: stub — email sending wired in Phase 6");
    });

    return { sent: false, reason: "stub — Phase 6 will implement Resend sending" };
  },
);
