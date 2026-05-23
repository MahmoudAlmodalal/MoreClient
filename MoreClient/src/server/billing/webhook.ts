import { constructStripeEvent } from "@/server/core/stripe";
import { prisma } from "@/server/core/db";
import { inngest } from "@/inngest/client";
import { logger } from "@/server/core/logger";
import { activateFeaturedPlacement } from "@/server/billing/featured";
import type Stripe from "stripe";

export async function handleStripeWebhook(
  body: string,
  signature: string,
): Promise<{ received: boolean }> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");

  let event: Stripe.Event;
  try {
    event = constructStripeEvent(body, signature);
  } catch (err) {
    logger.warn({ err }, "stripe webhook signature verification failed");
    throw err;
  }

  logger.info({ type: event.type, id: event.id }, "stripe webhook received");

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await inngest.send({
        name: "billing/subscription-updated",
        data: {
          stripeSubId: sub.id,
          customerId: sub.customer as string,
          planCode: sub.metadata?.planCode ?? "free",
          principalType: sub.metadata?.principalType,
          principalId: sub.metadata?.principalId,
          status: sub.status,
          currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await inngest.send({
        name: "billing/subscription-updated",
        data: {
          stripeSubId: sub.id,
          customerId: sub.customer as string,
          planCode: "free",
          principalType: sub.metadata?.principalType,
          principalId: sub.metadata?.principalId,
          status: "canceled",
          currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: false,
        },
      });
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      logger.info({ invoiceId: invoice.id, amount: invoice.amount_paid }, "invoice paid");
      break;
    }

    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      const talentId = account.metadata?.talentId;
      if (talentId) {
        await prisma.talent.update({
          where: { id: talentId },
          data: {
            payoutsEnabled: account.payouts_enabled ?? false,
          },
        });
        logger.info({ talentId, payoutsEnabled: account.payouts_enabled }, "connect account updated");
      }
      break;
    }

    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.type === "featured_placement") {
        const { talentId, durationDays } = session.metadata;
        if (talentId && durationDays) {
          await activateFeaturedPlacement(talentId, parseInt(durationDays));
          logger.info({ talentId, durationDays }, "featured placement activated");
        }
      }
      break;
    }

    default:
      logger.debug({ type: event.type }, "unhandled stripe event");
  }

  return { received: true };
}
