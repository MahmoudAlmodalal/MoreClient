import { NextResponse } from "next/server";
import { requireRole } from "@/server/core/auth";
import { JobService } from "@/server/jobs/service";
import { toProblemJson, toAppError } from "@/server/core/errors";
import { writeAudit, auditContextFromPrincipal } from "@/server/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ctx = await requireRole("recruiter");
    const job = await JobService.closeJob(ctx, id);
    await writeAudit(auditContextFromPrincipal(ctx, request), "job.close", "Job", id);
    return NextResponse.json(job);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
