import express from 'express';
import mongoose from 'mongoose';
import { isDBConnected } from '../db/mongoose.js';

const healthRouter = express.Router();

// Liveness: is the process up at all. Used by Docker HEALTHCHECK.
healthRouter.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness: is the process actually able to serve traffic (DB connected).
// Useful for orchestrators (k8s/ECS) to gate traffic, and handy for the
// Flutter app / uptime monitors to distinguish "server up" from "server
// healthy".
healthRouter.get('/readyz', (req, res) => {
  const dbUp = isDBConnected();
  const dbState = mongoose.connection.readyState; // 1 = connected
  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? 'ok' : 'degraded',
    dependencies: { mongodb: dbUp ? 'connected' : `not connected (state ${dbState})` },
  });
});

export default healthRouter;
