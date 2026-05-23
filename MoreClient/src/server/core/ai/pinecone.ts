import { Pinecone } from "@pinecone-database/pinecone";

function createPineconeClient() {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) return null;
  return new Pinecone({ apiKey });
}

export const pineconeClient = createPineconeClient();

export const PINECONE_INDEX = process.env.PINECONE_INDEX ?? "moreclient";

export const PINECONE_NAMESPACES = {
  talent: "talent",
  jobs: "jobs",
  kbEn: "kb-en",
  kbAr: "kb-ar",
} as const;

export function requirePinecone(): Pinecone {
  if (!pineconeClient) throw new Error("PINECONE_API_KEY is not configured");
  return pineconeClient;
}

export function getPineconeIndex() {
  const pc = requirePinecone();
  return pc.index(PINECONE_INDEX);
}
