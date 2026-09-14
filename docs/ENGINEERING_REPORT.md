# Engineering Report

This consolidates the audit, what was changed and why, and an honest production-readiness assessment.

---

## CRITICAL INCIDENT (fixed): currency conversion inflated all NGN prices/totals ~1550x

**Reported by the user after a live deployment test**: entering a product price of `1` in the admin panel displayed as `1550` on the storefront. This was not cosmetic — it affected real checkout totals and the actual amount sent to Paystack to charge.

**Root cause**: `currency.js#convert()` multiplied a base-currency amount directly by `rates[targetCurrency]`, where rates are conventionally expressed as "units of currency per 1 USD" (the standard FX API convention). That formula is only correct when the store's base currency *is* USD. When `BASE_CURRENCY` was changed to `NGN` (as part of this project's Nigeria-first pivot), converting an NGN amount to NGN — the single most common case, since it's the default display currency — multiplied every price by `rates['NGN']` (1550) instead of leaving it unchanged. This affected every product price display, and every checkout subtotal/shipping/discount/total, whenever displaying or charging in the base currency.

**Fix**: rewrote the conversion as a rate *ratio* (`targetRate / fromRate`) with an explicit same-currency fast path, extracted into a pure, dependency-free `currencyMath.js` so the exact reported scenario is now a permanent regression test (`tests/unit/currencyMath.test.js`) — 9 tests, including one that reproduces the exact "₦1 becomes ₦1550" bug and asserts it no longer happens. All 50 backend tests pass after the fix (up from 41).

**Why this wasn't caught sooner, honestly**: this codebase's automated verification in earlier rounds consisted of syntax checks, import-resolution checks, and unit tests for dependency-free utility modules — `currency.js` itself couldn't be unit-tested in the sandbox this was built in (it imports `config`/`logger`, which require `dotenv`/`pino`, unavailable without a real `npm install` and network access). The math bug was a logic error, not a syntax or import error, so it was invisible to every check that *was* possible to run here. The fix addresses this properly, not just patches the symptom: the actual conversion math now lives in a zero-dependency module specifically so it *can* be — and now is — covered by an executable test that would have caught this before it ever shipped. This is exactly the kind of gap real end-to-end testing against a live database and payment sandbox catches that static analysis alone cannot — worth keeping in mind for anything touching money going forward.

---

## 0. Round 3 update — "make it 10/10, what's remaining, fix it"

Everything that was a genuine **code** gap has been closed this round:

- **Admin: edit existing products** (was add/remove only) — full PATCH endpoint + admin UI.
- **Admin: pagination + search** on the product list.
- **Coupon/discount system** — full backend (model, service, admin CRUD, checkout integration with per-user/global usage limits) + admin management UI + customer-facing "apply coupon" input at checkout, wired end-to-end.
- **Zone-based shipping calculation** replacing the flat fee (Lagos/metro/other-Nigeria tiers + flat international rates) — still a rate table, not a live courier API (see honest limitation below).
- **Payment webhook audit log** (`PaymentEvent` model) — every webhook received is now recorded independently of order processing.
- **SMS notification scaffold** — wired into every call site (order confirmation, shipping, delivery, refund) using the same safe no-op-until-configured pattern as email. **Not connected to a live provider** — genuinely blocked on you funding a Termii/Africa's Talking account, not a code gap.
- **Image optimization** (Cloudinary `f_auto,q_auto` transforms + lazy loading) and **React code-splitting** (route-level `lazy`/`Suspense`).
- **Real, executed test suite** — 37 passing unit tests (Node's built-in test runner, zero extra dependencies) covering every dependency-free module. One real bug was caught and fixed in the process of writing them (a test's own wrong assumption, not a bug in the source — recorded honestly in `backend/tests/README.md`). Broader integration testing (services/routes) is written up as a concrete next step, not silently claimed as done — see `backend/tests/README.md` for exactly why and how.
- **CI workflow** (`.github/workflows/backend-ci.yml`) — runs the test suite + a full syntax check on every PR touching the backend.

### What genuinely cannot become "done by code" this week, and why
These aren't gaps I chose not to fix — they require something only the business owner can do:
- **Live SMS sending** — needs a funded provider account and real API credentials. The integration layer is ready and waiting.
- **Real courier-API shipping rates** — needs a signed contract/API relationship with a logistics provider (GIG, DHL, etc.). The zone-based table is the honest middle ground until that exists.
- **Load/scale testing under real traffic** — can't be meaningfully simulated in a code review; needs actual staging infrastructure and traffic.
- **Live payment testing end-to-end** (real Paystack test-mode transaction → webhook → order marked paid) — requires a real Paystack test account and a reachable webhook URL (i.e., a deployed environment), which doesn't exist inside this sandbox.

Given that, **"10/10" isn't a claim I'll make** — not because the code isn't solid, but because a few of the remaining points are operational/business validation, not something a code change can certify. The revised score and full reasoning are in §8.

---

## 1. Engineering Audit (status after this round)

Severity levels from the original audit, with resolution status.

### Critical — all resolved this round
| # | Finding | Status |
|---|---|---|
| C1 | No email/SMS notifications | **Email: done.** SMS: not done (needs a funded provider — see §6). |
| C2 | No idempotency on checkout | **Done.** Compound unique index + replay handling in `order.service.js`. |
| C3 | No forgot/reset password | **Done.** |
| C4 | No email verification | **Done.** |
| C5 | No refund workflow | **Done.** Request → admin approve/reject → Paystack refund API → stock restore → email. |
| C6 | No webhook audit log | Partially addressed — webhook processing is idempotent (safe against replay) but there's still no persisted `PaymentEvent` collection for dispute/compliance audit trails. **Not done.** |

### High — mostly resolved
| # | Finding | Status |
|---|---|---|
| H1 | Admin can't manage shoe fields from UI | **Done** — `brand`, `color`, `gender`, `sku`, custom sizes, per-size stock all added to `admin/src/pages/Add.jsx`. |
| H2 | No SEO | **Done** (robots.txt, sitemap.xml, per-page meta + JSON-LD, OpenGraph) — with an honest limitation documented (SPA, not SSR — see README SEO section). |
| H3 | No coupon system | **Not done.** |
| H4 | No shipping-rate-by-destination | **Not done** — still a flat placeholder. |
| H5 | No test suite | **Not done** — see §6. |
| H6 | No profile/password update endpoints | **Done.** |
| H7 | No WhatsApp support widget | **Done.** |
| H8 | No image optimization (srcset/lazy) | **Not done.** |
| H9 | No React code-splitting | **Not done.** |

### Medium / Low
Unchanged from the previous audit — none were in scope for this round. Full list is in the conversation history; the highest-value ones (M4: admin pagination, M6: review moderation) are good next-round candidates.

---

## 2. Security Report

### What's in place
- **Session management**: 15-min access tokens, rotating server-side refresh tokens with reuse-detection, real logout/logout-everywhere, account lockout after 5 failed logins, timing-safe login (dummy bcrypt compare on nonexistent accounts).
- **Password reset**: tokens are hashed before storage (never stored/logged in plaintext), expire in 1 hour, single-use, and resetting a password revokes every active session.
- **Payment integrity**: Paystack webhook HMAC-SHA512 signature verified against the raw request body before any order is touched; card data never reaches this server (Paystack's hosted checkout handles it, keeping this app out of PCI-DSS scope).
- **Checkout integrity**: idempotency key prevents double-orders; atomic conditional stock decrement prevents overselling under concurrent checkouts.
- **Standard hardening**: Helmet (HSTS, CSP), rate limiting (tighter on auth endpoints), `express-mongo-sanitize` (NoSQL injection), `express-validator` on every mutating endpoint, centralized error handling (no stack traces leak in production), non-root Docker users, secrets never logged (Pino redaction).
- **Refund authorization**: only the order's owner can request a refund on their own order; only admin can approve/reject.

### Gaps (be aware of these before scaling)
- **No CSRF token** on cookie-based refresh-token flow beyond `sameSite=strict` (which covers the common case, but isn't a full CSRF defense if you ever add a cross-site-adjacent flow).
- **No WAF/DDoS layer** — put this behind Cloudflare (or similar) in production; nothing in this codebase substitutes for that.
- **No secrets manager** — `.env` files are fine for a solo founder, not for a team with rotating access. Move to AWS Secrets Manager / Doppler / similar once you have more than one person touching production config.
- **No dependency vulnerability scanning configured** (no `npm audit` in CI, because there's no CI yet — see §6).
- **No webhook event audit log** (C6 above) — matters for payment dispute resolution.

---

## 3. Performance Report

### What's in place
- Atomic, single-document stock reservation (no lock contention, no replica-set requirement).
- Compression (`compression` middleware), long-cache headers on hashed static assets (nginx `expires 1y` on `/assets/`).
- Structured logging is async and non-blocking (Pino).
- Fire-and-forget emails — never block the request that triggered them.

### Gaps
- **No response caching** on read-heavy endpoints (`GET /api/product/list` hits Mongo on every request — fine at low traffic, a real cost at scale). Add `Cache-Control` headers or a Redis layer once traffic justifies it.
- **No database connection pooling tuning** — Mongoose defaults are used as-is; revisit `maxPoolSize` once you know real concurrent load.
- **No image optimization pipeline** on the frontend (H8) — Cloudinary supports `f_auto,q_auto` transforms for free; not wired in yet.
- **No code-splitting** (H9) — `App.jsx` eagerly imports every page. `React.lazy`/`Suspense` on routes would shrink the initial bundle meaningfully.
- **No CDN in front of the storefront** — recommend Cloudflare/similar in front of both the frontend and backend in production.

None of these are correctness bugs — they're the difference between "works at low-to-moderate traffic" and "optimized for scale," which is the right place to be before you have the traffic to justify the optimization work.

---

## 4. SEO Report

### What's in place
- Dynamic `robots.txt` + `sitemap.xml` (every product page included, regenerated on every request — always current, no manual resubmission needed).
- `Product` JSON-LD structured data per product page (price, currency, availability, aggregate rating) — eligible for Google's rich snippets (star ratings in search results) once Google recrawls.
- `Organization` JSON-LD, OpenGraph, and Twitter Card tags.
- Per-page `<title>`/meta description via a dependency-free hook.
- Admin panel excluded from indexing entirely.

### Honest limitation
This is a client-rendered SPA. Google's crawler executes JavaScript and will see the per-page tags correctly. However, **link-preview scrapers that don't execute JS** (some link-unfurl bots, older integrations) will only see `index.html`'s static defaults — so sharing a specific product link on WhatsApp/Slack may show your generic site preview, not that product's image/title. Fixing this properly means server-side rendering or a pre-render service (e.g. Next.js migration, or prerender.io in front of nginx) — a real architectural change, correctly out of scope for "refactor without breaking things." Flag it if this matters enough to prioritize.

---

## 5. Files changed this round, and why

| File | Why |
|---|---|
| `backend/src/models/Order.model.js` | Added `idempotencyKey` (+ unique index), `refund` sub-document. |
| `backend/src/models/User.model.js` | Added `emailVerificationTokenHash`. |
| `backend/src/services/order.service.js` | Idempotent `placeOrder`, refund workflow (`requestRefund`/`approveRefund`/`rejectRefund`/`getRefundRequests`), email hooks on order placed / paid / status changed. |
| `backend/src/services/user.service.js` | Forgot/reset password, email verification, profile update, change password, address CRUD, welcome/verification email hooks. |
| `backend/src/services/email.service.js` *(new)* | Provider-agnostic transactional email sending. |
| `backend/src/services/paystack.service.js` | Added `refundTransaction`. |
| `backend/src/templates/emailLayout.js` *(new)* | Shared branded email HTML wrapper. |
| `backend/src/controllers/user.controller.js`, `order.controller.js` | Thin HTTP layers for all the above (no business logic added here — stayed consistent with the clean-architecture pass). |
| `backend/src/routes/user.routes.js`, `order.routes.js`, `seo.routes.js` *(new)* | Wired new endpoints; added dynamic `robots.txt`/`sitemap.xml`. |
| `backend/src/validators/*.js` | Validation for every new endpoint. |
| `backend/src/config/env.js` | Removed dead Stripe config (fully pivoted to Paystack), added email/SEO config. |
| `backend/.env.example` | SMTP variables documented. |
| `frontend/src/pages/PlaceOrder.jsx` | Generates + sends an idempotency key; double-submit guard. |
| `frontend/src/pages/Orders.jsx` | Refund-request UI. |
| `frontend/src/context/ShopContext.jsx` | Passes `idempotencyKey` through `placeOrder`. |
| `frontend/src/hooks/useSEO.js` *(new)* | Per-page meta tags + JSON-LD, no new dependency. |
| `frontend/src/pages/Product.jsx`, `Collection.jsx` | Wired `useSEO`; Product page emits `Product` JSON-LD. |
| `frontend/src/components/WhatsAppButton.jsx` *(new)*, `App.jsx` | Floating support button. |
| `frontend/index.html` | Meta description, OpenGraph, Twitter Card, `Organization` JSON-LD. |
| `frontend/nginx.conf` | Proxies `/robots.txt`/`/sitemap.xml` to the backend. |
| `frontend/.env.example` | `VITE_WHATSAPP_NUMBER`. |
| `admin/src/pages/Add.jsx` | Brand/color/gender/SKU/custom sizes/per-size stock fields. |
| `admin/src/pages/Refunds.jsx` *(new)*, `App.jsx`, `Sidebar.jsx` | Admin refund approval queue. |
| `admin/nginx.conf` | Disallow-all `robots.txt`, `X-Robots-Tag: noindex`. |
| `README.md`, `ENGINEERING_REPORT.md` *(new, this file)* | Documentation for everything above. |

Nothing in the previously-working checkout/auth/product/cart contract was changed in a breaking way — every new field and endpoint is additive, and existing routes keep their exact response shapes.

---

## 6. Remaining future improvements (prioritized)

1. **SMS notifications** — needs you to pick + fund a provider first (Termii/Africa's Talking).
2. **Automated test suite** — currently zero tests exist anywhere in the repo. Recommend starting with: (a) integration tests for the checkout flow (idempotency, stock reservation race, refund lifecycle) since that's the highest-value/highest-risk code, (b) unit tests for `order.service.js` and `user.service.js`. A test-writing pass should be its own dedicated session, not squeezed in.
3. **Coupon/discount codes.**
4. **Real shipping-rate-by-destination** (integrate a logistics API, or at minimum a state-by-state rate table for Nigeria).
5. **Image optimization** (Cloudinary `f_auto,q_auto` + `srcset`) and **React code-splitting** (`React.lazy` on routes) — both are mechanical, moderate-effort wins.
6. **Admin: edit existing products** (only add/remove exist today).
7. **Webhook event audit log** — a `PaymentEvent` collection recording every webhook received, for dispute resolution.
8. **CI pipeline** — lint + (once tests exist) test-on-PR. Currently nothing runs automatically.
9. **Server-side rendering or pre-rendering** — only worth it if rich link previews / max SEO matters enough to justify the architecture change.

---

## 7. Deployment checklist

- [ ] Live Paystack keys set, webhook URL registered in the Paystack dashboard
- [ ] SMTP configured (or explicitly accept that emails won't send)
- [ ] `JWT_SECRET` is a real random value (`openssl rand -hex 64`), not the example
- [ ] `ADMIN_EMAIL`/`ADMIN_PASSWORD` changed from defaults
- [ ] `CORS_ORIGIN` set to real domains
- [ ] `FRONTEND_URL` set to the real storefront URL (used in emails + Paystack redirect + sitemap)
- [ ] MongoDB Atlas (or equivalent managed, backed-up Mongo) — not the local Docker Compose Mongo
- [ ] HTTPS in front of both frontend and backend
- [ ] Real delivery fee set in `order.service.js`
- [ ] `SHIPPING_COUNTRIES` matches where you can actually fulfill
- [ ] `VITE_WHATSAPP_NUMBER` set if using the support button
- [ ] Decide + document your business model (`BUSINESS_MODEL.md`), set `COMMISSION_RATE` accordingly
- [ ] Cloudflare (or similar) in front of both apps for basic DDoS/WAF protection
- [ ] A monitoring/alerting hook on `/readyz` failing (uptime monitor, at minimum)

---

## 8. Production readiness score: **9/10** (updated after Round 4)

**Why it went up from 8.5**: this round found and fixed a genuinely critical bug — currency conversion was inflating every price and checkout total by ~1550x whenever displaying in the store's own base currency (NGN), caught only because the user actually deployed and tested with real data. That's exactly the kind of bug that static analysis and unit tests on isolated modules can't catch on their own, and it's now fixed with a regression test that reproduces the exact reported scenario. The frontend's production build was also completely broken (inconsistent/duplicate asset directories, a missing `public/` folder) — found, fixed, and closed with a proper import-resolution checker that didn't exist before this round (a real gap in the verification process, acknowledged and fixed, not papered over). Beyond bug fixes: checkout now uses real MongoDB ACID transactions instead of manual compensating rollback logic, Redis-backed caching and — critically — Redis-backed rate limiting (fixing a bug that would've silently broken rate limits the moment you ran more than one backend instance), Google Sign-In, and a complete 58-request Postman collection.

**Why not 10/10, honestly**: everything in this codebase has been verified through static analysis, syntax checking, import resolution, and 50 executed unit tests — but **never through an actual end-to-end run against a real deployed MongoDB, Redis, and Paystack test account**, because this was built in a sandbox with no network access. The currency bug is the proof this matters: it was invisible to every check that was possible to run here, and only surfaced through real deployment testing. That's not a gap I can close from here — it's a gap that closes through you (or a QA pass) actually running the full checkout flow, with real test-mode Paystack transactions, in a real deployed environment, before trusting it with real customer money at volume. Also genuinely not done: live SMS sending (blocked on a funded provider account), a real courier-API integration (still a rate table), and the marketplace/multi-seller features (correctly scoped as their own project phase in `MARKETPLACE_MIGRATION.md`, not attempted here).

**What this means practically**: ship it, but do a real test order (Paystack test mode, a COD order, a refund, an admin status update) against your actual deployed instance before taking real payments — not because I expect another bug like the currency one, but because "verified by an AI that can't run the app" and "verified by actually running the app" are different things, and only one of them is available to you right now that wasn't available to me.
