import { createClient } from 'redis';
import config from '../config/env.js';
import logger from '../config/logger.js';

let client = null;
let connectPromise = null;

// Lazily connects on first use rather than at import time — keeps the
// module safe to import even when REDIS_URL isn't set (development,
// or a deliberately single-instance deployment that doesn't need it yet).
export const getRedisClient = async () => {
  if (!config.redisUrl) return null;
  if (client?.isOpen) return client;

  if (!connectPromise) {
    client = createClient({ url: config.redisUrl });
    client.on('error', (err) => logger.error({ err }, 'Redis client error'));
    client.on('reconnecting', () => logger.warn('Redis reconnecting...'));
    client.on('connect', () => logger.info('Redis connected'));
    connectPromise = client.connect().catch((err) => {
      logger.error({ err }, 'Failed to connect to Redis — caching and cross-instance rate limiting are disabled');
      connectPromise = null;
      client = null;
      return null;
    });
  }

  return connectPromise;
};

export const isRedisConfigured = () => Boolean(config.redisUrl);

export const disconnectRedis = async () => {
  if (client?.isOpen) await client.quit();
};

export default getRedisClient;
