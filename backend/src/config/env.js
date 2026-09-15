// Centralized, validated environment configuration.
// Fails fast at boot if required variables are missing instead of
// crashing later mid-request (or worse, silently misbehaving).
import dotenv from 'dotenv';

dotenv.config();

const required = (name, { optional = false, fallback } = {}) => {
  const value = process.env[name];
  if (value === undefined || value === '') {
    if (optional) return fallback;
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const toArray = (value) =>
  (value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

let config;

try {
  config = {
    nodeEnv: NODE_ENV,
    isProduction,
    port: Number(required('PORT', { optional: true, fallback: '5000' })),

    mongoUri: required('MONGO_URI'),

    jwt: {
      secret: required('JWT_SECRET'),
      // Access tokens are now short-lived by design (session security — see
      // README). Refresh tokens are the long-lived credential and are
      // stored server-side (RefreshToken model) so they can be revoked.
      accessExpiresIn: required('ACCESS_TOKEN_EXPIRES_IN', { optional: true, fallback: '15m' }),
      refreshExpiresIn: required('REFRESH_TOKEN_EXPIRES_IN', { optional: true, fallback: '30d' }),
      // Applies to all staff roles (support/admin/superadmin) — shorter
      // than a customer's, since a compromised staff token is more
      // damaging. Env var name kept as JWT_ADMIN_EXPIRES_IN for backward
      // compatibility with existing .env files.
      staffExpiresIn: required('JWT_ADMIN_EXPIRES_IN', { optional: true, fallback: '4h' }),
      adminExpiresIn: required('JWT_ADMIN_EXPIRES_IN', { optional: true, fallback: '4h' }),
    },

    admin: {
      email: required('ADMIN_EMAIL'),
      password: required('ADMIN_PASSWORD'),
    },

    cloudinary: {
      cloudName: required('CLOUDINARY_NAME'),
      apiKey: required('CLOUDINARY_API_KEY'),
      apiSecret: required('CLOUDINARY_SECRET_KEY'),
    },

    cors: {
      // Comma separated list of allowed origins, e.g.
      // CORS_ORIGIN=https://shop.example.com,https://admin.example.com
      // Falls back to "*" only outside production so local dev keeps working.
      origins: toArray(process.env.CORS_ORIGIN),
    },

    rateLimit: {
      windowMs: Number(required('RATE_LIMIT_WINDOW_MS', { optional: true, fallback: '900000' })), // 15 min
      max: Number(required('RATE_LIMIT_MAX', { optional: true, fallback: '300' })),
      authMax: Number(required('AUTH_RATE_LIMIT_MAX', { optional: true, fallback: '20' })),
    },

    logLevel: required('LOG_LEVEL', { optional: true, fallback: isProduction ? 'info' : 'debug' }),

    bodyLimit: required('BODY_LIMIT', { optional: true, fallback: '2mb' }),

    // --- Redis (caching + cross-instance rate limiting) ---------------------
    // Optional in development (everything falls back to in-memory/no-op —
    // see cache.service.js and rateLimiter.js), but required once you run
    // more than one backend instance behind a load balancer: without it,
    // rate limits and cached data are per-process, not shared, which
    // silently breaks both at real scale. See SCALING.md.
    redisUrl: process.env.REDIS_URL || '',
    sentryDsn: process.env.SENTRY_DSN || '',
    cacheTtlSeconds: Number(required('CACHE_TTL_SECONDS', { optional: true, fallback: '60' })),

    // --- Google Sign-In (optional) -------------------------------------
    // Free — see README's "Google Login" section for how to get this at
    // no cost from Google Cloud Console. Login with Google is simply
    // disabled (button hidden, endpoint returns a clear error) if unset.
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',

    // --- Global commerce -----------------------------------------------
    baseCurrency: required('BASE_CURRENCY', { optional: true, fallback: 'NGN' }),
    exchangeRateApiKey: required('EXCHANGE_RATE_API_KEY', { optional: true, fallback: '' }),

    // Comma separated list of ISO country codes you currently ship to, e.g.
    // "US,CA,GB,DE,NG". Empty = ship everywhere (no restriction).
    shippingCountries: toArray(process.env.SHIPPING_COUNTRIES),

    // --- Paystack (primary payment rail for Nigeria/Africa) ----------------
    paystack: {
      secretKey: required('PAYSTACK_SECRET_KEY', { optional: true, fallback: '' }),
      publicKey: required('PAYSTACK_PUBLIC_KEY', { optional: true, fallback: '' }),
    },

    // Public URL of the storefront, used to build the Paystack redirect
    // callback URL (e.g. https://shop.example.com/order/confirmation).
    frontendUrl: required('FRONTEND_URL', { optional: true, fallback: 'http://localhost:5173' }),

    // What the platform keeps per order (see BUSINESS_MODEL.md), 0.1 = 10%.
    commissionRate: Number(required('COMMISSION_RATE', { optional: true, fallback: '0.1' })),

    // --- Account security ---------------------------------------------------
    maxLoginAttempts: Number(required('MAX_LOGIN_ATTEMPTS', { optional: true, fallback: '5' })),
    accountLockMinutes: Number(required('ACCOUNT_LOCK_MINUTES', { optional: true, fallback: '15' })),

    // Cookie settings for the refresh-token cookie.
    cookieDomain: required('COOKIE_DOMAIN', { optional: true, fallback: '' }),

    // --- Transactional email --------------------------------------------
    // Transactional email is sent through the Resend HTTP API. EMAIL_FROM_ADDRESS
    // must be a sender/domain verified in the Resend dashboard; a placeholder
    // such as no-reply@example.com will be rejected by Resend in production.
    email: {
      provider: 'resend',
      enabled: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM_ADDRESS),
      apiKey: process.env.RESEND_API_KEY || '',
      fromName: process.env.EMAIL_FROM_NAME || 'UrbanStep',
      fromEmail: process.env.EMAIL_FROM_ADDRESS || 'no-reply@example.com',
      adminNotifyEmail: process.env.ADMIN_NOTIFY_EMAIL || '',
      replyTo: process.env.EMAIL_REPLY_TO || '',
    },

    // --- SMS (Termii/Africa's Talking-ready, see sms.service.js) -----------
    sms: {
      apiKey: process.env.SMS_API_KEY || '',
      senderId: process.env.SMS_SENDER_ID || '',
    },
  };
} catch (err) {
  // Intentionally logged with console here: the structured logger depends on
  // config, which hasn't finished initializing yet.
  // eslint-disable-next-line no-console
  console.error(`[FATAL] Invalid configuration: ${err.message}`);
  process.exit(1);
}

if (config.isProduction && config.cors.origins.length === 0) {
  // eslint-disable-next-line no-console
  console.warn(
    '[WARN] CORS_ORIGIN is not set in production. No cross-origin browser clients will be allowed ' +
      '(native/mobile clients like Flutter are unaffected since they do not send an Origin header).'
  );
}

export default config;
