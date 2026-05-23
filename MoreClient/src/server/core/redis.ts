import { Redis } from "@upstash/redis";

function createRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing Upstash Redis configuration");
    }
    return null;
  }

  return new Redis({ url, token });
}

export const redis = createRedisClient();
