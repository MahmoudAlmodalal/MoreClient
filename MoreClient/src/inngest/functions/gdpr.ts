import { inngest } from "../client";
import { prisma } from "@/server/core/db";
import { logger } from "@/server/core/logger";
import { r2, BUCKET } from "@/server/core/storage";
import {
  ListObjectsV2Command,
  DeleteObjectsCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * GDPR data export — collect all principal data from Postgres,
 * serialize to JSON, upload to R2, and (stub) email the signed URL.
 */
export const gdprExport = inngest.createFunction(
  { id: "gdpr.export", name: "GDPR Data Export" },
  { event: "gdpr/export-requested" },
  async ({ event, step }) => {
    const { principalType, principalId, clerkUserId } = event.data as {
      principalType: "company" | "talent";
      principalId: string;
      clerkUserId: string;
    };

    const archive = await step.run("collect-data", async () => {
      if (principalType === "talent") {
        const talent = await prisma.talent.findUnique({
          where: { id: principalId },
          include: {
            skills: { include: { skill: true } },
            portfolio: true,
            experience: true,
            languages: true,
            proposals: true,
            contracts: { include: { milestones: true, reviews: true } },
          },
        });
        return { exportedAt: new Date().toISOString(), principalType, data: talent };
      } else {
        const company = await prisma.company.findUnique({
          where: { id: principalId },
          include: {
            users: true,
            jobs: true,
            contracts: { include: { milestones: true } },
          },
        });
        return { exportedAt: new Date().toISOString(), principalType, data: company };
      }
    });

    const key = `gdpr-exports/${principalId}/${Date.now()}.json`;

    await step.run("upload-to-r2", async () => {
      if (!r2) {
        logger.warn({ principalId }, "R2 not configured; skipping GDPR export upload");
        return;
      }
      const body = JSON.stringify(archive, null, 2);
      await r2.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: body,
          ContentType: "application/json",
        }),
      );
      logger.info({ principalId, key }, "GDPR export uploaded to R2");
    });

    await step.run("notify-user", async () => {
      if (!r2) {
        logger.warn({ principalId, key }, "R2 not configured; GDPR export signed URL skipped");
        return;
      }

      let downloadUrl: string | null = null;
      try {
        downloadUrl = await getSignedUrl(
          r2,
          new GetObjectCommand({ Bucket: BUCKET, Key: key }),
          { expiresIn: 72 * 60 * 60 }, // 72 hours
        );
      } catch {
        logger.warn({ principalId, key }, "failed to generate GDPR export signed URL");
        return;
      }

      // Resolve user email from Clerk
      let userEmail: string | null = null;
      try {
        const { createClerkClient } = await import("@clerk/nextjs/server");
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        const user = await clerk.users.getUser(clerkUserId);
        userEmail = user.emailAddresses[0]?.emailAddress ?? null;
      } catch {
        logger.warn({ clerkUserId }, "could not fetch user email from Clerk for GDPR export");
      }

      if (userEmail) {
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          try {
            const { Resend } = await import("resend");
            const resend = new Resend(resendKey);
            await resend.emails.send({
              from: "noreply@clientmore.com",
              to: userEmail,
              subject: "Your clientMORE data export is ready",
              html: `
                <p>Hello,</p>
                <p>Your data export is ready. You can download it using the link below within 72 hours:</p>
                <p><a href="${downloadUrl}">Download your data</a></p>
                <p>If you did not request this export, please contact support.</p>
                <p>— clientMORE Team</p>
              `,
            });
            logger.info({ principalId, userEmail }, "GDPR export email sent via Resend");
          } catch {
            logger.warn({ principalId, userEmail }, "Resend delivery failed for GDPR export");
          }
        } else {
          logger.warn({ principalId }, "RESEND_API_KEY not configured; GDPR export email skipped");
        }
      }

      logger.info(
        { principalId, key, hasEmail: !!userEmail },
        "GDPR export ready — signed download URL generated",
      );
    });

    return { principalId, key };
  },
);

/**
 * GDPR account deletion — hard-delete all principal data:
 * Postgres cascade, Pinecone vectors, R2 files, Stripe customer, Clerk user.
 */
export const gdprDelete = inngest.createFunction(
  { id: "gdpr.delete", name: "GDPR Account Deletion" },
  { event: "gdpr/account-deletion-requested" },
  async ({ event, step }) => {
    const { principalType, principalId, clerkUserId } = event.data as {
      principalType: "company" | "talent";
      principalId: string;
      clerkUserId: string;
    };

    // 1. Delete Stripe customer (company) or Connect account (talent)
    await step.run("delete-stripe", async () => {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) return;
      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" });

      if (principalType === "company") {
        const company = await prisma.company.findUnique({
          where: { id: principalId },
          select: { stripeCustomerId: true },
        });
        if (company?.stripeCustomerId) {
          await stripe.customers
            .del(company.stripeCustomerId)
            .catch((e: unknown) => logger.warn({ e }, "stripe customer delete failed"));
        }
      } else {
        // Talent has no customer; it has a Stripe Connect (Express) account.
        const talent = await prisma.talent.findUnique({
          where: { id: principalId },
          select: { stripeAccountId: true },
        });
        if (talent?.stripeAccountId) {
          await stripe.accounts
            .del(talent.stripeAccountId)
            .catch((e: unknown) => logger.warn({ e }, "stripe connect account delete failed"));
        }
      }
    });

    // 2. Delete Pinecone vectors. Vectors live in shared namespaces keyed by
    //    record id (talent profiles under "talent" keyed by talentId; job
    //    postings under "jobs" keyed by jobId), NOT a per-principal namespace.
    await step.run("delete-pinecone-vectors", async () => {
      try {
        const { getPineconeIndex, PINECONE_NAMESPACES: PN } = await import(
          "@/server/core/ai/pinecone"
        );
        const index = getPineconeIndex();
        if (!index) return;

        if (principalType === "talent") {
          await index.namespace(PN.talent).deleteMany([principalId]);
          logger.info({ principalId }, "pinecone talent vector deleted");
        } else {
          // Company: remove every job vector belonging to the company.
          const jobs = await prisma.job.findMany({
            where: { companyId: principalId },
            select: { id: true },
          });
          const jobIds = jobs.map((j) => j.id);
          if (jobIds.length > 0) {
            await index.namespace(PN.jobs).deleteMany(jobIds);
          }
          logger.info({ principalId, count: jobIds.length }, "pinecone job vectors deleted");
        }
      } catch (e) {
        logger.warn({ principalId, e }, "pinecone delete failed or not configured");
      }
    });

    // 3. Delete R2 files (list + bulk-delete under principal prefix)
    await step.run("delete-r2-files", async () => {
      if (!r2) return;
      try {
        const listed = await r2.send(
          new ListObjectsV2Command({ Bucket: BUCKET, Prefix: `uploads/${principalId}/` }),
        );
        const keys = (listed.Contents ?? []).map((o) => ({ Key: o.Key! }));
        if (keys.length > 0) {
          await r2.send(
            new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: keys } }),
          );
        }
        logger.info({ principalId, count: keys.length }, "R2 files deleted");
      } catch {
        logger.warn({ principalId }, "R2 delete failed");
      }
    });

    // 4. Hard-delete from Postgres (relations cascade via schema onDelete).
    //    Do NOT swallow errors here: a failed cascade would otherwise leave
    //    orphaned rows silently. Let it throw so Inngest retries/surfaces it.
    await step.run("hard-delete-postgres", async () => {
      if (principalType === "talent") {
        await prisma.talent.delete({ where: { id: principalId } });
      } else {
        await prisma.company.delete({ where: { id: principalId } });
      }
      logger.info({ principalType, principalId }, "postgres hard-delete complete");
    });

    // 5. Delete Clerk user
    await step.run("delete-clerk-user", async () => {
      const secretKey = process.env.CLERK_SECRET_KEY;
      if (!secretKey) return;
      try {
        const { createClerkClient } = await import("@clerk/nextjs/server");
        const clerk = createClerkClient({ secretKey });
        await clerk.users.deleteUser(clerkUserId);
        logger.info({ clerkUserId }, "clerk user deleted");
      } catch {
        logger.warn({ clerkUserId }, "clerk user delete failed");
      }
    });

    return { principalType, principalId, deletedAt: new Date().toISOString() };
  },
);
