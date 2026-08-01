import getRedisClient, { isRedisConfigured } from '../db/redis.js';
import config from '../config/env.js';
import logger from '../config/logger.js';

// Cache-aside helper: get from cache, or compute + store on miss. Every
// call site (product.service.js, currency.js) stays correct even with
// Redis completely absent — it just always takes the "miss" path and hits
// the database directly, exactly like before caching existed. This is
// deliberate: a cache should be a pure performance optimization that's safe
// to disable, never a hidden dependency for correctness.
export const cached = async (key, ttlSeconds, computeFn) => {
  const redis = await getRedisClient();
  if (!redis) return computeFn();

  try {
    const hit = await redis.get(key);
    if (hit !== null) return JSON.parse(hit);
  } catch (err) {
    logger.warn({ err, key }, 'Redis GET failed, falling back to source of truth');
  }

  const value = await computeFn();

  try {
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds ?? config.cacheTtlSeconds });
  } catch (err) {
    logger.warn({ err, key }, 'Redis SET failed (value still returned, just not cached)');
  }

  return value;
};

// Deletes every key matching a prefix — used to invalidate all cached
// product-list variants (different filter/sort/page combinations each have
// their own cache key) in one call when a product changes.
export const invalidateByPrefix = async (prefix) => {
  const redis = await getRedisClient();
  if (!redis) return;

  try {
    let cursor = 0;
    do {
      const result = await redis.scan(cursor, { MATCH: `${prefix}*`, COUNT: 100 });
      cursor = result.cursor;
      if (result.keys.length > 0) await redis.del(result.keys);
    } while (cursor !== 0);
  } catch (err) {
    logger.warn({ err, prefix }, 'Redis cache invalidation failed');
  }
};

export const isCacheEnabled = isRedisConfigured;

export default { cached, invalidateByPrefix, isCacheEnabled };
