import { NextResponse } from "next/server";
import { requireRole } from "@/server/core/auth";
import { ProposalService } from "@/server/proposals/service";
import { toProblemJson, toAppError } from "@/server/core/errors";
import { writeAudit, auditContextFromPrincipal } from "@/server/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ctx = await requireRole("recruiter");
    await ProposalService.rejectProposal(ctx, id);
    await writeAudit(auditContextFromPrincipal(ctx, request), "proposal.reject", "Proposal", id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
