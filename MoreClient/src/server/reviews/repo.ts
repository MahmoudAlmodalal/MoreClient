import { prisma } from "@/server/core/db";
import { generateId } from "@/server/core/ids";
import type { Review, Prisma } from "@prisma/client";
import { encodeCursor, decodeCursor } from "@/server/core/pagination";

export class ReviewRepo {
  static async findById(id: string): Promise<Review | null> {
    return prisma.review.findUnique({ where: { id } });
  }

  static async findByContractAndReviewer(
    contractId: string,
    reviewerId: string,
    reviewerType: string,
  ): Promise<Review | null> {
    return prisma.review.findFirst({
      where: { contractId, reviewerId, reviewerType: reviewerType as Review["reviewerType"] },
    });
  }

  static async create(data: {
    contractId: string;
    reviewerType: "company_user" | "talent";
    reviewerId: string;
    targetType: "company_user" | "talent";
    targetId: string;
    rating: number;
    comment?: string;
  }): Promise<Review> {
    return prisma.review.create({
      data: {
        id: generateId(),
        contractId: data.contractId,
        reviewerType: data.reviewerType,
        reviewerId: data.reviewerId,
        targetType: data.targetType,
        targetId: data.targetId,
        rating: data.rating,
        comment: data.comment,
      },
    });
  }

  static async listByTarget(
    targetId: string,
    targetType: "talent" | "company_user",
    opts: { cursor?: string; limit?: number } = {},
  ): Promise<{ items: Review[]; hasMore: boolean; nextCursor: string | null }> {
    const limit = opts.limit ?? 20;
    const where: Prisma.ReviewWhereInput = { targetId, targetType };

    if (opts.cursor) {
      const decoded = decodeCursor(opts.cursor);
      const [ts] = decoded.split("__");
      where.createdAt = { lt: new Date(ts) };
    }

    const items = await prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    const hasMore = items.length > limit;
    const sliced = hasMore ? items.slice(0, limit) : items;
    const last = sliced[sliced.length - 1];
    const nextCursor =
      hasMore && last ? encodeCursor(`${last.createdAt.toISOString()}__${last.id}`) : null;

    return { items: sliced, hasMore, nextCursor };
  }

  static async aggregateRating(
    targetId: string,
    targetType: "talent" | "company_user",
  ): Promise<{ avg: number; count: number }> {
    const result = await prisma.review.aggregate({
      where: { targetId, targetType },
      _avg: { rating: true },
      _count: { rating: true },
    });
    return {
      avg: result._avg.rating ?? 0,
      count: result._count.rating,
    };
  }
}
