import { NextResponse } from "next/server";
import { requirePrincipal, requireRole } from "@/server/core/auth";
import { JobService } from "@/server/jobs/service";
import { createJobSchema, listJobsQuerySchema } from "@/schemas/job";
import { toProblemJson, toAppError, AppError } from "@/server/core/errors";
import { writeAudit, auditContextFromPrincipal } from "@/server/audit";
import { checkRateLimit } from "@/server/core/rate-limit";
import { parseLimit } from "@/server/core/pagination";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const raw = Object.fromEntries(url.searchParams.entries());
    const query = listJobsQuerySchema.parse({
      ...raw,
      limit: raw.limit ? Number(raw.limit) : 20,
    });

    const result = await JobService.listJobs({
      ...query,
      status: query.status ?? "published",
    });

    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole("recruiter");
    await checkRateLimit("jobPost", ctx.company.id);

    const body = await request.json();
    const input = createJobSchema.parse(body);
    const job = await JobService.createJob(ctx, input);

    await writeAudit(auditContextFromPrincipal(ctx, request), "job.create", "Job", job.id);

    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
