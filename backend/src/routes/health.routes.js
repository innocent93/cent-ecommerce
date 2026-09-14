import express from 'express';
import mongoose from 'mongoose';
import { isDBConnected } from '../db/mongoose.js';
import getRedisClient, { isRedisConfigured } from '../db/redis.js';

const healthRouter = express.Router();

// Liveness: is the process up at all. Used by Docker HEALTHCHECK.
healthRouter.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness: is the process actually able to serve traffic (DB connected,
// and Redis if configured). Useful for orchestrators (k8s/ECS) to gate
// traffic, and handy for the Flutter app / uptime monitors to distinguish
// "server up" from "server healthy". Redis is reported but does NOT fail
// readiness on its own — the app degrades gracefully without it (see
// cache.service.js / rateLimiter.js), so a Redis outage shouldn't take the
// whole API out of rotation, just lose caching/shared-rate-limit benefits.
healthRouter.get('/readyz', async (req, res) => {
  const dbUp = isDBConnected();
  const dbState = mongoose.connection.readyState; // 1 = connected

  let redisStatus = 'not configured';
  if (isRedisConfigured()) {
    const client = await getRedisClient();
    redisStatus = client ? 'connected' : 'configured but unreachable';
  }

  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? 'ok' : 'degraded',
    dependencies: {
      mongodb: dbUp ? 'connected' : `not connected (state ${dbState})`,
      redis: redisStatus,
    },
  });
});

export default healthRouter;
