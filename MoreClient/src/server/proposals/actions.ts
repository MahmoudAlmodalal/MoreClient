"use server";

import { requirePrincipal, requireRole } from "../core/auth";
import { ProposalService } from "./service";
import { toAppError, AppError } from "../core/errors";
import { submitProposalSchema } from "@/schemas/proposal";
import { writeAudit, auditContextFromPrincipal } from "../audit";
import { checkRateLimit } from "../core/rate-limit";

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };

export async function submitProposalAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePrincipal(["talent"]);
    if (ctx.type !== "talent") throw new AppError("FORBIDDEN", "Talent account required", 403);

    await checkRateLimit("proposalSubmit", ctx.talent.id);

    const input = submitProposalSchema.parse(rawInput);
    const proposal = await ProposalService.submitProposal(ctx, input);
    await writeAudit(auditContextFromPrincipal(ctx), "proposal.submit", "Proposal", proposal.id);
    return { success: true, data: { id: proposal.id } };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}

export async function withdrawProposalAction(proposalId: string): Promise<ActionResult> {
  try {
    const ctx = await requirePrincipal(["talent"]);
    if (ctx.type !== "talent") throw new AppError("FORBIDDEN", "Talent account required", 403);
    await ProposalService.withdrawProposal(ctx, proposalId);
    await writeAudit(auditContextFromPrincipal(ctx), "proposal.withdraw", "Proposal", proposalId);
    return { success: true };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}

export async function shortlistProposalAction(proposalId: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("recruiter");
    await ProposalService.shortlistProposal(ctx, proposalId);
    await writeAudit(auditContextFromPrincipal(ctx), "proposal.shortlist", "Proposal", proposalId);
    return { success: true };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}

export async function rejectProposalAction(proposalId: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("recruiter");
    await ProposalService.rejectProposal(ctx, proposalId);
    await writeAudit(auditContextFromPrincipal(ctx), "proposal.reject", "Proposal", proposalId);
    return { success: true };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}
