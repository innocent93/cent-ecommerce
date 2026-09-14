import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import config from '../config/env.js';
import logger from '../config/logger.js';
import getRedisClient, { isRedisConfigured } from '../db/redis.js';

const jsonHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests, please try again later',
  });
};

// CRITICAL for horizontal scaling: express-rate-limit's default store keeps
// counts in that process's memory. Run this behind a load balancer with
// more than one instance (which you must, to handle real traffic) and each
// instance enforces the limit independently — a client hitting 3 instances
// round-robin effectively gets 3x the intended limit, and worse, an
// account-lockout-adjacent limit like authLimiter becomes meaningless
// against a distributed attacker. When REDIS_URL is set, counts are shared
// across every instance via Redis instead.
//
// Built lazily (on first request, not at module-import time) so server
// startup never blocks on — or fails because of — Redis being slow to
// accept a connection; requests simply use the safe in-memory store until
// the Redis-backed one finishes initializing, then swap over.
const buildLimiter = (options) => {
  let limiter = rateLimit({ ...options, store: undefined }); // in-memory until Redis is ready
  let upgraded = !isRedisConfigured();

  if (!upgraded) {
    getRedisClient()
      .then((client) => {
        if (!client) {
          logger.warn('Redis configured but unreachable — rate limiting staying in-memory (per-instance)');
          return;
        }
        limiter = rateLimit({
          ...options,
          store: new RedisStore({ sendCommand: (...args) => client.sendCommand(args) }),
        });
        upgraded = true;
        logger.info('Rate limiting upgraded to shared Redis store');
      })
      .catch((err) => logger.error({ err }, 'Failed to upgrade rate limiter to Redis store'));
  }

  // Thin proxy: always delegates to whichever limiter instance is current,
  // so the swap above is invisible to app.js (it just gets a normal
  // Express middleware function either way).
  return (req, res, next) => limiter(req, res, next);
};

// Applied globally: generous limit to stop scraping / abuse without
// affecting normal storefront or mobile app traffic.
export const apiLimiter = buildLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});

// Applied only to login/register/admin-login: tight limit to blunt
// credential-stuffing and brute-force attacks.
export const authLimiter = buildLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
  skipSuccessfulRequests: true,
});

export default apiLimiter;
