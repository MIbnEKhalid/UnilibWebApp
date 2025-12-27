import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();

// Allow turning Redis on/off explicitly. Treat 'false' or '0' (case-insensitive) as disabled.
const REDIS_ENABLED = !["false", "0"].includes((process.env.REDIS_ENABLED || "").toLowerCase());

let redis = null;

if (!REDIS_ENABLED) {
  console.log("Upstash Redis disabled via REDIS_ENABLED env var.");
} else if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
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
