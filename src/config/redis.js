import { Redis } from "@upstash/redis";
import config from "./index.js";

const REDIS_ENABLED = config.redisEnabled;

let redis = null;

if (!REDIS_ENABLED) {
  console.log("Upstash Redis disabled via REDIS_ENABLED env var.");
} else if (config.redisUrl && config.redisToken) {
  try {
    redis = new Redis({ url: config.redisUrl, token: config.redisToken });
    console.log("Upstash Redis client initialized");
  } catch (err) {
    console.error("Failed to initialize Upstash Redis client:", err);
    redis = null;
  }
} else {
  console.warn("Upstash Redis env vars not set. Redis caching disabled.");
}

export const isRedisEnabled = REDIS_ENABLED;
export default redis;
