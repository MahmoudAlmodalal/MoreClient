import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import { ReviewService, postReviewSchema } from "@/server/reviews/service";
import { toProblemJson, toAppError, AppError } from "@/server/core/errors";
import { parseLimit } from "@/server/core/pagination";
import { z } from "zod";

const listSchema = z.object({
  targetId: z.string().uuid(),
  targetType: z.enum(["talent", "company_user"]),
  cursor: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { targetId, targetType, cursor } = listSchema.parse(Object.fromEntries(url.searchParams));
    const limit = parseLimit(url.searchParams.get("limit"), 20, 100);
    const result = await ReviewService.listReviews(targetId, targetType, { cursor, limit });
    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requirePrincipal(["company", "talent"]);
    if (ctx.type !== "company" && ctx.type !== "talent") {
      throw new AppError("FORBIDDEN", "Account required", 403);
    }
    const body = await request.json();
    const input = postReviewSchema.parse(body);
    const review = await ReviewService.postReview(ctx, input);
    return NextResponse.json(review, { status: 201 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
