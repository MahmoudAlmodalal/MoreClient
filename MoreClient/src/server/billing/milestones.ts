import { requireStripe, calcPlatformFee } from "@/server/core/stripe";
import { prisma } from "@/server/core/db";
import { AppError } from "@/server/core/errors";
import { ContractRepo } from "@/server/contracts/repo";
import { inngest } from "@/inngest/client";
import { logger } from "@/server/core/logger";
import type { CompanyContext, TalentContext } from "@/server/core/auth";

/** Fund a milestone — creates a PaymentIntent in manual capture mode. */
export async function fundMilestone(
  ctx: CompanyContext,
  contractId: string,
  milestoneId: string,
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const s = requireStripe();

  const contract = await ContractRepo.findById(contractId);
  if (!contract) throw new AppError("NOT_FOUND", "Contract not found", 404);
  if (contract.companyId !== ctx.company.id) throw new AppError("FORBIDDEN", "Access denied", 403);
  if (contract.status !== "active") throw new AppError("UNPROCESSABLE", "Contract is not active", 422);

  const milestone = await ContractRepo.getMilestone(milestoneId);
  if (!milestone || milestone.contractId !== contractId) {
    throw new AppError("NOT_FOUND", "Milestone not found", 404);
  }
  if (milestone.status !== "pending") {
    throw new AppError("UNPROCESSABLE", "Milestone is not in pending status", 422);
  }

  // Require verified company
  if (ctx.company.verificationStatus !== "verified") {
    throw new AppError("FORBIDDEN", "Company must be verified to fund milestones", 403);
  }

  if (!ctx.company.stripeCustomerId) {
    throw new AppError("UNPROCESSABLE", "Company has no payment method on file", 422);
  }

  const amountCents = milestone.amount; // stored in cents
  const platformFee = calcPlatformFee(amountCents, contract.platformFeeBps);

  const paymentIntent = await s.paymentIntents.create({
    amount: amountCents,
    currency: contract.currency.toLowerCase(),
    customer: ctx.company.stripeCustomerId,
    capture_method: "manual",
    application_fee_amount: platformFee,
    metadata: {
      contractId,
      milestoneId,
      companyId: contract.companyId,
      talentId: contract.talentId,
    },
  });

  await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      status: "funded",
      fundedAt: new Date(),
      stripePaymentIntent: paymentIntent.id,
    },
  });

  await inngest.send({
    name: "milestone/funded",
    data: { milestoneId, contractId, talentId: contract.talentId, amountCents },
  });

  logger.info({ milestoneId, paymentIntentId: paymentIntent.id, amountCents }, "milestone funded");
  return { clientSecret: paymentIntent.client_secret!, paymentIntentId: paymentIntent.id };
}

/** Talent marks milestone submitted — no Stripe action, just status change. */
export async function submitMilestone(
  ctx: TalentContext,
  contractId: string,
  milestoneId: string,
): Promise<void> {
  const contract = await ContractRepo.findById(contractId);
  if (!contract) throw new AppError("NOT_FOUND", "Contract not found", 404);
  if (contract.talentId !== ctx.talent.id) throw new AppError("FORBIDDEN", "Access denied", 403);

  const milestone = await ContractRepo.getMilestone(milestoneId);
  if (!milestone || milestone.contractId !== contractId) {
    throw new AppError("NOT_FOUND", "Milestone not found", 404);
  }
  if (milestone.status !== "funded") {
    throw new AppError("UNPROCESSABLE", "Milestone must be funded to submit", 422);
  }

  await prisma.milestone.update({
    where: { id: milestoneId },
    data: { status: "submitted" },
  });
}

/** Company approves milestone → capture payment → transfer to talent. */
export async function releaseMilestone(
  ctx: CompanyContext,
  contractId: string,
  milestoneId: string,
): Promise<void> {
  const s = requireStripe();

  const contract = await ContractRepo.findById(contractId);
  if (!contract) throw new AppError("NOT_FOUND", "Contract not found", 404);
  if (contract.companyId !== ctx.company.id) throw new AppError("FORBIDDEN", "Access denied", 403);

  const milestone = await ContractRepo.getMilestone(milestoneId);
  if (!milestone || milestone.contractId !== contractId) {
    throw new AppError("NOT_FOUND", "Milestone not found", 404);
  }
  if (milestone.status !== "submitted") {
    throw new AppError("UNPROCESSABLE", "Milestone must be submitted to release", 422);
  }
  if (!milestone.stripePaymentIntent) {
    throw new AppError("UNPROCESSABLE", "No payment intent on milestone", 422);
  }

  // Check talent has payouts enabled
  const talent = await prisma.talent.findUnique({
    where: { id: contract.talentId },
    select: { stripeAccountId: true, payoutsEnabled: true },
  });
  if (!talent?.stripeAccountId || !talent.payoutsEnabled) {
    throw new AppError("UNPROCESSABLE", "Talent has not completed payout onboarding", 422);
  }

  const amountCents = milestone.amount;
  const platformFee = calcPlatformFee(amountCents, contract.platformFeeBps);
  const talentAmount = amountCents - platformFee;

  // 1. Capture the PaymentIntent
  await s.paymentIntents.capture(milestone.stripePaymentIntent);

  // 2. Transfer to talent's Connect account
  const transfer = await s.transfers.create({
    amount: talentAmount,
    currency: contract.currency.toLowerCase(),
    destination: talent.stripeAccountId,
    metadata: { contractId, milestoneId, talentId: contract.talentId },
  });

  await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      status: "released",
      releasedAt: new Date(),
      stripeTransfer: transfer.id,
    },
  });

  await inngest.send({
    name: "milestone/released",
    data: { milestoneId, contractId, talentId: contract.talentId, amountCents: talentAmount },
  });

  logger.info({ milestoneId, transferId: transfer.id, talentAmount }, "milestone released");
}
