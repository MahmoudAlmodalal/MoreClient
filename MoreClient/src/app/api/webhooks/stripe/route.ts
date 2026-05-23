import { NextResponse } from "next/server";
import { handleStripeWebhook } from "@/server/billing/webhook";
import { toProblemJson, AppError } from "@/server/core/errors";
import { logger } from "@/server/core/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      const err = new AppError("BAD_REQUEST", "Missing stripe-signature header", 400);
      return NextResponse.json(toProblemJson(err, request.url), { status: 400 });
    }

    const result = await handleStripeWebhook(body, signature);
    return NextResponse.json(result);
  } catch (err) {
    logger.error({ err }, "stripe webhook error");
    const appErr = new AppError("BAD_REQUEST", "Webhook processing failed", 400);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: 400 });
  }
}
