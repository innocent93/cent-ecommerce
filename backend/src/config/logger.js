import pino from 'pino';
import config from './env.js';

// In production we emit plain JSON logs (ideal for log aggregators like
// CloudWatch, Loki, Datadog...). In development we pretty-print for humans.
const logger = pino({
  level: config.logLevel,
  base: { service: 'ecommerce-backend', env: config.nodeEnv },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.token',
      'req.headers.cookie',
      'password',
      'req.body.password',
      '*.password',
    ],
    censor: '[REDACTED]',
  },
  transport: config.isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      },
});

export default logger;
