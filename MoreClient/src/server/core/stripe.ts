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
    apiVersion: "2024-12-18.acacia",
    typescript: true,
  });
}

export const stripe = createStripeClient();

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
