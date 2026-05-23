import { NextResponse } from "next/server";
import { requireRole } from "@/server/core/auth";
import { fundMilestone } from "@/server/billing/milestones";
import { toProblemJson, toAppError } from "@/server/core/errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string }> },
) {
  try {
    const { id, milestoneId } = await params;
    const ctx = await requireRole("recruiter");

    const result = await fundMilestone(ctx, id, milestoneId);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
