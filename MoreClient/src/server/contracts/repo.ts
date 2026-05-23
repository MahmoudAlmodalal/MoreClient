import { prisma } from "../core/db";
import { generateId } from "../core/ids";
import type { Contract, Milestone, Prisma } from "@prisma/client";
import type { CreateContractInput, AddMilestoneInput, UpdateMilestoneInput } from "@/schemas/contract";

export type ContractWithMilestones = Contract & { milestones: Milestone[] };

export class ContractRepo {
  static async findById(id: string): Promise<ContractWithMilestones | null> {
    return prisma.contract.findUnique({
      where: { id },
      include: { milestones: { orderBy: { createdAt: "asc" } } },
    });
  }

  static async findByJobId(jobId: string): Promise<ContractWithMilestones | null> {
    return prisma.contract.findUnique({
      where: { jobId },
      include: { milestones: { orderBy: { createdAt: "asc" } } },
    });
  }

  static async create(
    input: CreateContractInput,
    companyId: string,
    talentId: string,
    jobId: string,
  ): Promise<ContractWithMilestones> {
    return prisma.contract.create({
      data: {
        id: generateId(),
        jobId,
        companyId,
        talentId,
        termsMarkdown: input.termsMarkdown,
        amount: input.amount,
        currency: input.currency ?? "USD",
        engagementType: input.engagementType,
        status: "pending_signature",
      },
      include: { milestones: true },
    });
  }

  static async update(
    id: string,
    data: Partial<Pick<Prisma.ContractUpdateInput, "signedAtCompany" | "signedAtTalent" | "status" | "startedAt" | "completedAt" | "cancelledAt">>,
  ): Promise<ContractWithMilestones> {
    return prisma.contract.update({
      where: { id },
      data,
      include: { milestones: { orderBy: { createdAt: "asc" } } },
    });
  }

  static async addMilestone(contractId: string, input: AddMilestoneInput): Promise<Milestone> {
    return prisma.milestone.create({
      data: {
        id: generateId(),
        contractId,
        title: input.title,
        description: input.description,
        amount: input.amount,
        status: "pending",
      },
    });
  }

  static async updateMilestone(milestoneId: string, input: UpdateMilestoneInput): Promise<Milestone> {
    return prisma.milestone.update({
      where: { id: milestoneId },
      data: input,
    });
  }

  static async deleteMilestone(milestoneId: string): Promise<void> {
    await prisma.milestone.delete({ where: { id: milestoneId } });
  }

  static async getMilestone(milestoneId: string): Promise<Milestone | null> {
    return prisma.milestone.findUnique({ where: { id: milestoneId } });
  }
}
