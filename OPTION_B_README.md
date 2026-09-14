# Option B: Marketplace — What's Built in This Zip

This zip is Option A (everything in the main `README.md`/`ENGINEERING_REPORT.md`) **plus** a fully implemented multi-vendor marketplace backend. Read this first — it tells you exactly what's real and tested vs. what's an honest next step, the same way every other doc in this project has.

## What's built, wired, and verified

- **`Seller` model** — separate collection from `User` (own auth, own bank details, own approval status). See `MARKETPLACE_MIGRATION.md` for why this is a separate collection rather than another RBAC role.
- **Seller auth** (`/api/seller/register`, `/login`, `/refresh-token`, `/me`) — same lockout/timing-safe-login/session-revocation patterns as customer and staff auth, reusing the existing token infrastructure rather than duplicating it.
- **Seller-scoped product management** (`/api/seller/products`) — a seller can only create/edit/delete their own products; ownership is enforced in `product.service.js`, not just hidden in a UI. Requires `status: 'approved'` — a pending seller can log in and check their status but can't list products yet.
- **Admin seller approval** (`/api/seller` GET, `/api/seller/:sellerId/status` PATCH) — gated by a new `PERMISSIONS.SELLER_MANAGE` permission (admin+, not support).
- **Multi-seller checkout** — the actual hard part. A cart spanning products from different sellers (and/or the platform's own inventory) splits into one `Order` per seller at checkout, all sharing a `checkoutSessionId` and one Paystack charge (`paymentReference`), inside a single MongoDB transaction — either the whole checkout commits (every seller's stock reserved, every Order created) or none of it does.
- **Proportional coupon splitting** — a coupon applied to a multi-seller cart is validated once against the whole cart, then its discount is allocated across seller groups by subtotal share, using rounding-safe pure math (`utils/orderSplit.js`) that's guaranteed to sum to exactly the original discount — tested explicitly (11 passing tests), following the exact lesson from the currency-conversion bug documented in `ENGINEERING_REPORT.md`: money-splitting math lives in small, isolated, testable functions, not buried inline.
- **Seller-scoped order management** (`/api/seller/orders`) — a seller sees and updates only their own orders.
- **Refund safety check** — attempting to refund an order that's already been paid out to its seller now fails loudly with an explicit message, instead of silently letting the platform's and seller's numbers stop reconciling (the most common real bug in marketplace payout systems, called out in `MARKETPLACE_MIGRATION.md` before this was even built).
- **Paystack Transfer Recipients + Transfers** (`paystack.service.js`) — registering a seller's bank details, and moving real money to them.
- **Payout system** (`/api/payouts`, admin-triggered) — computes a seller's payable balance (paid + *delivered* orders only — not just paid, since a not-yet-delivered order could still be refunded), locks those specific orders to the payout inside a transaction (preventing two concurrent payout runs from double-paying the same orders), then calls Paystack. A failed transfer leaves the `Payout` record retryable without re-selecting orders that might get picked up by a second, overlapping payout run.

**61 backend tests pass** (up from 50 in the Option A zip), including 11 new tests specifically for the proportional-discount-splitting math — the single highest-risk piece of new logic, tested with the same rigor the currency bug taught was necessary.

## Update: the seller-facing frontend now exists

The gap noted below has been closed — `seller/` is a full React + Tailwind dashboard wired to
every endpoint in this doc. See `seller/README.md` for what's built, the design direction, and how
to run it (`npm run dev:seller`, port 5175; also wired into `docker-compose.yml` and `render.yaml`).

The original reasoning for sequencing it after the backend is still worth keeping for context:

**The seller-facing frontend UI was deliberately deferred.** The backend above involves real transactional money logic (multi-seller stock reservation, proportional refund-safe payouts) that deserved the same careful, tested treatment as the rest of this codebase's payment code — and building a seller dashboard UI with the same care in the same pass would have meant rushing the backend to make room, which is exactly the wrong trade-off given what's at stake here. `MARKETPLACE_MIGRATION.md`'s own recommended build order lists backend milestones before the seller-facing UI for the same reason.

Every endpoint above is fully functional and testable via the Postman collection (extend `postman/UrbanStep.postman_collection.json` with the seller/payout endpoints listed below), the seller dashboard, or a Flutter/custom frontend.

## New API endpoints (add to your Postman collection)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/seller/register` | – | `{ businessName, ownerName, email, password, phone? }`. Status starts `pending`. |
| POST | `/api/seller/login` | – | `{ email, password }`. |
| POST | `/api/seller/refresh-token` | – | `{ refreshToken }`. |
| GET | `/api/seller/me` | Seller | Current seller profile + status. |
| POST | `/api/seller/bank-details` | Seller | `{ accountNumber, bankCode, accountName }`. Registers with Paystack as a transfer recipient. |
| GET | `/api/seller` | Admin (SELLER_MANAGE) | `?status=pending` — approval queue. |
| PATCH | `/api/seller/:sellerId/status` | Admin (SELLER_MANAGE) | `{ status: 'approved'\|'suspended'\|'pending' }`. |
| GET/POST | `/api/seller/products` | Approved seller | List/create own products (multipart, same fields as `/api/product/add`). |
| PATCH/DELETE | `/api/seller/products/:productId` | Approved seller | Edit/remove own products only. |
| GET | `/api/seller/orders` | Approved seller | `?status&page&limit` — own orders only. |
| PATCH | `/api/seller/orders/:orderId/status` | Approved seller | Update own order's status/tracking. |
| GET | `/api/seller/payouts` | Approved seller | Own payout history. |
| GET | `/api/seller/payouts/balance` | Approved seller | Current payable balance. |
| GET | `/api/payouts` | Admin (PAYOUT_MANAGE) | `?sellerId&status` — all payouts. |
| GET | `/api/payouts/sellers/:sellerId/balance` | Admin (PAYOUT_MANAGE) | A specific seller's payable balance + eligible orders. |
| POST | `/api/payouts/sellers/:sellerId` | Admin (PAYOUT_MANAGE) | Triggers a real Paystack transfer. |

`POST /api/orders` (checkout) now returns `{ order, orders, paystackAuthorizationUrl }` instead of just `{ order }` — `order` is kept (the first/only resulting order) for backward compatibility with an Option-A-built client, `orders` is the complete, correct picture when a cart splits across sellers.

## Deciding if you actually need this zip yet

Re-read `BUSINESS_MODEL.md`'s recommendation: **launch as Option A first.** This zip exists so the migration path is ready and real when you actually have sellers who want in — not as a reason to add marketplace complexity to a store that's still finding its first customers. If that's not you yet, use the other zip.
