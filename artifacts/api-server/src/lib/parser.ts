// Best-effort text extraction for common knowledge-base formats.
// Heavy parsers (pdf-parse, mammoth, xlsx) are dynamically imported so a
// missing or broken module never crashes the whole server.

export type ParsedFile = { text: string; type: string };

export async function extractText(
  buffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<ParsedFile> {
  const lower = filename.toLowerCase();
  const ext = lower.includes(".") ? lower.split(".").pop()! : "";

  if (ext === "txt" || ext === "md" || mimetype.startsWith("text/")) {
    return { text: buffer.toString("utf8"), type: ext || "txt" };
  }

  if (ext === "pdf" || mimetype === "application/pdf") {
    try {
      // pdf-parse default export: (buf) => { text }
      const mod = (await import("pdf-parse")) as unknown as {
        default?: (b: Buffer) => Promise<{ text: string }>;
        pdf?: (b: Buffer) => Promise<{ text: string }>;
      };
      const fn = mod.default || mod.pdf;
      if (!fn) return { text: "", type: "pdf" };
      const out = await fn(buffer);
      return { text: out.text, type: "pdf" };
    } catch {
      return { text: "", type: "pdf" };
    }
  }

  if (ext === "docx" || mimetype.includes("officedocument.wordprocessingml")) {
    try {
      const mod = (await import("mammoth")) as {
        extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string }>;
      };
      const out = await mod.extractRawText({ buffer });
      return { text: out.value, type: "docx" };
    } catch {
      return { text: "", type: "docx" };
    }
  }

  if (ext === "xlsx" || ext === "xls" || mimetype.includes("spreadsheetml")) {
    try {
      const xlsx = (await import("xlsx")) as typeof import("xlsx");
      const wb = xlsx.read(buffer, { type: "buffer" });
      const parts: string[] = [];
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        if (!sheet) continue;
        parts.push(`# ${sheetName}\n${xlsx.utils.sheet_to_csv(sheet)}`);
      }
      return { text: parts.join("\n\n"), type: "xlsx" };
    } catch {
      return { text: "", type: "xlsx" };
    }
  }

  // Fallback: treat as utf-8 text.
  return { text: buffer.toString("utf8"), type: ext || "bin" };
}

// Chunk text into ~800-char segments on whitespace boundaries.
export function chunkText(text: string, target = 800): string[] {
  const cleaned = text.replace(/\r/g, "").replace(/\u0000/g, "").trim();
  if (!cleaned) return [];

  const chunks: string[] = [];
  let buf = "";
  const paragraphs = cleaned.split(/\n{2,}/);

  for (const para of paragraphs) {
    const piece = para.trim();
    if (!piece) continue;
    if ((buf + "\n\n" + piece).length <= target) {
      buf = buf ? `${buf}\n\n${piece}` : piece;
      continue;
    }
    if (buf) chunks.push(buf);
    if (piece.length <= target) {
      buf = piece;
    } else {
      // Hard-split very long paragraphs.
      buf = "";
      for (let i = 0; i < piece.length; i += target) {
        chunks.push(piece.slice(i, i + target));
      }
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}
