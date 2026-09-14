// Error tracking — same "optional, never a hidden dependency" philosophy
// as cache.service.js's Redis handling: with SENTRY_DSN unset, every export
// here is a safe no-op and the app runs exactly as it did before Sentry
// existed. Structured pino logs (config/logger.js) remain the source of
// truth either way; Sentry adds alerting + aggregation on top, it doesn't
// replace them.
import * as Sentry from '@sentry/node';
import config from './env.js';
import logger from './logger.js';

export const sentryEnabled = Boolean(config.sentryDsn);

export const initSentry = () => {
  if (!sentryEnabled) {
    logger.info('SENTRY_DSN not set — error tracking disabled (errors still go to structured logs)');
    return;
  }

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,
    // Traces are sampled, not exceptions — every exception is always
    // captured regardless of this setting. Keep this low in production;
    // it's for performance monitoring, not error visibility.
    tracesSampleRate: config.isProduction ? 0.1 : 0,
    // This app moves money and handles PII (addresses, phone numbers) —
    // never let Sentry auto-attach request bodies/cookies/headers. Same
    // redaction stance as the pino logger.
    sendDefaultPii: false,
  });

  logger.info('Sentry error tracking initialized');
};

// Called explicitly from errorHandler.js for 5xx errors — not every 4xx
// (a bad request or invalid login isn't an "error" worth paging anyone
// over), and guarded so call sites never need their own `if (sentryEnabled)`
// check.
export const captureException = (err, context) => {
  if (!sentryEnabled) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
};

export default Sentry;
