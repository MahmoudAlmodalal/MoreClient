import { requireStripe } from "@/server/core/stripe";
import { prisma } from "@/server/core/db";
import { AppError } from "@/server/core/errors";
import { z } from "zod";

export const createCheckoutSchema = z.object({
  planCode: z.enum(["pro", "scale"]),
  billingPeriod: z.enum(["monthly", "yearly"]).default("monthly"),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;

export async function createCheckoutSession(
  principalType: "company" | "talent",
  principalId: string,
  stripeCustomerId: string | null | undefined,
  input: CreateCheckoutInput,
): Promise<{ url: string }> {
  const s = requireStripe();

  const plan = await prisma.planCatalog.findUnique({
    where: { code: input.planCode },
  });
  if (!plan || !plan.active) {
    throw new AppError("NOT_FOUND", "Plan not found", 404);
  }

  const priceId =
    input.billingPeriod === "yearly" ? plan.stripePriceYearly : plan.stripePriceMonthly;
  if (!priceId) {
    throw new AppError("SERVICE_UNAVAILABLE", "Plan pricing not configured", 503);
  }

  let customerId = stripeCustomerId ?? undefined;

  if (!customerId) {
    // Try to find an existing Stripe customer by metadata to avoid duplicates
    const existing = await s.customers.search({
      query: `metadata["principalId"]:"${principalId}"`,
      limit: 1,
    });
    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
    } else {
      const customer = await s.customers.create({
        metadata: { principalType, principalId },
      });
      customerId = customer.id;
    }

    // Cache the customer ID on the entity — only Company has stripeCustomerId in schema
    if (principalType === "company") {
      await prisma.company.update({ where: { id: principalId }, data: { stripeCustomerId: customerId } });
    }
    // Talent does not have a stripeCustomerId column — resolved via Stripe metadata search
  }

  const session = await s.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: { principalType, principalId, planCode: input.planCode },
    subscription_data: {
      metadata: { principalType, principalId, planCode: input.planCode },
    },
  });

  if (!session.url) throw new AppError("INTERNAL", "Failed to create checkout URL", 500);
  return { url: session.url };
}

export async function createBillingPortalSession(
  stripeCustomerId: string,
  returnUrl: string,
): Promise<{ url: string }> {
  const s = requireStripe();

  const session = await s.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}
