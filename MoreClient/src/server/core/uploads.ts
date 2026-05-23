import { AppError } from "./errors";

// ─── File type detection ──────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
  document: ["application/pdf", "text/plain", "text/markdown"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  archive: ["application/zip"],
};

const DANGEROUS_MIME_TYPES = new Set([
  "application/x-msdownload",
  "application/x-executable",
  "application/x-sh",
  "text/x-shellscript",
  "application/x-msdos-program",
  "application/vnd.ms-excel.sheet.macroEnabled.12",  // .xlsm
  "application/vnd.ms-word.document.macroEnabled.12", // .docm
  "application/vnd.ms-powerpoint.presentation.macroEnabled.12", // .pptm
]);

// Magic byte signatures for MIME sniffing
const MAGIC_BYTES: Array<{ sig: number[]; mime: string }> = [
  { sig: [0xFF, 0xD8, 0xFF], mime: "image/jpeg" },
  { sig: [0x89, 0x50, 0x4E, 0x47], mime: "image/png" },
  { sig: [0x47, 0x49, 0x46], mime: "image/gif" },
  { sig: [0x52, 0x49, 0x46, 0x46], mime: "image/webp" },
  { sig: [0x25, 0x50, 0x44, 0x46], mime: "application/pdf" },
  { sig: [0x50, 0x4B, 0x03, 0x04], mime: "application/zip" },
  { sig: [0x66, 0x74, 0x79, 0x70], mime: "video/mp4" }, // offset 4
];

export function sniffMimeType(buffer: Uint8Array): string | null {
  for (const { sig, mime } of MAGIC_BYTES) {
    const offset = mime === "video/mp4" ? 4 : 0;
    if (buffer.length >= offset + sig.length) {
      const match = sig.every((byte, i) => buffer[offset + i] === byte);
      if (match) return mime;
    }
  }
  return null;
}

// ─── Plan-based size caps (bytes) ────────────────────────────────────────────

const SIZE_CAPS_BY_PLAN: Record<string, number> = {
  free: 5 * 1024 * 1024,    // 5 MB
  pro: 25 * 1024 * 1024,    // 25 MB
  scale: 100 * 1024 * 1024, // 100 MB
  "talent-free": 5 * 1024 * 1024,
  "talent-pro": 25 * 1024 * 1024,
};

export function maxFileSizeForPlan(planCode: string): number {
  return SIZE_CAPS_BY_PLAN[planCode] ?? 5 * 1024 * 1024;
}

// ─── Password-protected PDF detection ────────────────────────────────────────

export function isPasswordProtectedPdf(buffer: Uint8Array): boolean {
  const text = Buffer.from(buffer.slice(0, 2048)).toString("latin1");
  return text.includes("/Encrypt");
}

// ─── Macro-enabled Office document detection ─────────────────────────────────

export function hasMacroSignature(filename: string): boolean {
  return /\.(docm|xlsm|pptm|xlam|dotm)$/i.test(filename);
}

// ─── Main validation ──────────────────────────────────────────────────────────

export interface UploadValidationOptions {
  planCode?: string;
  allowedCategories?: Array<keyof typeof ALLOWED_MIME_TYPES>;
  maxSizeBytes?: number;
}

export function validateUpload(
  buffer: Uint8Array,
  filename: string,
  declaredMime: string,
  opts: UploadValidationOptions = {},
): void {
  // 1. Dangerous MIME type block
  if (DANGEROUS_MIME_TYPES.has(declaredMime)) {
    throw new AppError("UNPROCESSABLE", "File type not allowed", 422);
  }

  // 2. Macro-enabled Office check
  if (hasMacroSignature(filename)) {
    throw new AppError("UNPROCESSABLE", "Macro-enabled Office files are not allowed", 422);
  }

  // 3. MIME sniff & mismatch detection
  const sniffed = sniffMimeType(buffer);
  if (sniffed && sniffed !== declaredMime) {
    const bothOk =
      (declaredMime.startsWith("image/") && sniffed.startsWith("image/")) ||
      (declaredMime === "video/mp4" && sniffed === "video/mp4");
    if (!bothOk) {
      throw new AppError("UNPROCESSABLE", "File content does not match declared type", 422);
    }
  }

  // 4. Category whitelist
  if (opts.allowedCategories) {
    const allowed = opts.allowedCategories.flatMap((cat) => ALLOWED_MIME_TYPES[cat] ?? []);
    if (!allowed.includes(declaredMime)) {
      throw new AppError("UNPROCESSABLE", `File type '${declaredMime}' is not allowed here`, 422);
    }
  }

  // 5. Size cap
  const maxBytes = opts.maxSizeBytes ?? (opts.planCode ? maxFileSizeForPlan(opts.planCode) : 5 * 1024 * 1024);
  if (buffer.length > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    throw new AppError("UNPROCESSABLE", `File exceeds the ${mb} MB size limit for your plan`, 422);
  }

  // 6. Password-protected PDF
  if (declaredMime === "application/pdf" && isPasswordProtectedPdf(buffer)) {
    throw new AppError("UNPROCESSABLE", "Password-protected PDFs are not accepted", 422);
  }
}

// ─── Safe filename generation ─────────────────────────────────────────────────

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "application/zip": "zip",
};

export function safeFilename(principalId: string, mime: string): string {
  const ext = MIME_TO_EXT[mime] ?? "bin";
  const timestamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `uploads/${principalId}/${timestamp}-${rand}.${ext}`;
}
