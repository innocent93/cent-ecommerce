import { randomUUID } from 'crypto';
import pinoHttp from 'pino-http';
import logger from '../config/logger.js';

// Every request gets a correlation/request ID (reused from the
// X-Request-Id header if the caller/proxy already set one), which is
// echoed back in the response and attached to every log line for that
// request — essential for tracing a single Flutter app request through logs.
const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'];
    const id = existing || randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} completed`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} failed: ${err.message}`,
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
      };
    },
  },
});

export default requestLogger;
