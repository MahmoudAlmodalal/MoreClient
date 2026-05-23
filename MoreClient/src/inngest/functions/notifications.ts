import { inngest } from "../client";
import { logger } from "@/server/core/logger";
import { prisma } from "@/server/core/db";
import { sendEmail } from "@/server/core/email";
import {
  notify,
  emailForClerkUser,
  unsubscribeUrl,
} from "@/server/notifications/service";
import {
  NewProposalEmail,
  ContractSignedEmail,
  MilestoneFundedEmail,
  MilestoneReleasedEmail,
  MessageReceivedEmail,
  VerificationApprovedEmail,
  VerificationRejectedEmail,
  AccountSuspendedEmail,
  WeeklyDigestEmail,
} from "@/server/notifications/emails/templates";

function money(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

// ─── New proposal → notify the hiring company ──────────────────────────────────

export const notifyNewProposal = inngest.createFunction(
  { id: "notifications.new-proposal", name: "Notify: New Proposal" },
  { event: "proposal/submitted" },
  async ({ event }) => {
    const { jobId, talentId } = event.data as { proposalId: string; jobId: string; talentId: string };

    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { companyId: true, title: true } });
    const talent = await prisma.talent.findUnique({ where: { id: talentId }, select: { displayName: true } });
    if (!job || !talent) return { skipped: true };

    await notify({
      principalType: "company",
      principalId: job.companyId,
      eventType: "proposal.received",
      title: "New proposal received",
      body: `${talent.displayName} applied to "${job.title}".`,
      actorType: "talent",
      actorId: talentId,
      linkUrl: "/dashboard/proposals",
      email: { subject: `New proposal for ${job.title}`, react: NewProposalEmail({ jobTitle: job.title, talentName: talent.displayName }) },
    });
    return { ok: true };
  },
);

// ─── Contract signed → notify both parties ─────────────────────────────────────

export const notifyContractSigned = inngest.createFunction(
  { id: "notifications.contract-signed", name: "Notify: Contract Signed" },
  { event: "contract/signed" },
  async ({ event }) => {
    const { contractId, companyId, talentId } = event.data as {
      contractId: string;
      companyId: string;
      talentId: string;
    };

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      select: { job: { select: { title: true } } },
    });
    const jobTitle = contract?.job?.title ?? "your contract";
    const react = ContractSignedEmail({ jobTitle });

    await Promise.all([
      notify({
        principalType: "company",
        principalId: companyId,
        eventType: "contract.signed",
        title: "Contract is now active",
        body: `Both parties signed the contract for "${jobTitle}".`,
        linkUrl: "/dashboard/contracts",
        email: { subject: "Your contract is now active", react },
      }),
      notify({
        principalType: "talent",
        principalId: talentId,
        eventType: "contract.signed",
        title: "Contract is now active",
        body: `Both parties signed the contract for "${jobTitle}".`,
        linkUrl: "/dashboard/contracts",
        email: { subject: "Your contract is now active", react },
      }),
    ]);
    return { ok: true };
  },
);

// ─── Milestone funded → notify talent ──────────────────────────────────────────

export const notifyMilestoneFunded = inngest.createFunction(
  { id: "notifications.milestone-funded", name: "Notify: Milestone Funded" },
  { event: "milestone/funded" },
  async ({ event }) => {
    const { milestoneId, talentId, amountCents } = event.data as {
      milestoneId: string;
      contractId: string;
      talentId: string;
      amountCents: number;
    };
    const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId }, select: { title: true } });
    const title = milestone?.title ?? "Milestone";
    const amount = money(amountCents);

    await notify({
      principalType: "talent",
      principalId: talentId,
      eventType: "milestone.funded",
      title: "A milestone was funded",
      body: `"${title}" (${amount}) is funded into escrow.`,
      linkUrl: "/dashboard/contracts",
      email: { subject: `Milestone funded: ${title}`, react: MilestoneFundedEmail({ milestoneTitle: title, amount }) },
    });
    return { ok: true };
  },
);

// ─── Milestone released → notify talent ────────────────────────────────────────

export const notifyMilestoneReleased = inngest.createFunction(
  { id: "notifications.milestone-released", name: "Notify: Milestone Released" },
  { event: "milestone/released" },
  async ({ event }) => {
    const { milestoneId, talentId, amountCents } = event.data as {
      milestoneId: string;
      contractId: string;
      talentId: string;
      amountCents: number;
    };
    const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId }, select: { title: true } });
    const title = milestone?.title ?? "Milestone";
    const amount = money(amountCents);

    await notify({
      principalType: "talent",
      principalId: talentId,
      eventType: "milestone.released",
      title: "A payment was released to you",
      body: `"${title}" (${amount}) has been released.`,
      linkUrl: "/dashboard/contracts",
      email: { subject: `Payment released: ${title}`, react: MilestoneReleasedEmail({ milestoneTitle: title, amount }) },
    });
    return { ok: true };
  },
);

// ─── New message → notify the recipient principal ──────────────────────────────

export const notifyMessageReceived = inngest.createFunction(
  { id: "notifications.message-received", name: "Notify: Message Received" },
  { event: "message/created" },
  async ({ event }) => {
    const { threadId, senderType } = event.data as {
      messageId: string;
      threadId: string;
      senderType: "company_user" | "talent";
      senderId: string;
      recipientClerkUserId: string;
    };

    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
      select: { companyId: true, talentId: true },
    });
    if (!thread) return { skipped: true };

    // Sender is a company user → recipient is the talent, and vice versa.
    const recipientIsTalent = senderType === "company_user";
    let senderName: string;
    if (recipientIsTalent) {
      const company = await prisma.company.findUnique({ where: { id: thread.companyId }, select: { name: true } });
      senderName = company?.name ?? "A company";
    } else {
      const talent = await prisma.talent.findUnique({ where: { id: thread.talentId }, select: { displayName: true } });
      senderName = talent?.displayName ?? "A talent";
    }

    await notify({
      principalType: recipientIsTalent ? "talent" : "company",
      principalId: recipientIsTalent ? thread.talentId : thread.companyId,
      eventType: "message.received",
      title: "New message",
      body: `${senderName} sent you a message.`,
      actorType: senderType,
      linkUrl: "/dashboard/messages",
      email: { subject: `New message from ${senderName}`, react: MessageReceivedEmail({ senderName }) },
    });
    return { ok: true };
  },
);

// ─── Verification decision → notify the principal ──────────────────────────────

export const notifyVerification = inngest.createFunction(
  { id: "notifications.verification", name: "Notify: Verification Status" },
  { event: "verification/status-changed" },
  async ({ event }) => {
    const { principalType, principalId, decision } = event.data as {
      principalType: "company" | "talent";
      principalId: string;
      decision: "verified" | "rejected";
    };

    const approved = decision === "verified";
    await notify({
      principalType,
      principalId,
      eventType: `verification.${decision}`,
      title: approved ? "Verification approved" : "Verification not completed",
      body: approved
        ? "Your account is now verified."
        : "We were unable to verify your account. You can review your details and try again.",
      linkUrl: "/dashboard/settings",
      email: approved
        ? { subject: "Your account is verified", react: VerificationApprovedEmail() }
        : { subject: "Verification update", react: VerificationRejectedEmail({}) },
    });
    return { ok: true };
  },
);

// ─── Admin suspend/ban → notify the affected principal ─────────────────────────

export const notifyAccountSuspended = inngest.createFunction(
  { id: "notifications.account-suspended", name: "Notify: Account Suspended" },
  { event: "admin/action-taken" },
  async ({ event }) => {
    const { action, targetType, targetId, reason } = event.data as {
      action: "suspend" | "ban";
      targetType: "company" | "talent";
      targetId: string;
      reason?: string;
    };
    if (action !== "suspend" && action !== "ban") return { skipped: true };

    const banned = action === "ban";
    await notify({
      principalType: targetType,
      principalId: targetId,
      eventType: `account.${action}`,
      title: banned ? "Your account has been banned" : "Your account has been suspended",
      body: reason ? `Reason: ${reason}` : undefined,
      actorType: "admin",
      email: { subject: banned ? "Your account has been banned" : "Your account has been suspended", react: AccountSuspendedEmail({ reason, banned }) },
    });
    return { ok: true };
  },
);

// ─── Weekly digest (Mon 09:00 UTC) ─────────────────────────────────────────────

const DIGEST_LIMIT = 5;

export const weeklyDigest = inngest.createFunction(
  { id: "notifications.weekly-digest", name: "Weekly Digest" },
  { cron: "0 9 * * 1" },
  async ({ step }) => {
    // Talent digest: open jobs matching each talent's skills.
    const talentSent = await step.run("talent-digests", async () => {
      const talents = await prisma.talent.findMany({
        where: { status: "active", deletedAt: null, notifyDigest: true },
        select: { id: true, clerkUserId: true, skills: { select: { skillId: true } } },
        take: 1000,
      });

      let sent = 0;
      for (const talent of talents) {
        const skillIds = talent.skills.map((s) => s.skillId);
        if (!skillIds.length) continue;

        const jobs = await prisma.job.findMany({
          where: { status: "published", deletedAt: null, requiredSkills: { some: { skillId: { in: skillIds } } } },
          orderBy: { publishedAt: "desc" },
          take: DIGEST_LIMIT,
          select: { id: true, title: true, budgetMin: true, budgetMax: true, currency: true },
        });
        if (!jobs.length) continue;

        const to = await emailForClerkUser(talent.clerkUserId);
        if (!to) continue;

        const ok = await sendEmail({
          to,
          subject: "New jobs matching your skills",
          react: WeeklyDigestEmail({
            audience: "talent",
            jobs: jobs.map((j) => ({
              id: j.id,
              title: j.title,
              budget: j.budgetMin || j.budgetMax ? `${j.budgetMin ?? "?"}–${j.budgetMax ?? "?"} ${j.currency}` : null,
            })),
            unsubscribeUrl: unsubscribeUrl("talent", talent.id),
          }),
        });
        if (ok) sent += 1;
      }
      return sent;
    });

    // Company digest: new active talent matching each company's open-job skills.
    const companySent = await step.run("company-digests", async () => {
      const companies = await prisma.company.findMany({
        where: { status: "active", deletedAt: null, notifyDigest: true },
        select: {
          id: true,
          jobs: {
            where: { status: "published", deletedAt: null },
            select: { requiredSkills: { select: { skillId: true } } },
          },
          users: { where: { role: { in: ["owner", "admin"] } }, take: 1, select: { clerkUserId: true } },
        },
        take: 1000,
      });

      let sent = 0;
      for (const company of companies) {
        const skillIds = [...new Set(company.jobs.flatMap((j) => j.requiredSkills.map((s) => s.skillId)))];
        if (!skillIds.length) continue;
        const clerkUserId = company.users[0]?.clerkUserId;
        if (!clerkUserId) continue;

        const talent = await prisma.talent.findMany({
          where: {
            status: "active",
            deletedAt: null,
            searchVisibility: "public",
            skills: { some: { skillId: { in: skillIds } } },
          },
          orderBy: { createdAt: "desc" },
          take: DIGEST_LIMIT,
          select: { id: true, handle: true, displayName: true, headline: true },
        });
        if (!talent.length) continue;

        const to = await emailForClerkUser(clerkUserId);
        if (!to) continue;

        const ok = await sendEmail({
          to,
          subject: "New talent matching your jobs",
          react: WeeklyDigestEmail({
            audience: "company",
            talent: talent.map((t) => ({ id: t.id, handle: t.handle, displayName: t.displayName, headline: t.headline })),
            unsubscribeUrl: unsubscribeUrl("company", company.id),
          }),
        });
        if (ok) sent += 1;
      }
      return sent;
    });

    logger.info({ talentSent, companySent }, "weekly digest complete");
    return { talentSent, companySent };
  },
);
