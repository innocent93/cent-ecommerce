import rateLimit from 'express-rate-limit';
import config from '../config/env.js';

const jsonHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests, please try again later',
  });
};

// Applied globally: generous limit to stop scraping / abuse without
// affecting normal storefront or mobile app traffic.
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});

// Applied only to login/register/admin-login: tight limit to blunt
// credential-stuffing and brute-force attacks.
export const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
  skipSuccessfulRequests: true,
});

export default apiLimiter;
