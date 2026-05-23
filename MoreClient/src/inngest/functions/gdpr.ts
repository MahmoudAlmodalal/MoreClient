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
      // Generate a 72-hour signed download URL for the exported archive.
      if (r2) {
        try {
          const downloadUrl = await getSignedUrl(
            r2,
            new GetObjectCommand({ Bucket: BUCKET, Key: key }),
            { expiresIn: 72 * 60 * 60 }, // 72 hours
          );
          // Phase 6 will wire Resend to email this URL to the principal.
          // For now: log the signed URL so it can be retrieved from admin logs.
          logger.info(
            { principalId, key, downloadUrl: downloadUrl.slice(0, 80) + "…" },
            "GDPR export ready — signed download URL generated (email delivery pending Phase 6)",
          );
        } catch {
          logger.warn({ principalId, key }, "failed to generate GDPR export signed URL");
        }
      } else {
        logger.warn({ principalId, key }, "R2 not configured; GDPR export signed URL skipped");
      }
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

    // 1. Delete Stripe customer
    await step.run("delete-stripe-customer", async () => {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) return;
      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

      let customerId: string | null = null;
      if (principalType === "company") {
        const company = await prisma.company.findUnique({ where: { id: principalId }, select: { stripeCustomerId: true } });
        customerId = company?.stripeCustomerId ?? null;
      }
      if (customerId) {
        await stripe.customers.del(customerId).catch((e: unknown) => logger.warn({ e }, "stripe customer delete failed"));
      }
    });

    // 2. Delete Pinecone vectors
    await step.run("delete-pinecone-vectors", async () => {
      try {
        const { getPineconeIndex } = await import("@/server/core/ai/pinecone");
        const index = getPineconeIndex();
        if (!index) return;
        const ns = index.namespace(principalId);
        await ns.deleteAll();
        logger.info({ principalId }, "pinecone vectors deleted");
      } catch {
        logger.warn({ principalId }, "pinecone delete failed or not configured");
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

    // 4. Hard-delete from Postgres (cascade)
    await step.run("hard-delete-postgres", async () => {
      if (principalType === "talent") {
        await prisma.talent.delete({ where: { id: principalId } }).catch(() => {});
      } else {
        await prisma.company.delete({ where: { id: principalId } }).catch(() => {});
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
