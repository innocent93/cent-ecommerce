import app from './src/app.js';
import config from './src/config/env.js';
import logger from './src/config/logger.js';
import connectDB, { disconnectDB } from './src/db/mongoose.js';
import connectCloudinary from './src/db/cloudinary.js';
import { seedSuperAdmin } from './src/services/user.service.js';

let server;

const start = async () => {
  await connectDB();
  connectCloudinary();

  // Ensures exactly one superadmin account exists (created from
  // ADMIN_EMAIL/ADMIN_PASSWORD) so there's a real staff login on day one —
  // see user.service.js#seedSuperAdmin for details. Safe/no-op on every
  // subsequent boot.
  await seedSuperAdmin();

  server = app.listen(config.port, () => {
    logger.info(`Server listening on port ${config.port} [${config.nodeEnv}]`);
  });
};

// --- Graceful shutdown --------------------------------------------------
// Ensures in-flight requests finish and the DB connection closes cleanly
// when the container receives SIGTERM (e.g. `docker stop`, k8s pod
// eviction, ECS deployment rollover) instead of dropping connections.
const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  if (!server) {
    process.exit(0);
    return;
  }
  server.close(async (err) => {
    if (err) {
      logger.error({ err }, 'Error during server close');
      process.exit(1);
    }
    try {
      await disconnectDB();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (closeErr) {
      logger.error({ err: closeErr }, 'Error closing DB connection');
      process.exit(1);
    }
  });

  // Force-exit if graceful shutdown hangs (e.g. a stuck connection).
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception — exiting');
  process.exit(1);
});

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
