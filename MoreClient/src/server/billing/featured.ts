import { stripe } from "@/server/core/stripe";
import { prisma } from "@/server/core/db";
import { AppError } from "@/server/core/errors";
import { generateId } from "@/server/core/ids";
import { z } from "zod";

export const featuredPlacementSchema = z.object({
  durationDays: z.enum(["7", "14", "30"]),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export type FeaturedPlacementInput = z.infer<typeof featuredPlacementSchema>;

const FEATURED_PRICE_MAP: Record<string, number> = {
  "7": 4900,   // $49
  "14": 7900,  // $79
  "30": 14900, // $149
};

export async function createFeaturedPlacementCheckout(
  talentId: string,
  clerkUserId: string,
  input: FeaturedPlacementInput,
): Promise<{ url: string }> {
  if (!stripe) throw new AppError("SERVICE_UNAVAILABLE", "Payments not configured", 503);

  const talent = await prisma.talent.findUnique({
    where: { id: talentId },
    select: { displayName: true, handle: true, status: true },
  });
  if (!talent) throw new AppError("NOT_FOUND", "Talent not found", 404);
  if (talent.status !== "active") throw new AppError("FORBIDDEN", "Account is not active", 403);

  const amountCents = FEATURED_PRICE_MAP[input.durationDays];
  const days = parseInt(input.durationDays);

  const existingCustomers = await stripe.customers.search({
    query: `metadata["talentId"]:"${talentId}"`,
    limit: 1,
  });

  let customerId: string;
  if (existingCustomers.data.length > 0) {
    customerId = existingCustomers.data[0].id;
  } else {
    const customer = await stripe.customers.create({
      metadata: { talentId, clerkUserId, type: "talent_featured" },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: `Featured Profile — ${days} days`,
            description: `Your profile will appear at the top of search results for ${days} days`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      type: "featured_placement",
      talentId,
      durationDays: input.durationDays,
    },
  });

  if (!session.url) throw new AppError("INTERNAL", "Failed to create checkout URL", 500);
  return { url: session.url };
}

/**
 * Called by the Stripe webhook on `checkout.session.completed`
 * to activate the featured placement.
 */
export async function activateFeaturedPlacement(
  talentId: string,
  durationDays: number,
): Promise<void> {
  const now = new Date();
  const current = await prisma.talent.findUnique({
    where: { id: talentId },
    select: { featuredUntil: true },
  });

  // Extend from current expiry or now, whichever is later
  const base = current?.featuredUntil && current.featuredUntil > now ? current.featuredUntil : now;
  const featuredUntil = new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000);

  await prisma.talent.update({
    where: { id: talentId },
    data: { featuredUntil },
  });

  await prisma.featuredPlacement.create({
    data: {
      id: generateId(),
      principalType: "talent",
      principalId: talentId,
      position: 0,
      startsAt: now,
      endsAt: featuredUntil,
      createdBy: talentId,
    },
  });
}
