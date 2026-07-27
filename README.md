# E-Commerce Platform — Nigeria/Africa-first, global-ready

A full-stack e-commerce system — Node/Express + MongoDB REST API (clean, service-layer architecture), a React storefront, and a React admin panel — built to launch in Nigeria/Africa first (Paystack, NGN, delivery tracking) and expand globally later (multi-currency already built in). Orders, checkout, shoe/apparel inventory with per-size stock, reviews, wishlist, and Amazon/Jumia-style delivery tracking are all wired end-to-end, storefront included.

```
.
├── backend/            Express REST API — controllers → services → models
├── frontend/           Customer-facing React storefront (Vite), wired to the API
├── admin/              Admin panel (Vite) — products + order/tracking management
├── docker-compose.yml  Full stack: mongo + backend + frontend + admin
└── BUSINESS_MODEL.md   How this makes money (read this before launch)
```

## Can I ship this to real users this week?

**Yes — closer than before.** This round added the pieces that were the biggest gaps: transactional emails, forgot/reset password, email verification, checkout idempotency (no more double-orders from a double-click), a full refund workflow, admin can now manage shoe-specific fields from the UI, basic SEO (robots.txt/sitemap/JSON-LD/OpenGraph), and a WhatsApp support button.

### Before you flip it live
1. **Get live Paystack keys** and register the webhook URL (`https://your-api-domain.com/api/webhooks/paystack`) in the Paystack dashboard — without it, card/transfer payments stay "pending" forever.
2. **Configure SMTP** (`SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` in `backend/.env`) — without it, emails are logged, not sent, and customers get zero order/payment/shipping communication.
3. **Set a real `JWT_SECRET`**, real `ADMIN_EMAIL`/`ADMIN_PASSWORD`, real Cloudinary keys.
4. **Set `CORS_ORIGIN`** and `FRONTEND_URL` to your real domains, and **use MongoDB Atlas** for production (not the local `mongo:7` container with no backups).
5. **Put everything behind HTTPS.**
6. **Set a real delivery fee** in `order.service.js` (`buildOrderFromCart`) and confirm which courier you're using for the admin's tracking-number entry.
7. **Set `VITE_WHATSAPP_NUMBER`** (frontend `.env`) if you want the support button live.

### What's genuinely still missing
- **No SMS** (OTP, order/shipping/delivery/refund notifications) — needs you to pick and fund a provider (Termii/Africa's Talking are the common Nigeria-market choices) before it can be wired in; not done this round.
- **No coupon/discount codes.**
- **No real shipping-rate-by-destination calculation** — still a flat placeholder fee.
- **No automated test suite** — see the Engineering Report (`ENGINEERING_REPORT.md`) for the full audit.
- Admin product edit (only add/remove exist — there's no "edit an existing product" flow yet).
- Full engineering/security/performance/SEO audit, file-by-file changelog, and a production-readiness score are in **`ENGINEERING_REPORT.md`**.

## Quick start (Docker — recommended)

```bash
cp backend/.env.example backend/.env      # fill in real secrets — see below
docker compose up --build
```

- API: http://localhost:5000
- Storefront: http://localhost:5173
- Admin: http://localhost:5174
- Mongo data persists in the `mongo_data` volume.

## Quick start (local, no Docker)

```bash
npm run install:all
cp backend/.env.example backend/.env
npm run dev:backend       # http://localhost:5000
npm run dev:frontend      # http://localhost:5173
npm run dev:admin         # http://localhost:5174
```

## Deploying the backend anywhere (Railway, Render, Fly.io, ECS, a VPS...)

```bash
docker build -t ecommerce-backend ./backend
docker run -p 5000:5000 --env-file backend/.env ecommerce-backend
```
`GET /healthz` (liveness) and `GET /readyz` (readiness — checks MongoDB) are provided for your platform's health checks.

---

## Architecture: clean, layered, thin controllers

```
routes/        parses nothing, just wires HTTP verbs+paths to controllers + middleware
controllers/    parses the request, calls exactly one service function, shapes the response
services/       ALL business logic lives here — the only layer that talks to models directly
models/         Mongoose schemas
middleware/     auth, validation, rate limiting, error handling
```

Every controller is a few lines: pull what it needs off `req`, call a service, call `sendSuccess`. If you need to reuse checkout logic in a cron job, an admin tool, or a future GraphQL layer, you call `order.service.js` directly — none of the logic is trapped inside an Express handler.

## Session & authentication security

This app moves money, so session handling got specific attention:

- **Short-lived access tokens** (`ACCESS_TOKEN_EXPIRES_IN`, default 15 minutes) — if one leaks, the exposure window is small.
- **Server-side refresh tokens** (`RefreshToken` model, opaque random string, stored hashed): `POST /api/user/refresh-token` issues a new access token. Refresh tokens **rotate** on every use — the old one is revoked and reuse of an already-rotated token triggers automatic revocation of the whole session (a strong signal of theft/replay).
- **Real logout**: `POST /api/user/logout` revokes that one session; `POST /api/user/logout-all` revokes every session/device — useful as an "I think my account was compromised" button.
- **Account lockout**: `MAX_LOGIN_ATTEMPTS` wrong passwords (default 5) locks the account for `ACCOUNT_LOCK_MINUTES` (default 15) — stops brute-forcing one specific account even from many IPs (rate limiting alone only stops one IP).
- **Timing-safe login**: a non-existent email still runs a dummy bcrypt compare, so response time doesn't leak which emails are registered.
- **Cookies**: refresh token cookie is `httpOnly`, `sameSite=strict`, `secure` in production — inaccessible to JavaScript (mitigates XSS token theft) and not sent cross-site (mitigates CSRF).
- Native/Flutter clients get the refresh token in the JSON body too (cookies don't work the same way for mobile HTTP clients) — store it with `flutter_secure_storage`, not plain `SharedPreferences`.

## Roles & permissions (RBAC)

Four roles, defined in one place (`backend/src/constants/roles.js`) so the permission model is auditable at a glance instead of scattered across route files:

| Role | Can do |
|---|---|
| `customer` | Shop: browse, cart, checkout, orders, reviews, wishlist. Default role on self-registration. |
| `support` | View orders, update order/delivery status, view (not decide) refund requests, view customer info. Can't touch the catalog, coupons, or money. |
| `admin` | Everything support can, plus: manage products, manage coupons, approve/reject refunds, cancel orders. |
| `superadmin` | Everything admin can, plus: create/manage other staff accounts (`support`/`admin`/`superadmin`). |

**How staff accounts work**: unlike the earlier version of this project (a single hardcoded `ADMIN_EMAIL`/`ADMIN_PASSWORD` credential checked against `.env`, not stored anywhere), staff are now real `User` documents with a `role`. On first server boot, `ADMIN_EMAIL`/`ADMIN_PASSWORD` are used **once** to seed the initial superadmin account into the database (`user.service.js#seedSuperAdmin` — safe to leave in `.env`, it's a no-op once that account exists). From then on, manage staff from the admin panel's **Staff** page (superadmin-only): create support/admin accounts, promote/demote roles, deactivate accounts (which also instantly kills their active sessions — no waiting for token expiry).

Routes enforce this with `requirePermission(PERMISSIONS.X)` middleware (see `backend/src/middleware/adminAuth.js`) rather than one generic "is admin" check — e.g. a support agent's token can update an order's status but gets a 403 trying to delete a product or approve a refund.

**Migration note**: the customer JWT role claim changed from `"user"` to `"customer"` as part of this change. Because access tokens are short-lived (15 minutes) and refresh automatically, this self-heals within one refresh cycle — no manual data migration needed, just a brief window where very recently issued tokens need a re-login.

## Building a Flutter app against this API

The `User` model and every auth response were specifically hardened for this:
- **Consistent user shape everywhere**: register, login, staff-login, and `/me` all return the exact same `user` object shape (`id, name, email, phone, role, isEmailVerified, preferredCurrency`) — one Dart model class covers all of them.
- **Password hash and internal security fields can never leak**, even accidentally: `User.model.js` overrides `toJSON()` to strip `password`, `passwordResetTokenHash`, etc., regardless of which controller or `populate()` call touched the document — not just relying on `select: false` on individual queries, which only protects direct lookups.
- **Standard `Authorization: Bearer <token>` support** (in addition to the legacy custom header the React apps use) — a Flutter `http` or `dio` interceptor works with zero special-casing.
- **Refresh tokens are returned in the JSON body**, not only as an httpOnly cookie — mobile apps don't get browser cookie jars, so store `refreshToken` with `flutter_secure_storage` and POST it to `/api/user/refresh-token` on a 401 (see the API reference table below for the exact contract, and `frontend/src/utils/api.js` for a working reference implementation of this refresh flow in JS you can port to Dart).
- **Role is in every response**, so the app can immediately branch UI (e.g. a staff-facing Flutter build showing an order-management screen for `support`/`admin` logins) without a separate "am I an admin" call.

## Background jobs / event-driven architecture — do you need BullMQ?

**Not yet, and here's the actual reasoning rather than a reflexive "add a queue":**

Every email/SMS send in this codebase is already fire-and-forget (`.catch()`-handled, never `await`-blocking the request that triggered it) and now retries transiently-failed sends up to 3 times with exponential backoff (`backend/src/utils/retry.js`) — which captures most of what a job queue buys you (resilience to a brief provider hiccup, no blocked requests) without adding Redis as a new piece of infrastructure to deploy, monitor, and pay for.

**When to actually introduce BullMQ (or similar):**
- You need *guaranteed* delivery with a visible, queryable dead-letter queue (not just a log line) for compliance/support reasons.
- Notification volume grows enough that synchronous-even-if-non-blocking sending becomes a real resource concern (rough rule of thumb: tens of thousands of emails/day, not hundreds).
- You add genuinely long-running background work — bulk CSV product imports, scheduled reports, nightly reconciliation jobs — where "fire and forget with retry" isn't the right shape at all.
- You need scheduled/delayed jobs (e.g. "email a discount code 3 days after signup if they haven't ordered") — BullMQ's delayed-job support is the right tool for that specific pattern; a retry wrapper isn't.

If/when that day comes: add Redis, install `bullmq`, move the `emailService.send*` / `smsService.send*` calls into a `notifications` queue with a worker process, and keep the retry-with-backoff logic you already have as the *worker's* retry policy. The call sites in `order.service.js`/`user.service.js` barely change — you're swapping what's on the other side of the function call, not re-architecting how the app decides *when* to notify someone.

## Payments: Paystack (primary), designed to add more rails later

- `POST /api/orders` with `paymentMethod: "paystack"` initializes a Paystack transaction and returns `paystackAuthorizationUrl` — redirect the browser there (Paystack's own hosted checkout handles card/bank transfer/USSD, so no card data ever touches this server, which is the right way to stay out of PCI-DSS scope).
- **The webhook (`POST /api/webhooks/paystack`) is the only thing that marks an order `paid`** — never the browser redirect back to your site, which can be spoofed or interrupted. The webhook verifies Paystack's HMAC-SHA512 signature against the raw request body before trusting anything in it.
- `paymentMethod: "cod"` (Cash on Delivery) skips Paystack entirely — order is placed with `paymentStatus: "pending"` until marked paid manually (or on delivery, at the admin's discretion).
- Adding Stripe (or another rail) later follows the same pattern: a `services/<provider>.service.js`, a case in `order.service.js`'s `placeOrder`, and a webhook handler — Paystack's implementation is the template.

## Delivery & tracking (Jumia/Amazon-style)

- `Order.status` lifecycle: `placed → confirmed → processing → shipped → out_for_delivery → delivered` (or `cancelled`/`returned` at any point before delivery, which automatically restores reserved stock).
- `Order.trackingEvents` is a full timeline (status + optional note/location + timestamp), not just a single current status — rendered as a timeline on both the storefront's "My Orders" page and the admin Orders page.
- `trackingNumber`, `carrier`, and `estimatedDeliveryDate` are set by the admin (via the admin Orders UI) and exposed on a **public** `GET /api/orders/track/:trackingNumber` — no login required, same as pasting a tracking number into a courier's site.

## Selling shoes (and apparel)

- `Product` has optional `brand`, `color`, `gender` (`men`/`women`/`unisex`/`kids`), and **per-size stock** (`{"US 9": 3, "US 10": 0}`) — a shoe selling out in one size doesn't block others, and doesn't affect existing clothing-only products (all optional).
- Stock is soft-checked on add-to-cart (fast UX feedback) and **atomically reserved at checkout** — safe under two shoppers racing for the last pair, without needing a MongoDB replica set/transactions.

## Multi-currency (global-ready, launching Africa-first)

- `BASE_CURRENCY` defaults to `NGN`. All prices are stored in this one currency; `?currency=EUR` on product endpoints converts on the fly (`GET /api/currency` lists supported currencies + live rates).
- Set `EXCHANGE_RATE_API_KEY` (exchangerate-api.com) for live rates; otherwise a static fallback table is used.
- This means expanding beyond Africa later doesn't require re-architecting pricing — just add a payment rail for that region (Stripe for a US/EU expansion, following the Paystack pattern above) and set `SHIPPING_COUNTRIES` wider.

## Security hardening summary

- Helmet with HSTS + a conservative Content-Security-Policy, `X-Powered-By` disabled.
- `express-rate-limit`: generous global limit, tight limit on auth endpoints (login/register/admin-login).
- `express-mongo-sanitize` strips `$`/`.` operators from user input (NoSQL injection).
- `express-validator` on every mutating endpoint.
- Centralized error handling — stack traces never leak to clients in production.
- Structured JSON logs (Pino) with request correlation IDs and automatic redaction of passwords/tokens/cookies from logs.
- Non-root Docker users, multi-stage builds, `dumb-init` as PID 1 so `SIGTERM` (graceful shutdown, in-flight requests drained, DB connection closed cleanly) actually reaches the app.
- See "Session & authentication security" above for auth-specific hardening.

**What to still do**: put a WAF/DDoS layer in front in production (Cloudflare's free tier covers a lot), enable MongoDB Atlas's built-in encryption-at-rest and IP allowlisting, and consider a secrets manager (not just `.env` files) once you have a team accessing production config.

---

## Checkout idempotency

`POST /api/orders` accepts an optional `idempotencyKey` (body field or `Idempotency-Key` header) — generate one UUID per checkout attempt on the client (the storefront does this automatically). A double-click, a client retry after a dropped response, or a flaky network replaying the same request all return the **same** order instead of creating duplicates and double-reserving stock. The database enforces this with a compound unique index (`user` + `idempotencyKey`), so it holds even under real concurrency, not just at the application-logic level.

## Refund workflow

`Order.refund` tracks a full lifecycle: `none → requested → approved/rejected → completed`.
- Customer: `POST /api/orders/:orderId/refund-request` (from "My Orders" once an order is paid).
- Admin: `GET /api/orders/refunds` (pending queue), `PATCH /api/orders/:orderId/refund/approve` or `/reject`.
- Approving a Paystack order calls Paystack's real refund API; approving a COD order just records it (the actual money movement for COD refunds happens outside the system — bank transfer, etc. — confirmed manually by the admin).
- Approval automatically restores stock (unless already restored by a cancellation) and emails the customer.

## Transactional email

Every major lifecycle moment sends an email (or logs what would have been sent, if `SMTP_HOST` isn't configured): welcome on signup, email verification, password reset, order confirmation, payment confirmation, shipping/status updates, refund confirmation, and an admin new-order alert. All emails share one reusable branded layout (`src/templates/emailLayout.js`) and are sent through a provider-agnostic SMTP service (`nodemailer` — works with SendGrid, Mailgun, Postmark, Resend's SMTP relay, or Gmail SMTP for local testing). Every send is fire-and-forget from the checkout/auth flow — a slow or down email provider can never fail or delay the actual request that triggered it.

## SEO

- `GET /robots.txt` and `GET /sitemap.xml` are generated dynamically by the backend (the sitemap needs to list every product page, which a static file can't do) and proxied through to the storefront's own domain by the shipped `frontend/nginx.conf` — so crawlers hitting your real domain get them, not the API subdomain.
- Per-page `<title>`/meta description + `Product` JSON-LD structured data (price, availability, rating) on product pages via a small dependency-free `useSEO` hook.
- Static `Organization` JSON-LD, OpenGraph, and Twitter Card tags in `index.html`.
- **Honest limitation**: this is a client-rendered SPA, not server-rendered. Google's crawler executes JavaScript and will pick up the per-page tags, but link-preview scrapers that don't run JS (some older WhatsApp/Slack previews) will only see the static `index.html` defaults, not the specific product's title/image. If rich per-product link previews matter a lot to you, that requires server-side rendering or pre-rendering (e.g. Next.js or a prerender service) — a real architecture change, not a small addition.
- The admin panel is explicitly excluded from indexing (`X-Robots-Tag: noindex`, a disallow-all `robots.txt`).

## Customer support

A floating WhatsApp button (bottom-right, every page) opens a pre-filled chat with your support number. Configure `VITE_WHATSAPP_NUMBER` in `frontend/.env`; the button renders nothing if unset.

## API reference (for the storefront, admin, or a Flutter app)

Base URL: `{BACKEND_URL}`. All responses: `{ "success": true|false, "message": "...", ...data }`. Authenticate with `Authorization: Bearer <accessToken>`.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/user/register` | – | `{ name, email, password }`. Password must be 8+ chars with an uppercase letter, lowercase letter, and symbol. Returns `token` (access) + `refreshToken` + `user`. Sends welcome + verification email. |
| POST | `/api/user/login` | – | `{ email, password }`. Customers only — account locks after `MAX_LOGIN_ATTEMPTS` failures. |
| POST | `/api/user/admin` | – | `{ email, password }`. Staff login (support/admin/superadmin) — same lockout policy. |
| POST | `/api/user/refresh-token` | – | Rotates the refresh token, returns a new access token (role re-checked from the database). |
| GET | `/api/user/me` | User/Staff | Current profile, including `role`. |
| PATCH | `/api/user/profile` | User | `{ name?, phone? }`. |
| POST | `/api/user/change-password` | User | `{ currentPassword, newPassword }`. Revokes all other sessions. |
| GET/POST/DELETE | `/api/user/addresses` `/api/user/addresses/:addressId` | User | Manage saved shipping addresses. |
| POST | `/api/user/forgot-password` | – | `{ email }`. Always returns success (doesn't leak which emails exist). |
| POST | `/api/user/reset-password` | – | `{ token, password }`. Same password policy as register. Revokes all sessions on success. |
| POST | `/api/user/verify-email` | – | `{ token }`. |
| POST | `/api/user/resend-verification` | User | Resends the verification email. |
| POST | `/api/user/logout` | – | Revokes the current session. |
| POST | `/api/user/logout-all` | User | Revokes every session/device. |
| GET/POST/DELETE | `/api/user/wishlist` | User | Save/list/remove products. |
| PATCH | `/api/user/currency` | User | Set preferred display currency. |
| GET/POST/PATCH | `/api/user/staff` `/api/user/staff/:staffId` | Superadmin | Create/list/update staff accounts (`{ name, email, password, role }` to create; `{ role?, active? }` to update). |
| GET | `/api/product/list` | – | `?page&limit&category&subCategory&brand&gender&bestseller&search&currency`. |
| GET | `/api/product/single` | – | `?productId=&currency=`. |
| POST | `/api/product/add` | Admin+ | multipart: `name, description, price, category, subCategory, sizes, bestseller, brand?, color?, gender?, stock?, sku?, image1..4`. |
| PATCH | `/api/product/:productId` | Admin+ | Same fields as add, all optional — partial update, including replacing individual image slots. |
| POST | `/api/product/remove` | Admin+ | `{ id }`. |
| POST/PUT/POST | `/api/cart/add` `/api/cart/update` `/api/cart/get` | User | Server-persisted cart. |
| POST | `/api/coupons/validate` | User | `{ code, subtotal }`. Preview a discount before checkout. |
| GET/POST/PATCH/DELETE | `/api/coupons` `/api/coupons/:couponId` | Admin+ | Manage discount codes. |
| POST | `/api/orders` | User | `{ shippingAddress, paymentMethod: "cod"\|"paystack", currency?, idempotencyKey?, couponCode? }`. Sends order-confirmation email. |
| GET | `/api/orders/mine` | User | Order history. |
| GET | `/api/orders/:orderId` | User | Single order (owner only). |
| GET | `/api/orders/track/:trackingNumber` | – | Public tracking lookup. |
| POST | `/api/orders/:orderId/refund-request` | User | `{ reason }`. |
| GET | `/api/orders` | Support+ | `?status&page&limit`. |
| GET | `/api/orders/refunds` | Support+ | Pending refund request queue (view only for support; decide requires admin+). |
| PATCH | `/api/orders/:orderId/status` | Support+ | `{ status?, trackingNumber?, carrier?, estimatedDeliveryDate?, note?, location? }`. Emails the customer on status change. |
| PATCH | `/api/orders/:orderId/refund/approve` `/reject` | Admin+ | `{ amount?, adminNote? }`. Approving a Paystack order calls Paystack's refund API. |
| POST | `/api/webhooks/paystack` | Paystack only (HMAC-verified) | Marks orders paid/failed, sends payment-confirmation email. |
| GET/POST | `/api/products/:productId/reviews` | – / User | List / create a review. |
| DELETE | `/api/reviews/:reviewId` | User | Delete your own review. |
| GET | `/api/currency` | – | Supported currencies + live rates. |
| GET | `/robots.txt` `/sitemap.xml` | – | SEO (dynamic, includes every product page). |
| GET | `/healthz` `/readyz` | – | Liveness / readiness probes. |

### Example (Flutter / `http` package)

```dart
final res = await http.post(
  Uri.parse('$backendUrl/api/user/login'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({'email': email, 'password': password}),
);
final data = jsonDecode(res.body);
if (data['success'] == true) {
  // store both securely with flutter_secure_storage:
  final accessToken = data['token'];
  final refreshToken = data['refreshToken'];
  // subsequent requests: headers: {'Authorization': 'Bearer $accessToken'}
  // on a 401, POST /api/user/refresh-token with {'refreshToken': refreshToken}
}
```

## Environment variables

Full list with explanations in `backend/.env.example`. Generate a strong `JWT_SECRET` with `openssl rand -hex 64`.

## What changed from the original codebase (critical bugs fixed)

The original project had a number of bugs that would break in production; these were fixed rather than papered over:

- **Cart API was empty stubs.** Fully implemented, then further wired into real checkout.
- **`cartRouter.js` had a stray character causing a syntax error** that crashed the server on import.
- **Admin auth was fundamentally broken** — it signed a JWT from a raw concatenated string and compared the decoded token against that same string, which `jwt.verify()` can never produce. Rebuilt as a real signed payload with proper session handling.
- **`GET /api/user/logout` was wired to the `adminLogin` handler.**
- **A duplicate, broken product-creation function** referenced `req.file` (undefined for a multi-file upload) and was exposed on a second, **unauthenticated** route that let anyone create products. Removed.
- **`bcrypt`/`bcryptjs` package mismatch**, a `error/message` division-typo instead of `error.message`, and a model registered as `"user "` (trailing space) — all fixed.
- **Multer wrote uploads to local disk** with no destination configured — doesn't work in an ephemeral container. Switched to in-memory streaming straight to Cloudinary.
- **A stray `"server": "file:.."` dependency** in `frontend/`/`admin/` `package.json` would break isolated Docker builds. Removed.
- **Fake/hardcoded frontend pages**: the original `Orders.jsx` rendered sample products with a hardcoded "25 July 2024" date instead of real orders, and `PlaceOrder.jsx` had a checkout form with no submit handler at all (the button just navigated to `/order` without placing anything). Both are now wired to the real API.

## Notes

- `uploads/` at the repo root is legacy sample data from the old disk-storage setup — the API no longer reads/writes it (all images go through Cloudinary). Safe to delete.
- Read `BUSINESS_MODEL.md` before setting `COMMISSION_RATE` or deciding your delivery-fee numbers — those are business decisions this README intentionally doesn't make for you.
