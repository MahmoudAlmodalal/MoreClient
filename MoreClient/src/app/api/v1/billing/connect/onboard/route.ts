import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import { createConnectOnboardingLink } from "@/server/billing/connect";
import { toProblemJson, toAppError, AppError } from "@/server/core/errors";
import { z } from "zod";

const schema = z.object({
  returnUrl: z.string().url(),
  refreshUrl: z.string().url(),
  email: z.string().email().optional(),
});

export async function POST(request: Request) {
  try {
    const ctx = await requirePrincipal(["talent"]);
    if (ctx.type !== "talent") throw new AppError("FORBIDDEN", "Talent account required", 403);

    const body = await request.json();
    const input = schema.parse(body);

    const result = await createConnectOnboardingLink(
      ctx.talent.id,
      ctx.clerkUserId,
      input.email,
      input.returnUrl,
      input.refreshUrl,
    );

    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
