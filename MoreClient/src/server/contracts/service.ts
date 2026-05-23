import { ContractRepo, type ContractWithMilestones } from "./repo";
import { ProposalRepo } from "../proposals/repo";
import { AppError } from "../core/errors";
import { inngest } from "@/inngest/client";
import type { CompanyContext, TalentContext } from "../core/auth";
import type { CreateContractInput, AddMilestoneInput, UpdateMilestoneInput } from "@/schemas/contract";
import type { Milestone } from "@prisma/client";

export class ContractService {
  static async getContract(
    id: string,
    ctx: CompanyContext | TalentContext,
  ): Promise<ContractWithMilestones> {
    const contract = await ContractRepo.findById(id);
    if (!contract) throw new AppError("NOT_FOUND", "Contract not found", 404);

    if (ctx.type === "company" && contract.companyId !== ctx.company.id) {
      throw new AppError("FORBIDDEN", "Access denied", 403);
    }
    if (ctx.type === "talent" && contract.talentId !== ctx.talent.id) {
      throw new AppError("FORBIDDEN", "Access denied", 403);
    }

    return contract;
  }

  static async createContract(
    ctx: CompanyContext,
    input: CreateContractInput,
  ): Promise<ContractWithMilestones> {
    const proposal = await ProposalRepo.findById(input.proposalId);
    if (!proposal) throw new AppError("NOT_FOUND", "Proposal not found", 404);
    if (proposal.job.companyId !== ctx.company.id) {
      throw new AppError("FORBIDDEN", "Access denied", 403);
    }
    if (!["submitted", "shortlisted"].includes(proposal.status)) {
      throw new AppError("UNPROCESSABLE", "Proposal must be submitted or shortlisted to create a contract", 422);
    }

    const existing = await ContractRepo.findByJobId(proposal.jobId);
    if (existing) {
      throw new AppError("CONFLICT", "A contract already exists for this job", 409);
    }

    const contract = await ContractRepo.create(
      input,
      ctx.company.id,
      proposal.talentId,
      proposal.jobId,
    );

    await ProposalRepo.setStatus(input.proposalId, "accepted");

    return contract;
  }

  static async signAsCompany(ctx: CompanyContext, contractId: string): Promise<ContractWithMilestones> {
    const contract = await ContractRepo.findById(contractId);
    if (!contract) throw new AppError("NOT_FOUND", "Contract not found", 404);
    if (contract.companyId !== ctx.company.id) throw new AppError("FORBIDDEN", "Access denied", 403);
    if (contract.status !== "pending_signature") {
      throw new AppError("UNPROCESSABLE", "Contract is not awaiting signatures", 422);
    }
    if (contract.signedAtCompany) {
      throw new AppError("CONFLICT", "Company has already signed this contract", 409);
    }

    const now = new Date();
    const bothSigned = !!contract.signedAtTalent;

    const updated = await ContractRepo.update(contractId, {
      signedAtCompany: now,
      ...(bothSigned ? { status: "active", startedAt: now } : {}),
    });

    if (bothSigned) {
      await inngest.send({
        name: "contract/signed",
        data: { contractId, companyId: contract.companyId, talentId: contract.talentId },
      });
    }

    return updated;
  }

  static async signAsTalent(ctx: TalentContext, contractId: string): Promise<ContractWithMilestones> {
    const contract = await ContractRepo.findById(contractId);
    if (!contract) throw new AppError("NOT_FOUND", "Contract not found", 404);
    if (contract.talentId !== ctx.talent.id) throw new AppError("FORBIDDEN", "Access denied", 403);
    if (contract.status !== "pending_signature") {
      throw new AppError("UNPROCESSABLE", "Contract is not awaiting signatures", 422);
    }
    if (contract.signedAtTalent) {
      throw new AppError("CONFLICT", "Talent has already signed this contract", 409);
    }

    const now = new Date();
    const bothSigned = !!contract.signedAtCompany;

    const updated = await ContractRepo.update(contractId, {
      signedAtTalent: now,
      ...(bothSigned ? { status: "active", startedAt: now } : {}),
    });

    if (bothSigned) {
      await inngest.send({
        name: "contract/signed",
        data: { contractId, companyId: contract.companyId, talentId: contract.talentId },
      });
    }

    return updated;
  }

  static async addMilestone(
    ctx: CompanyContext,
    contractId: string,
    input: AddMilestoneInput,
  ): Promise<Milestone> {
    const contract = await ContractRepo.findById(contractId);
    if (!contract) throw new AppError("NOT_FOUND", "Contract not found", 404);
    if (contract.companyId !== ctx.company.id) throw new AppError("FORBIDDEN", "Access denied", 403);
    if (!["pending_signature", "active"].includes(contract.status)) {
      throw new AppError("UNPROCESSABLE", "Cannot add milestones to this contract", 422);
    }
    return ContractRepo.addMilestone(contractId, input);
  }

  static async updateMilestone(
    ctx: CompanyContext,
    contractId: string,
    milestoneId: string,
    input: UpdateMilestoneInput,
  ): Promise<Milestone> {
    const contract = await ContractRepo.findById(contractId);
    if (!contract) throw new AppError("NOT_FOUND", "Contract not found", 404);
    if (contract.companyId !== ctx.company.id) throw new AppError("FORBIDDEN", "Access denied", 403);

    const milestone = await ContractRepo.getMilestone(milestoneId);
    if (!milestone || milestone.contractId !== contractId) {
      throw new AppError("NOT_FOUND", "Milestone not found", 404);
    }
    if (milestone.status !== "pending") {
      throw new AppError("UNPROCESSABLE", "Cannot edit a milestone that is not pending", 422);
    }

    return ContractRepo.updateMilestone(milestoneId, input);
  }

  static async deleteMilestone(
    ctx: CompanyContext,
    contractId: string,
    milestoneId: string,
  ): Promise<void> {
    const contract = await ContractRepo.findById(contractId);
    if (!contract) throw new AppError("NOT_FOUND", "Contract not found", 404);
    if (contract.companyId !== ctx.company.id) throw new AppError("FORBIDDEN", "Access denied", 403);

    const milestone = await ContractRepo.getMilestone(milestoneId);
    if (!milestone || milestone.contractId !== contractId) {
      throw new AppError("NOT_FOUND", "Milestone not found", 404);
    }
    if (milestone.status !== "pending") {
      throw new AppError("UNPROCESSABLE", "Cannot delete a funded or released milestone", 422);
    }

    await ContractRepo.deleteMilestone(milestoneId);
  }
}
