# Business Model — How This Platform Makes Money

This document explains, concretely, how the owner of this platform generates revenue, and which parts of the codebase implement each mechanism. Read this before launch so pricing/commission numbers reflect a real decision, not a placeholder.

## The core question: single-seller store or marketplace?

The code supports both, but you need to pick one before launch because it changes how you price things:

### Option A — You are the only seller (simplest, recommended to launch first)
You buy/source shoes and clothing, list them at a markup, and keep the difference between cost price and sale price.

**How you make money:** classic retail margin.
- You buy a pair of shoes for ₦8,000, list it for ₦15,000 → ₦7,000 gross profit per unit, minus Paystack's transaction fee (~1.5% + ₦100 for local cards in Nigeria) and delivery cost.
- `COMMISSION_RATE` in `.env` is irrelevant in this model — set it to `0` and ignore it. Your margin is simply `price - cost_of_goods`, which isn't tracked in the code at all (you manage cost/sourcing outside the system, e.g. in a spreadsheet, until you need supplier/inventory-cost tracking — a reasonable v2 addition).
- **This is what "ship this week" should mean.** It requires no third-party sellers, no payout logic, no seller dashboards.

### Option B — Multi-vendor marketplace (Jumia/Amazon Marketplace model)
Other sellers list products on your platform; you take a cut of every sale.

**How you make money:** commission on each transaction.
- `Order.commissionRate` and `Order.commissionAmount` (see `Order.model.js`) are computed and stored on every order at the time it's placed, using `COMMISSION_RATE` from `.env` (default 10%).
- This is the number you'd use to build a seller payout report: `payout_to_seller = order.subtotal - order.commissionAmount`.
- **What's NOT built yet, because it's a genuinely separate project phase**: seller accounts/onboarding, seller-scoped product management, a payout mechanism (Paystack Transfers API to pay sellers their share), and a seller dashboard. If you want to go this route, say so explicitly and it should be scoped as its own milestone — bolting it on shallowly would create real money-handling bugs.

**Recommendation: launch as Option A this week.** Flip to Option B later once you have consistent order volume and third parties who actually want to sell through you — the commission plumbing (`commissionRate`/`commissionAmount`) is already there and will "just work" once you add seller accounts.

## Secondary revenue levers (all optional, none built yet — listed so you know what's realistic to add later)

- **Delivery fees**: currently a simple flat threshold (`order.service.js`: free above a subtotal, flat fee below it). You can turn this into its own profit center by charging more than your actual courier cost, or subsidize it as a customer-acquisition cost — that's a business decision, not a code change.
- **Featured/sponsored listings**: charge sellers (in a marketplace model) or your own budget (single-seller) to pin products to the top of category pages. Would need a `featured: Boolean` + `featuredUntil: Date` field on `Product` and a query change in `product.service.js` — small addition, not built.
- **Bulk/wholesale pricing**: tiered pricing by quantity. Not built; would extend the `Product` schema with a price-break table.
- **Subscription/loyalty tier** (e.g. free delivery for a monthly fee, like Amazon Prime/Jumia Prime): would need a `Subscription` model and a checkout discount rule. Not built.

## Payment provider costs (what it costs *you* to accept money)

Paystack charges the merchant (you), not the customer, per transaction — factor this into your margin:
- Local Nigerian cards: ~1.5% + ₦100 (capped)
- International cards: ~3.9%
- Bank transfer/USSD: lower flat fees, varies by channel

Check your actual negotiated rate in the Paystack dashboard — these change over time and by volume tier. This is real money leaving every sale; it is **not** currently subtracted anywhere in the code (orders store the full `total` the customer paid). If you want net-of-fees reporting, that's a straightforward addition to the admin order aggregation.

## What to configure before you flip the "open for business" switch

1. Decide Option A vs B above.
2. Set `COMMISSION_RATE` accordingly (0 for Option A).
3. Get live Paystack keys (`PAYSTACK_SECRET_KEY`/`PAYSTACK_PUBLIC_KEY`) and switch from `sk_test_`/`pk_test_` to live keys.
4. Set a real delivery fee threshold/amount in `order.service.js` (`buildOrderFromCart`) that reflects your actual courier costs.
5. Set `SHIPPING_COUNTRIES` to the countries you can actually fulfill to at launch (defaults to Nigeria, Ghana, Kenya, South Africa — trim or expand as needed).
