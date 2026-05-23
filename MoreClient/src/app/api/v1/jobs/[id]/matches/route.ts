import { NextResponse } from "next/server";
import { requireRole } from "@/server/core/auth";
import { getJobMatches } from "@/server/ai/matching";
import { JobRepo } from "@/server/jobs/repo";
import { toProblemJson, toAppError, AppError } from "@/server/core/errors";
import { parseLimit } from "@/server/core/pagination";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ctx = await requireRole("viewer");

    // Only the owning company can see matches
    const job = await JobRepo.findById(id);
    if (!job) throw new AppError("NOT_FOUND", "Job not found", 404);
    if (job.companyId !== ctx.company.id) throw new AppError("FORBIDDEN", "Access denied", 403);

    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"), 25, 50);

    const matches = await getJobMatches(id, limit);

    return NextResponse.json({ items: matches, total: matches.length });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
