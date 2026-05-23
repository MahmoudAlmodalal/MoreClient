import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import { submitMilestone } from "@/server/billing/milestones";
import { toProblemJson, toAppError, AppError } from "@/server/core/errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string }> },
) {
  try {
    const { id, milestoneId } = await params;
    const ctx = await requirePrincipal(["talent"]);
    if (ctx.type !== "talent") throw new AppError("FORBIDDEN", "Talent account required", 403);

    await submitMilestone(ctx, id, milestoneId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
