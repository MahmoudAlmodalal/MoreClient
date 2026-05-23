import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import { ProposalService } from "@/server/proposals/service";
import { submitProposalSchema, listProposalsQuerySchema } from "@/schemas/proposal";
import { toProblemJson, toAppError, AppError } from "@/server/core/errors";
import { writeAudit, auditContextFromPrincipal } from "@/server/audit";
import { checkRateLimit } from "@/server/core/rate-limit";

export async function GET(request: Request) {
  try {
    const ctx = await requirePrincipal(["company", "talent"]);
    if (ctx.type !== "company" && ctx.type !== "talent") {
      throw new AppError("FORBIDDEN", "Access denied", 403);
    }

    const url = new URL(request.url);
    const raw = Object.fromEntries(url.searchParams.entries());
    const query = listProposalsQuerySchema.parse({
      ...raw,
      limit: raw.limit ? Number(raw.limit) : 20,
    });

    const result = await ProposalService.listProposals(query, ctx);
    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requirePrincipal(["talent"]);
    if (ctx.type !== "talent") throw new AppError("FORBIDDEN", "Talent account required", 403);

    await checkRateLimit("proposalSubmit", ctx.talent.id);

    const body = await request.json();
    const input = submitProposalSchema.parse(body);
    const proposal = await ProposalService.submitProposal(ctx, input);

    await writeAudit(auditContextFromPrincipal(ctx, request), "proposal.submit", "Proposal", proposal.id);

    return NextResponse.json(proposal, { status: 201 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
