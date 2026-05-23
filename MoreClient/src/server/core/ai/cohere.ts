import { CohereClient } from "cohere-ai";

function createCohereClient() {
  const token = process.env.COHERE_API_KEY;
  if (!token) return null;
  return new CohereClient({ token });
}

export const cohereClient = createCohereClient();

export const COHERE_EMBED_MODEL = "embed-multilingual-v3.0";
export const COHERE_RERANK_MODEL = "rerank-multilingual-v3.0";
export const EMBEDDING_DIMS = 1024;

export function requireCohere(): CohereClient {
  if (!cohereClient) throw new Error("COHERE_API_KEY is not configured");
  return cohereClient;
}
