import { OPENAI_API_KEY, OPENAI_BASE_URL } from "./env";

export const EMBED_DIM = 1536;

// Returns one embedding per input string, or null arrays when keyless.
export async function embedTexts(texts: string[]): Promise<(number[] | null)[]> {
  if (texts.length === 0) return [];
  if (!OPENAI_API_KEY) return texts.map(() => null);

  try {
    const res = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: texts,
      }),
    });
    if (!res.ok) return texts.map(() => null);
    const data = (await res.json()) as { data: { embedding: number[] }[] };
    return data.data.map((d) => d.embedding);
  } catch {
    return texts.map(() => null);
  }
}

export async function embedOne(text: string): Promise<number[] | null> {
  const [first] = await embedTexts([text]);
  return first ?? null;
}

// pgvector accepts `[1,2,3]` as a string literal for vector columns.
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
