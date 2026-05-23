import { prisma } from "../core/db";
import { generateId } from "../core/ids";
import { decodeCursor, encodeCursor } from "../core/pagination";
import type { Job, JobSkill, Prisma, JobStatus } from "@prisma/client";
import type { CreateJobInput, UpdateJobInput, ListJobsQuery } from "@/schemas/job";

export type JobWithSkills = Job & { requiredSkills: (JobSkill & { skill: { id: string; slug: string; nameEn: string; nameAr: string } })[] };

export class JobRepo {
  static async findById(id: string): Promise<JobWithSkills | null> {
    return prisma.job.findUnique({
      where: { id, deletedAt: null },
      include: { requiredSkills: { include: { skill: true } } },
    });
  }

  static async create(companyId: string, input: CreateJobInput): Promise<JobWithSkills> {
    const { skillIds, ...rest } = input;
    return prisma.job.create({
      data: {
        id: generateId(),
        companyId,
        ...rest,
        requiredSkills: skillIds.length
          ? {
              createMany: {
                data: skillIds.map((skillId) => ({ skillId, required: true })),
                skipDuplicates: true,
              },
            }
          : undefined,
      },
      include: { requiredSkills: { include: { skill: true } } },
    });
  }

  static async update(id: string, input: UpdateJobInput): Promise<JobWithSkills> {
    const { skillIds, ...rest } = input;

    const cleanRest = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined),
    ) as Prisma.JobUpdateInput;

    return prisma.$transaction(async (tx) => {
      if (skillIds !== undefined) {
        await tx.jobSkill.deleteMany({ where: { jobId: id } });
        if (skillIds.length) {
          await tx.jobSkill.createMany({
            data: skillIds.map((skillId) => ({ jobId: id, skillId, required: true })),
            skipDuplicates: true,
          });
        }
      }
      return tx.job.update({
        where: { id },
        data: { ...cleanRest, updatedAt: new Date() },
        include: { requiredSkills: { include: { skill: true } } },
      });
    });
  }

  static async setStatus(
    id: string,
    status: JobStatus,
    extra?: Partial<Pick<Prisma.JobUpdateInput, "publishedAt" | "closedAt">>,
  ): Promise<Job> {
    return prisma.job.update({ where: { id }, data: { status, ...extra } });
  }

  static async softDelete(id: string): Promise<void> {
    await prisma.job.update({ where: { id }, data: { deletedAt: new Date(), status: "cancelled" } });
  }

  static async list(query: ListJobsQuery): Promise<{ items: JobWithSkills[]; hasMore: boolean; nextCursor: string | null }> {
    const limit = query.limit ?? 20;
    const where: Prisma.JobWhereInput = { deletedAt: null };

    if (query.status) where.status = query.status;
    if (query.country) where.country = query.country;
    if (query.engagementType) where.engagementType = query.engagementType;
    if (query.companyId) where.companyId = query.companyId;
    if (query.budgetMin) where.budgetMax = { gte: query.budgetMin };
    if (query.budgetMax) where.budgetMin = { lte: query.budgetMax };
    if (query.skillId) where.requiredSkills = { some: { skillId: query.skillId } };
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
      ];
    }

    if (query.cursor) {
      const decoded = decodeCursor(query.cursor);
      const [createdAt, id] = decoded.split("__");
      where.AND = [
        { createdAt: { lte: new Date(createdAt) } },
        { id: { not: id } },
      ];
      where.OR = [
        { createdAt: { lt: new Date(createdAt) } },
        ...(where.OR ?? []),
      ];
    }

    const items = await prisma.job.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: limit + 1,
      include: { requiredSkills: { include: { skill: true } } },
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
