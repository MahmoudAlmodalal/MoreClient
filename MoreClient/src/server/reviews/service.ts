import { ReviewRepo } from "./repo";
import { prisma } from "@/server/core/db";
import { AppError } from "@/server/core/errors";
import type { CompanyContext, TalentContext } from "@/server/core/auth";
import type { Review } from "@prisma/client";
import { z } from "zod";

export const postReviewSchema = z.object({
  contractId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5).max(2000).optional(),
});

export type PostReviewInput = z.infer<typeof postReviewSchema>;

export class ReviewService {
  static async postReview(
    ctx: CompanyContext | TalentContext,
    input: PostReviewInput,
  ): Promise<Review> {
    const contract = await prisma.contract.findUnique({
      where: { id: input.contractId },
    });
    if (!contract) throw new AppError("NOT_FOUND", "Contract not found", 404);

    if (contract.status !== "completed") {
      throw new AppError("UNPROCESSABLE", "Contract must be completed before leaving a review", 422);
    }

    let reviewerType: "company_user" | "talent";
    let reviewerId: string;
    let targetType: "company_user" | "talent";
    let targetId: string;

    if (ctx.type === "company") {
      if (contract.companyId !== ctx.company.id) {
        throw new AppError("FORBIDDEN", "Access denied", 403);
      }
      reviewerType = "company_user";
      reviewerId = ctx.clerkUserId;
      targetType = "talent";
      targetId = contract.talentId;
    } else {
      if (contract.talentId !== ctx.talent.id) {
        throw new AppError("FORBIDDEN", "Access denied", 403);
      }
      reviewerType = "talent";
      reviewerId = ctx.clerkUserId;
      targetType = "company_user";
      targetId = contract.companyId;
    }

    // Enforce one review per contract side
    const existing = await ReviewRepo.findByContractAndReviewer(
      input.contractId,
      reviewerId,
      reviewerType,
    );
    if (existing) {
      throw new AppError("CONFLICT", "You have already reviewed this contract", 409);
    }

    const review = await ReviewRepo.create({
      contractId: input.contractId,
      reviewerType,
      reviewerId,
      targetType,
      targetId,
      rating: input.rating,
      comment: input.comment,
    });

    return review;
  }

  static async listReviews(
    targetId: string,
    targetType: "talent" | "company_user",
    opts: { cursor?: string; limit?: number } = {},
  ) {
    const result = await ReviewRepo.listByTarget(targetId, targetType, opts);
    const agg = await ReviewRepo.aggregateRating(targetId);
    return { ...result, avgRating: Math.round(agg.avg * 10) / 10, reviewCount: agg.count };
  }
}
