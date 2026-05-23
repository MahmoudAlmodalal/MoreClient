import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import {
  createFeaturedPlacementCheckout,
  featuredPlacementSchema,
} from "@/server/billing/featured";
import { toProblemJson, toAppError, AppError } from "@/server/core/errors";

export async function POST(request: Request) {
  try {
    const ctx = await requirePrincipal(["talent"]);
    if (ctx.type !== "talent") {
      throw new AppError("FORBIDDEN", "Only talent accounts can purchase featured placement", 403);
    }
    const body = await request.json();
    const input = featuredPlacementSchema.parse(body);
    const result = await createFeaturedPlacementCheckout(
      ctx.talent.id,
      ctx.clerkUserId,
      input,
    );
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
