import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';

import config from './config/env.js';
import requestLogger from './middleware/requestLogger.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import userRouter from './routes/user.routes.js';
import productRouter from './routes/product.routes.js';
import cartRouter from './routes/cart.routes.js';
import healthRouter from './routes/health.routes.js';
import seoRouter from './routes/seo.routes.js';
import orderRouter from './routes/order.routes.js';
import { productReviewRouter, reviewRouter } from './routes/review.routes.js';
import currencyRouter from './routes/currency.routes.js';
import couponRouter from './routes/coupon.routes.js';
import webhookRouter from './routes/webhook.routes.js';
import sellerRouter from './routes/seller.routes.js';
import sellerProductRouter from './routes/sellerProduct.routes.js';
import sellerOrderRouter from './routes/sellerOrder.routes.js';
import payoutRouter, { sellerPayoutRouter } from './routes/payout.routes.js';

const app = express();

// Trust the first proxy hop (nginx/load balancer/Docker) so req.ip,
// rate-limiting and secure cookies behave correctly behind a reverse proxy.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// --- Security headers ---------------------------------------------------
// This app moves money, so headers are tightened beyond helmet's defaults:
// HSTS forces HTTPS on every future visit, and a conservative CSP blocks
// most injected-script XSS even if a sanitization gap is ever missed
// elsewhere. Adjust connectSrc/imgSrc if you add new third-party domains.
app.use(
  helmet({
    hsts: { maxAge: 15552000, includeSubDomains: true, preload: true },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
  })
);
app.use(
  cors({
    origin: config.cors.origins.length > 0 ? config.cors.origins : config.isProduction ? [] : true,
    credentials: true, // required so the refresh-token cookie is sent/received cross-origin
  })
);
app.use(compression());

// --- Paystack webhook: MUST be mounted before express.json() ------------
// Signature verification needs the exact raw bytes Paystack sent; once
// express.json() consumes/parses the body stream, that's no longer
// available. Also intentionally excluded from apiLimiter below — Paystack,
// not a browser, calls this, and rate-limiting it risks dropping real
// payment confirmations.
app.use('/api/webhooks', webhookRouter);

app.use(express.json({ limit: config.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));
app.use(cookieParser());
app.use(mongoSanitize()); // strips $/. operators from user input (NoSQL injection guard)
app.use(requestLogger);

// --- Health checks (no rate limiting, no auth) ------------------------
app.use('/', healthRouter);
app.use('/', seoRouter);

// --- Rate limiting for the rest of the API -------------------------------
app.use('/api', apiLimiter);

// --- API routes (same paths as the original app) ----------------------
app.use('/api/user', userRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);
app.use('/api/products/:productId/reviews', productReviewRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/currency', currencyRouter);
app.use('/api/coupons', couponRouter);

// --- Marketplace (Option B) — see MARKETPLACE_MIGRATION.md ---------------
app.use('/api/seller', sellerRouter);
app.use('/api/seller/products', sellerProductRouter);
app.use('/api/seller/orders', sellerOrderRouter);
app.use('/api/seller/payouts', sellerPayoutRouter);
app.use('/api/payouts', payoutRouter);

app.get('/', (req, res) => {
  res.json({ success: true, message: 'E-commerce API is running' });
});

// --- 404 + centralized error handling ----------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
