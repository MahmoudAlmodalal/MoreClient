import { inngest } from "../client";
import { r2, BUCKET } from "@/server/core/storage";
import { logger } from "@/server/core/logger";
import { validateUpload, finalKey } from "@/server/core/uploads";
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

/**
 * File scan workflow — triggered when a principal uploads a file to R2.
 *
 * Flow:
 *   1. File lands in `quarantine/{principalId}/...`
 *   2. This function fetches the first 4 KB for MIME sniffing + validation
 *   3. On pass: COPY to `uploads/{principalId}/...`, DELETE from quarantine
 *   4. On fail: DELETE from quarantine, emit rejection event
 *
 * Phase 6: wire ClamAV / Cloudflare Gateway for deeper AV scanning.
 */
export const scanUploadedFile = inngest.createFunction(
  { id: "uploads.scan", name: "Scan Uploaded File" },
  { event: "upload/file-uploaded" },
  async ({ event, step }) => {
    const { quarantineKeyStr, principalId, planCode, mime, declaredFilename } = event.data as {
      quarantineKeyStr: string;
      principalId: string;
      planCode: string;
      mime: string;
      declaredFilename: string;
    };

    const validationResult = await step.run("validate-content", async () => {
      if (!r2) {
        logger.warn({ quarantineKeyStr }, "R2 not configured — skipping upload scan");
        return { passed: true, reason: null };
      }

      try {
        // Fetch the first 4 KB for MIME sniffing
        const response = await r2.send(
          new GetObjectCommand({
            Bucket: BUCKET,
            Key: quarantineKeyStr,
            Range: "bytes=0-4095",
          }),
        );

        const chunks: Uint8Array[] = [];
        if (response.Body) {
          const stream = response.Body as AsyncIterable<Uint8Array>;
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
        }
        const header = chunks.length > 0 ? chunks[0] : new Uint8Array(0);

        validateUpload(header, declaredFilename, mime, { planCode });
        return { passed: true, reason: null };
      } catch (err) {
        const reason = err instanceof Error ? err.message : "validation failed";
        return { passed: false, reason };
      }
    });

    if (!validationResult.passed) {
      await step.run("delete-quarantine-reject", async () => {
        if (!r2) return;
        await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: quarantineKeyStr }));
        logger.warn({ quarantineKeyStr, principalId, reason: validationResult.reason }, "upload rejected");
      });

      await inngest.send({
        name: "upload/file-rejected",
        data: { quarantineKeyStr, principalId, reason: validationResult.reason },
      });

      return { status: "rejected", reason: validationResult.reason };
    }

    // Move to final location
    const destination = finalKey(quarantineKeyStr);

    await step.run("move-to-final", async () => {
      if (!r2) return;
      await r2.send(
        new CopyObjectCommand({
          Bucket: BUCKET,
          CopySource: `${BUCKET}/${quarantineKeyStr}`,
          Key: destination,
          ContentType: mime,
          MetadataDirective: "REPLACE",
        }),
      );
      await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: quarantineKeyStr }));
      logger.info({ quarantineKeyStr, destination, principalId }, "upload scan passed — moved to final location");
    });

    return { status: "accepted", destination };
  },
);
