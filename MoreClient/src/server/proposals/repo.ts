import { prisma } from "../core/db";
import { generateId } from "../core/ids";
import { decodeCursor, encodeCursor } from "../core/pagination";
import type { Proposal, ProposalStatus, Prisma } from "@prisma/client";
import type { SubmitProposalInput, ListProposalsQuery } from "@/schemas/proposal";

export type ProposalWithRelations = Proposal & {
  job: { id: string; title: string; companyId: string };
  talent: { id: string; handle: string; displayName: string; avatarUrl: string | null };
};

export class ProposalRepo {
  static async findById(id: string): Promise<ProposalWithRelations | null> {
    return prisma.proposal.findUnique({
      where: { id },
      include: {
        job: { select: { id: true, title: true, companyId: true } },
        talent: { select: { id: true, handle: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  static async findByJobAndTalent(jobId: string, talentId: string): Promise<Proposal | null> {
    return prisma.proposal.findUnique({ where: { jobId_talentId: { jobId, talentId } } });
  }

  static async create(input: SubmitProposalInput, talentId: string): Promise<ProposalWithRelations> {
    return prisma.proposal.create({
      data: {
        id: generateId(),
        jobId: input.jobId,
        talentId,
        coverLetter: input.coverLetter,
        bidAmount: input.bidAmount,
        bidCurrency: input.bidCurrency ?? "USD",
        durationWeeks: input.durationWeeks,
        attachments: input.attachments ?? [],
        status: "submitted",
      },
      include: {
        job: { select: { id: true, title: true, companyId: true } },
        talent: { select: { id: true, handle: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  static async setStatus(
    id: string,
    status: ProposalStatus,
    extra?: Partial<Pick<Prisma.ProposalUpdateInput, "shortlistedAt" | "rejectedAt" | "withdrawnAt">>,
  ): Promise<Proposal> {
    return prisma.proposal.update({ where: { id }, data: { status, ...extra } });
  }

  static async list(
    query: ListProposalsQuery,
  ): Promise<{ items: ProposalWithRelations[]; hasMore: boolean; nextCursor: string | null }> {
    const limit = query.limit ?? 20;
    const where: Prisma.ProposalWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.jobId) where.jobId = query.jobId;
    if (query.talentId) where.talentId = query.talentId;

    if (query.cursor) {
      const decoded = decodeCursor(query.cursor);
      const [createdAt] = decoded.split("__");
      where.createdAt = { lt: new Date(createdAt) };
    }

    const items = await prisma.proposal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: {
        job: { select: { id: true, title: true, companyId: true } },
        talent: { select: { id: true, handle: true, displayName: true, avatarUrl: true } },
      },
    });

    const hasMore = items.length > limit;
    const sliced = hasMore ? items.slice(0, limit) : items;
    const last = sliced[sliced.length - 1];
    const nextCursor = hasMore && last
      ? encodeCursor(`${last.createdAt.toISOString()}__${last.id}`)
      : null;

    return { items: sliced, hasMore, nextCursor };
  }
}
