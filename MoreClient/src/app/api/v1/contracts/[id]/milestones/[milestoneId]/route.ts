import { NextResponse } from "next/server";
import { requireRole } from "@/server/core/auth";
import { ContractService } from "@/server/contracts/service";
import { updateMilestoneSchema } from "@/schemas/contract";
import { toProblemJson, toAppError } from "@/server/core/errors";
import { writeAudit, auditContextFromPrincipal } from "@/server/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string }> },
) {
  try {
    const { id, milestoneId } = await params;
    const ctx = await requireRole("recruiter");

    const body = await request.json();
    const input = updateMilestoneSchema.parse(body);
    const milestone = await ContractService.updateMilestone(ctx, id, milestoneId, input);

    await writeAudit(
      auditContextFromPrincipal(ctx, request),
      "milestone.update",
      "Milestone",
      milestoneId,
    );

    return NextResponse.json(milestone);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string }> },
) {
  try {
    const { id, milestoneId } = await params;
    const ctx = await requireRole("admin");

    await ContractService.deleteMilestone(ctx, id, milestoneId);
    await writeAudit(
      auditContextFromPrincipal(ctx, request),
      "milestone.delete",
      "Milestone",
      milestoneId,
    );

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
