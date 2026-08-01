# Migrating to a Multi-Vendor Marketplace (Option B)

This is the concrete, technical follow-up to `BUSINESS_MODEL.md`'s Option A/B decision. It assumes you launched as Option A (single seller) and now have real order volume and third-party sellers who want in. This is scoped as its own project phase — bolting marketplace features on shallowly is exactly how money-handling bugs happen (see the currency conversion incident in `ENGINEERING_REPORT.md` for a reminder of how a subtle math error in this codebase directly affected real charges; seller payouts deserve at least that much care).

## What already exists and needs no migration

- `Order.commissionRate` / `Order.commissionAmount` are already computed and stored on every order (`order.service.js`), using `COMMISSION_RATE` from `.env`. This is your payout math foundation — `payout_to_seller = order.subtotal - order.commissionAmount` per order, already sitting in your database.
- The RBAC system (`support`/`admin`/`superadmin`) is a natural template for adding a `seller` role, though sellers should likely be a *separate* collection from `User` (see below) rather than another role on the same model — sellers need business-specific fields (bank details, business name, verification status) that don't belong on a customer/staff account.

## New data model

### `Seller` model (new)
```js
{
  businessName: String,
  ownerName: String,
  email: String,          // seller's login — separate auth from customers/staff
  password: String,        // hashed, same pattern as User
  phone: String,
  status: enum ['pending', 'approved', 'suspended'],  // admin approves before they can list products
  bankDetails: {
    accountNumber: String,  // for Paystack Transfers (payouts) — see below
    bankCode: String,
    accountName: String,
  },
  paystackRecipientCode: String,  // returned by Paystack when you register their bank details for transfers
  commissionRateOverride: Number,  // optional: negotiate a different rate per seller instead of one global COMMISSION_RATE
  createdAt, updatedAt
}
```

### `Product` model changes
Add `seller: { type: ObjectId, ref: 'Seller', required: true }`. For existing Option-A products, this needs a one-time migration script assigning them to a "Store" seller record you create for yourself (so old products don't become orphaned) — a simple script, not a schema risk, since it's an additive field.

### `Order` model changes
An order can span multiple sellers (a customer buys a shoe from Seller A and a jacket from Seller B in one checkout). Two supportable approaches, in order of how much existing code they preserve:

- **Simpler**: split into one `Order` per seller at checkout time (a customer's single "purchase" produces N `Order` documents grouped by a shared `checkoutSessionId`). This means `order.service.js#placeOrder`'s cart-splitting logic changes, but everything downstream (tracking, refunds, status) stays exactly as-is per order — the biggest win for minimizing rewrite risk.
- **More complex**: keep one `Order` with per-item `seller` references and per-seller sub-statuses. More "correct" conceptually, but means rewriting order status/tracking/refund logic to operate per-seller-within-an-order instead of per-order — meaningfully more work and more surface area for bugs. Not recommended as the first cut.

**Recommendation: the simpler split-at-checkout approach.** It reuses ~90% of the existing, already-tested order/refund/tracking code unchanged.

## Payouts: Paystack Transfers API

Paying sellers their share (`order.subtotal - order.commissionAmount`) is a real money-movement feature, not a display number:
1. When a seller is approved, collect their bank details and call Paystack's **Transfer Recipient** API to register them — returns a `recipient_code`, store it on the `Seller` document.
2. On a schedule (e.g. weekly payout runs, not per-order — batching reduces transfer fees and gives you a review window before money leaves), sum each seller's `payout_to_seller` across their delivered/non-refunded orders since the last payout, and call Paystack's **Transfer** API with that amount and their `recipient_code`.
3. Record every payout as its own model (`Payout`) with status (`pending`/`success`/`failed`) and the specific orders it covers — you need this audit trail for seller disputes ("where's my money for order X") exactly like `PaymentEvent` exists for customer-facing payment disputes.
4. **Handle refunds against already-paid-out orders explicitly**: if a customer refund happens after a seller was already paid for that order, you need a policy (deduct from their next payout is standard) and the code to enforce it — don't skip this, it's the most common real bug in marketplace payout systems.

## Seller-facing surface (new, substantial)

- **Seller registration/login**: separate auth flow from customer/staff (own JWT role or entirely separate token namespace — recommend treating sellers as genuinely separate from the `User`/staff RBAC system, not shoehorned into the existing roles).
- **Seller product management**: scoped version of the existing admin product CRUD (`product.service.js` already has `createProduct`/`updateProduct`/`removeProduct` — add a `seller` ownership check so a seller can only touch their own products, mirroring the `requirePermission` pattern already used for staff).
- **Seller order view**: scoped version of the existing order-list/status-update endpoints, filtered to `orders where seller = req.seller.id`.
- **Seller dashboard** (new admin-panel-like frontend, or a section of the existing admin panel gated by seller auth instead of staff auth): sales summary, pending payouts, product performance.
- **Admin: seller approval queue** — before a seller can list products, an admin reviews and approves them (fraud/quality control) — a small addition mirroring the existing refund-approval-queue pattern (`Refunds.jsx`/`getRefundRequests`).

## What does NOT need to change

- Payment processing itself (Paystack checkout flow) — the customer still pays you (the platform) once per checkout session; you then redistribute to sellers via Transfers. Customers never pay sellers directly, which keeps PCI/payment complexity exactly where it already is.
- The cart, coupon, and review systems — these operate on products regardless of who owns them; a `seller` field on `Product` doesn't require touching cart/coupon/review logic (a coupon or review is about a product, not about who sold it).
- Delivery tracking — still per-order (or per-split-order, in the recommended approach), unchanged.
- The RBAC/staff system, currency conversion, checkout idempotency, and refund workflow — all continue working exactly as built; marketplace is additive on top, not a replacement.

## Suggested build order (own milestones, not one big-bang release)

1. `Seller` model + seller auth (registration, login — can reuse most of `token.service.js`'s pattern).
2. Admin: seller approval queue.
3. `Product.seller` field + seller-scoped product CRUD endpoints + seller product-management UI.
4. Checkout: split-by-seller order creation (the highest-risk step — test thoroughly against the existing idempotency/transaction logic before shipping).
5. Seller order view + status updates (scoped version of existing admin order endpoints).
6. Paystack Transfer Recipients + a manual "trigger payout" admin action (before automating the schedule — get a human reviewing amounts before money moves, at least initially).
7. Automated scheduled payouts, once step 6 has run correctly by hand a few times.

Each step should ship and be verified independently — this is real money moving between real parties, and the currency-conversion incident in this project is a concrete reminder of why "looks right in a quick review" isn't the same as "verified correct," especially anywhere near payment amounts.
