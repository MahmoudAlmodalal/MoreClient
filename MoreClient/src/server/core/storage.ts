import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { generateId } from "./ids";

function createR2Client() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

export const r2 = createR2Client();
export const BUCKET = process.env.R2_BUCKET_NAME ?? "moreclient";

/**
 * Build a scoped storage key for a principal's file.
 * Format: {principalType}/{principalId}/{purpose}/{ulid}.{ext}
 */
export function storageKey(
  principalType: "companies" | "talent",
  principalId: string,
  purpose: string,
  originalFilename: string,
): string {
  const ext = originalFilename.split(".").pop() ?? "bin";
  return `${principalType}/${principalId}/${purpose}/${generateId()}.${ext}`;
}

/**
 * Generate a pre-signed upload URL (PUT) valid for 15 minutes.
 */
export async function getUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 900,
): Promise<string> {
  if (!r2) throw new Error("Storage not configured");

  return getSignedUrl(
    r2,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn },
  );
}

/**
 * Delete a stored object by key.
 */
export async function deleteObject(key: string): Promise<void> {
  if (!r2) return;
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/**
 * Build the public URL for an R2 object.
 */
export function publicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL ?? "";
  return `${base}/${key}`;
}
