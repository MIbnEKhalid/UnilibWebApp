import redis from "../config/redis.js";

// Redis helpers (no-ops if redis client not initialized)
export async function cacheGet(key) {
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch (e) {
    console.error("Redis GET error:", e);
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds) {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (e) {
    console.error("Redis SET error:", e);
  }
}

export async function invalidateIndexCaches() {
  if (!redis) return;
  try {
    const keys = await redis.keys("index:*");
    if (keys && keys.length) {
      await redis.del(...keys);
    }
  } catch (e) {
    console.error("Redis invalidate index caches error:", e);
  }
}

export async function invalidateBookCache(bookId) {
  if (!redis) return;
  try {
    await redis.del(`book:${bookId}`);
  } catch (e) {
    console.error("Redis del book error:", e);
  }
}

// Invalidate multiple book caches at once to avoid N+1 Redis calls
export async function invalidateBookCaches(bookIds) {
  if (!redis) return;
  if (!Array.isArray(bookIds) || bookIds.length === 0) return;
  try {
    const keys = bookIds.map((id) => `book:${id}`);
    await redis.del(...keys);
  } catch (e) {
    console.error("Redis del multiple books error:", e);
  }
}

export default {
  cacheGet,
  cacheSet,
  invalidateIndexCaches,
  invalidateBookCache,
  invalidateBookCaches,
};
