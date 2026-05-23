import Stripe from "stripe";

function createStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }
    return null;
  }

  return new Stripe(key, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });
}

export const stripe = createStripeClient();

/**
 * Return the configured Stripe client, throwing if payments are not configured.
 * Use in code paths that cannot proceed without Stripe (checkout, payouts, etc.).
 */
export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error("Stripe is not configured (missing STRIPE_SECRET_KEY)");
  }
  return stripe;
}

/**
 * Compute the platform fee (in cents) from an amount and a fee in basis points.
 * e.g. calcPlatformFee(10000, 1000) === 1000 (10% of $100.00).
 */
export function calcPlatformFee(amountCents: number, bps: number): number {
  return Math.round((amountCents * bps) / 10000);
}

/** Verify a Stripe webhook signature and return the parsed event. */
export function constructStripeEvent(
  body: string | Buffer,
  signature: string,
): Stripe.Event {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  return stripe.webhooks.constructEvent(body, signature, secret);
}
