import { NextResponse } from "next/server";
import { requireRole } from "@/server/core/auth";
import { ContractService } from "@/server/contracts/service";
import { addMilestoneSchema } from "@/schemas/contract";
import { toProblemJson, toAppError } from "@/server/core/errors";
import { writeAudit, auditContextFromPrincipal } from "@/server/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ctx = await requireRole("recruiter");

    const body = await request.json();
    const input = addMilestoneSchema.parse(body);
    const milestone = await ContractService.addMilestone(ctx, id, input);

    await writeAudit(
      auditContextFromPrincipal(ctx, request),
      "milestone.add",
      "Milestone",
      milestone.id,
      { contractId: id },
    );

    return NextResponse.json(milestone, { status: 201 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
