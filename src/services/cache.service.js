/**
 * Unilib Cache Service
 * Provides Redis caching (designed for Upstash Redis or standard Redis instances)
 * with an automatic, resilient in-memory TTL cache fallback when Redis is unconfigured or unreachable.
 */
import Redis from "ioredis";
import { config } from "../config/env.js";

class MemoryCacheStore {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, ttlSeconds = 300) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });
  }

  del(key) {
    return this.store.delete(key);
  }

  delPattern(pattern) {
    // Convert glob-like pattern (e.g. unilib:course:*) to regex
    const regexPattern = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    let count = 0;
    for (const key of this.store.keys()) {
      if (regexPattern.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  clear() {
    this.store.clear();
  }
}

export class CacheService {
  constructor() {
    this.memoryCache = new MemoryCacheStore();
    this.redisClient = null;
    this.useRedis = false;
    this.initRedis();
  }

  initRedis() {
    if (!config.redisCacheEnabled || !config.redisUrl) {
      console.log("[Cache] Redis URL not specified; using resilient in-memory TTL caching.");
      return;
    }

    try {
      this.redisClient = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        lazyConnect: false,
        enableOfflineQueue: false,
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn("[Cache] Redis reconnect limit reached; falling back to memory store.");
            this.useRedis = false;
            return null; // Stop retrying
          }
          return Math.min(times * 1000, 3000);
        },
      });

      this.redisClient.on("connect", () => {
        console.log("[Cache] Connected to Upstash Redis.");
        this.useRedis = true;
      });

      this.redisClient.on("ready", () => {
        this.useRedis = true;
      });

      this.redisClient.on("error", (err) => {
        console.warn("[Cache] Redis error, operating in memory fallback:", err.message);
        this.useRedis = false;
      });

      this.redisClient.on("close", () => {
        this.useRedis = false;
      });
    } catch (err) {
      console.warn("[Cache] Could not initialize Redis client, using memory store:", err.message);
      this.useRedis = false;
    }
  }

  isRedisConnected() {
    return this.useRedis && this.redisClient?.status === "ready";
  }

  async get(key) {
    if (this.isRedisConnected()) {
      try {
        const raw = await this.redisClient.get(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.type === "Buffer" && Array.isArray(parsed.data)) {
            return Buffer.from(parsed.data);
          }
          return parsed;
        }
      } catch (err) {
        console.warn(`[Cache] Redis GET error for ${key}:`, err.message);
      }
    }
    return this.memoryCache.get(key);
  }

  async set(key, value, ttlSeconds = 300) {
    // Keep memory fallback in sync
    this.memoryCache.set(key, value, ttlSeconds);

    if (this.isRedisConnected()) {
      try {
        await this.redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
      } catch (err) {
        console.warn(`[Cache] Redis SET error for ${key}:`, err.message);
      }
    }
  }

  async del(key) {
    this.memoryCache.del(key);
    if (this.isRedisConnected()) {
      try {
        await this.redisClient.del(key);
      } catch (err) {
        console.warn(`[Cache] Redis DEL error for ${key}:`, err.message);
      }
    }
  }

  async clear() {
    this.memoryCache.clear();
    await this.delPattern("unilib:*");
  }

  async delPattern(pattern) {
    this.memoryCache.delPattern(pattern);

    if (this.isRedisConnected()) {
      try {
        // SCAN for matching keys to avoid blocking Redis KEYS command
        const stream = this.redisClient.scanStream({
          match: pattern,
          count: 50,
        });

        const keysToDelete = [];
        for await (const keys of stream) {
          if (keys.length) {
            keysToDelete.push(...keys);
          }
        }

        if (keysToDelete.length > 0) {
          await this.redisClient.del(...keysToDelete);
        }
      } catch (err) {
        console.warn(`[Cache] Redis SCAN/DEL pattern error for ${pattern}:`, err.message);
      }
    }
  }

  async wrap(key, ttlSeconds, fetchFunction) {
    const cached = await this.get(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const fresh = await fetchFunction();
    if (fresh !== undefined) {
      await this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }
}

export const cacheService = new CacheService();
export default cacheService;

