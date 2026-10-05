import redis from "../config/redis.js";

// In-Memory L1 Cache (Instant sub-millisecond fallback/caching)
const memoryCache = new Map();
const MAX_MEM_ITEMS = 500;

function getMem(key) {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return item.value;
}

function setMem(key, value, ttlSeconds) {
  if (memoryCache.size >= MAX_MEM_ITEMS) {
    const firstKey = memoryCache.keys().next().value;
    memoryCache.delete(firstKey);
  }
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

function delMemPattern(prefix) {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}

// Cache GET (L1 Memory -> L2 Redis)
export async function cacheGet(key) {
  const memValue = getMem(key);
  if (memValue !== null) return memValue;

  if (!redis) return null;
  try {
    const val = await redis.get(key);
    if (val !== null) {
      setMem(key, val, 60); // Populate L1 cache for 60s
    }
    return val;
  } catch (e) {
    console.error("Redis GET error:", e);
    return null;
  }
}

// Cache SET (L1 Memory & L2 Redis)
export async function cacheSet(key, value, ttlSeconds = 120) {
  setMem(key, value, ttlSeconds);
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (e) {
    console.error("Redis SET error:", e);
  }
}

export async function invalidateIndexCaches() {
  delMemPattern("index:");
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
  delMemPattern(`book:${bookId}`);
  if (!redis) return;
  try {
    await redis.del(`book:${bookId}`);
  } catch (e) {
    console.error("Redis del book error:", e);
  }
}

// Invalidate multiple book caches at once to avoid N+1 Redis calls
export async function invalidateBookCaches(bookIds) {
  if (!Array.isArray(bookIds) || bookIds.length === 0) return;
  for (const id of bookIds) {
    delMemPattern(`book:${id}`);
  }
  if (!redis) return;
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

