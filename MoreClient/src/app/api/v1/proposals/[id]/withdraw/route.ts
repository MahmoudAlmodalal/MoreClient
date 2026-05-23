import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import { ProposalService } from "@/server/proposals/service";
import { toProblemJson, toAppError, AppError } from "@/server/core/errors";
import { writeAudit, auditContextFromPrincipal } from "@/server/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ctx = await requirePrincipal(["talent"]);
    if (ctx.type !== "talent") throw new AppError("FORBIDDEN", "Talent account required", 403);

    await ProposalService.withdrawProposal(ctx, id);
    await writeAudit(auditContextFromPrincipal(ctx, request), "proposal.withdraw", "Proposal", id);

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
