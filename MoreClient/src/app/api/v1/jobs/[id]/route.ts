import { NextResponse } from "next/server";
import { requirePrincipal, requireRole } from "@/server/core/auth";
import { JobService } from "@/server/jobs/service";
import { updateJobSchema } from "@/schemas/job";
import { toProblemJson, toAppError } from "@/server/core/errors";
import { writeAudit, auditContextFromPrincipal } from "@/server/audit";
import { checkRateLimit } from "@/server/core/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const job = await JobService.getJob(id);
    return NextResponse.json(job);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ctx = await requireRole("recruiter");
    await checkRateLimit("principalDefault", ctx.company.id);

    const body = await request.json();
    const input = updateJobSchema.parse(body);
    const job = await JobService.updateJob(ctx, id, input);

    await writeAudit(auditContextFromPrincipal(ctx, request), "job.update", "Job", id);

    return NextResponse.json(job);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ctx = await requireRole("admin");

    await JobService.deleteJob(ctx, id);
    await writeAudit(auditContextFromPrincipal(ctx, request), "job.delete", "Job", id);

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
