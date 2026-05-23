import { requireStripe } from "@/server/core/stripe";
import { prisma } from "@/server/core/db";
import { AppError } from "@/server/core/errors";

export async function createConnectOnboardingLink(
  talentId: string,
  clerkUserId: string,
  email: string | null | undefined,
  returnUrl: string,
  refreshUrl: string,
): Promise<{ url: string }> {
  const s = requireStripe();

  const talent = await prisma.talent.findUnique({
    where: { id: talentId },
    select: { stripeAccountId: true, verificationStatus: true },
  });
  if (!talent) throw new AppError("NOT_FOUND", "Talent not found", 404);

  let accountId = talent.stripeAccountId;

  if (!accountId) {
    const account = await s.accounts.create({
      type: "express",
      email: email ?? undefined,
      metadata: { talentId, clerkUserId },
      capabilities: {
        transfers: { requested: true },
      },
    });
    accountId = account.id;
    await prisma.talent.update({
      where: { id: talentId },
      data: { stripeAccountId: accountId },
    });
  }

  const link = await s.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  return { url: link.url };
}

export async function getConnectStatus(
  talentId: string,
): Promise<{ stripeAccountId: string | null; payoutsEnabled: boolean; detailsSubmitted: boolean }> {
  const s = requireStripe();

  const talent = await prisma.talent.findUnique({
    where: { id: talentId },
    select: { stripeAccountId: true, payoutsEnabled: true },
  });
  if (!talent) throw new AppError("NOT_FOUND", "Talent not found", 404);

  if (!talent.stripeAccountId) {
    return { stripeAccountId: null, payoutsEnabled: false, detailsSubmitted: false };
  }

  const account = await s.accounts.retrieve(talent.stripeAccountId);
  const payoutsEnabled = account.payouts_enabled ?? false;
  const detailsSubmitted = account.details_submitted ?? false;

  if (payoutsEnabled !== talent.payoutsEnabled) {
    await prisma.talent.update({
      where: { id: talentId },
      data: { payoutsEnabled },
    });
  }

  return { stripeAccountId: talent.stripeAccountId, payoutsEnabled, detailsSubmitted };
}
