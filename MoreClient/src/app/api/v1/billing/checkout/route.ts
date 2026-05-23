import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import { createCheckoutSession, createCheckoutSchema } from "@/server/billing/checkout";
import { toProblemJson, toAppError, AppError } from "@/server/core/errors";

export async function POST(request: Request) {
  try {
    const ctx = await requirePrincipal(["company", "talent"]);
    if (ctx.type !== "company" && ctx.type !== "talent") {
      throw new AppError("FORBIDDEN", "Company or talent account required", 403);
    }

    const body = await request.json();
    const input = createCheckoutSchema.parse(body);

    const principalType = ctx.type;
    const principalId = ctx.type === "company" ? ctx.company.id : ctx.talent.id;
    const stripeCustomerId =
      ctx.type === "company" ? ctx.company.stripeCustomerId : ctx.talent.stripeCustomerId ?? null;

    const result = await createCheckoutSession(principalType, principalId, stripeCustomerId, input);
    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
