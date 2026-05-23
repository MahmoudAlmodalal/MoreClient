import { inngest } from "../client";
import { logger } from "@/server/core/logger";
import { syncSubscription } from "@/server/billing/plans";
import { prisma } from "@/server/core/db";
import { rollupDailyMetrics } from "@/server/analytics/platform";

/** Sync a Stripe subscription to the DB and update planCode. */
export const syncSubscriptionFn = inngest.createFunction(
  { id: "billing.sync-subscription", name: "Sync Subscription" },
  { event: "billing/subscription-updated" },
  async ({ event, step }) => {
    const data = event.data as {
      stripeSubId: string;
      customerId: string;
      planCode: string;
      principalType?: string;
      principalId?: string;
      status: string;
      currentPeriodStart: string;
      currentPeriodEnd: string;
      cancelAtPeriodEnd: boolean;
    };

    await step.run("sync", async () => {
      await syncSubscription(data);
    });

    logger.info({ stripeSubId: data.stripeSubId, planCode: data.planCode }, "subscription synced");
    return { stripeSubId: data.stripeSubId, planCode: data.planCode };
  },
);

/** Daily commission reconciliation cron. */
export const reconcileCommissions = inngest.createFunction(
  { id: "billing.reconcile-commissions", name: "Reconcile Daily Commissions" },
  { cron: "0 2 * * *" },
  async ({ step }) => {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    const metrics = await step.run("rollup", async () => {
      return rollupDailyMetrics(yesterday);
    });

    logger.info(
      { day: yesterday.toISOString().split("T")[0], gmvCents: metrics.gmvCents.toString() },
      "commission reconciliation complete",
    );

    return { day: yesterday.toISOString().split("T")[0], gmvCents: metrics.gmvCents.toString() };
  },
);
