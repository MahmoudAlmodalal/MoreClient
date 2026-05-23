import { ProposalRepo, type ProposalWithRelations } from "./repo";
import { JobRepo } from "../jobs/repo";
import { AppError } from "../core/errors";
import { checkProposalEntitlement, incrementProposalCounter } from "../core/entitlements";
import { inngest } from "@/inngest/client";
import type { CompanyContext, TalentContext } from "../core/auth";
import type { SubmitProposalInput, ListProposalsQuery } from "@/schemas/proposal";

export class ProposalService {
  static async getProposal(
    id: string,
    ctx: CompanyContext | TalentContext,
  ): Promise<ProposalWithRelations> {
    const proposal = await ProposalRepo.findById(id);
    if (!proposal) throw new AppError("NOT_FOUND", "Proposal not found", 404);

    if (ctx.type === "talent") {
      if (proposal.talentId !== ctx.talent.id) {
        throw new AppError("FORBIDDEN", "Access denied", 403);
      }
    } else {
      if (proposal.job.companyId !== ctx.company.id) {
        throw new AppError("FORBIDDEN", "Access denied", 403);
      }
    }

    return proposal;
  }

  static async listProposals(
    query: ListProposalsQuery,
    ctx: CompanyContext | TalentContext,
  ): Promise<{ items: ProposalWithRelations[]; hasMore: boolean; nextCursor: string | null }> {
    const safeQuery: typeof query = ctx.type === "talent"
      ? { ...query, talentId: ctx.talent.id, jobId: undefined }
      : { ...query };

    if (ctx.type === "company") {
      if (safeQuery.jobId) {
        const job = await JobRepo.findById(safeQuery.jobId);
        if (!job || job.companyId !== ctx.company.id) {
          throw new AppError("FORBIDDEN", "Access denied", 403);
        }
      }
    }

    return ProposalRepo.list(safeQuery);
  }

  static async submitProposal(
    ctx: TalentContext,
    input: SubmitProposalInput,
  ): Promise<ProposalWithRelations> {
    const job = await JobRepo.findById(input.jobId);
    if (!job) throw new AppError("NOT_FOUND", "Job not found", 404);
    if (job.status !== "published") {
      throw new AppError("UNPROCESSABLE", "This job is not accepting proposals", 422);
    }

    const existing = await ProposalRepo.findByJobAndTalent(input.jobId, ctx.talent.id);
    if (existing) {
      throw new AppError("CONFLICT", "You have already submitted a proposal for this job", 409);
    }

    await checkProposalEntitlement(ctx.talent.id, ctx.talent.planCode);

    const proposal = await ProposalRepo.create(input, ctx.talent.id);

    await incrementProposalCounter(ctx.talent.id);

    await inngest.send({
      name: "proposal/submitted",
      data: { proposalId: proposal.id, jobId: input.jobId, talentId: ctx.talent.id },
    });

    return proposal;
  }

  static async withdrawProposal(ctx: TalentContext, proposalId: string): Promise<void> {
    const proposal = await ProposalRepo.findById(proposalId);
    if (!proposal) throw new AppError("NOT_FOUND", "Proposal not found", 404);
    if (proposal.talentId !== ctx.talent.id) {
      throw new AppError("FORBIDDEN", "Access denied", 403);
    }
    if (!["submitted", "shortlisted"].includes(proposal.status)) {
      throw new AppError("UNPROCESSABLE", "This proposal cannot be withdrawn", 422);
    }
    await ProposalRepo.setStatus(proposalId, "withdrawn", { withdrawnAt: new Date() });
  }

  static async shortlistProposal(ctx: CompanyContext, proposalId: string): Promise<void> {
    const proposal = await ProposalRepo.findById(proposalId);
    if (!proposal) throw new AppError("NOT_FOUND", "Proposal not found", 404);
    if (proposal.job.companyId !== ctx.company.id) {
      throw new AppError("FORBIDDEN", "Access denied", 403);
    }
    if (proposal.status !== "submitted") {
      throw new AppError("UNPROCESSABLE", "Only submitted proposals can be shortlisted", 422);
    }
    await ProposalRepo.setStatus(proposalId, "shortlisted", { shortlistedAt: new Date() });
  }

  static async rejectProposal(ctx: CompanyContext, proposalId: string): Promise<void> {
    const proposal = await ProposalRepo.findById(proposalId);
    if (!proposal) throw new AppError("NOT_FOUND", "Proposal not found", 404);
    if (proposal.job.companyId !== ctx.company.id) {
      throw new AppError("FORBIDDEN", "Access denied", 403);
    }
    if (!["submitted", "shortlisted"].includes(proposal.status)) {
      throw new AppError("UNPROCESSABLE", "This proposal cannot be rejected", 422);
    }
    await ProposalRepo.setStatus(proposalId, "rejected", { rejectedAt: new Date() });
  }
}
