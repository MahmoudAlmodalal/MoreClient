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
 *   2. This function samples the head (magic bytes) AND tail (ZIP central
 *      directory / PDF trailer) for MIME sniffing + validation
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
        const HEAD = 64 * 1024; // 64 KB — magic bytes + most PDF /Encrypt dicts
        const TAIL = 64 * 1024; // 64 KB — ZIP central directory + PDF trailer

        async function readRange(range: string): Promise<Uint8Array> {
          const res = await r2!.send(
            new GetObjectCommand({ Bucket: BUCKET, Key: quarantineKeyStr, Range: range }),
          );
          const parts: Uint8Array[] = [];
          if (res.Body) {
            for await (const chunk of res.Body as AsyncIterable<Uint8Array>) parts.push(chunk);
          }
          return Buffer.concat(parts.map((p) => Buffer.from(p)));
        }

        // Head sample (also exposes ContentRange → true object size).
        const headRes = await r2.send(
          new GetObjectCommand({
            Bucket: BUCKET,
            Key: quarantineKeyStr,
            Range: `bytes=0-${HEAD - 1}`,
          }),
        );
        const headParts: Uint8Array[] = [];
        if (headRes.Body) {
          for await (const chunk of headRes.Body as AsyncIterable<Uint8Array>) headParts.push(chunk);
        }
        const head = Buffer.concat(headParts.map((p) => Buffer.from(p)));

        // ContentRange looks like "bytes 0-65535/123456" — the suffix is the size.
        const totalSize = Number(headRes.ContentRange?.split("/")[1] ?? head.length);

        // Tail sample for end-of-file structures (skip if the file fits in HEAD).
        let sample = head;
        if (totalSize > HEAD) {
          const tailStart = Math.max(HEAD, totalSize - TAIL);
          const tail = await readRange(`bytes=${tailStart}-${totalSize - 1}`);
          sample = Buffer.concat([head, tail]);
        }

        validateUpload(sample, declaredFilename, mime, { planCode, actualSizeBytes: totalSize });
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
