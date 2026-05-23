import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import { createBillingPortalSession } from "@/server/billing/checkout";
import { toProblemJson, toAppError, AppError } from "@/server/core/errors";
import { z } from "zod";

const schema = z.object({ returnUrl: z.string().url() });

export async function POST(request: Request) {
  try {
    const ctx = await requirePrincipal(["company", "talent"]);
    if (ctx.type !== "company" && ctx.type !== "talent") {
      throw new AppError("FORBIDDEN", "Account required", 403);
    }

    const stripeCustomerId =
      ctx.type === "company" ? ctx.company.stripeCustomerId : (ctx.talent as { stripeCustomerId?: string | null }).stripeCustomerId;

    if (!stripeCustomerId) {
      throw new AppError("UNPROCESSABLE", "No billing account found — please subscribe first", 422);
    }

    const body = await request.json();
    const { returnUrl } = schema.parse(body);

    const result = await createBillingPortalSession(stripeCustomerId, returnUrl);
    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
