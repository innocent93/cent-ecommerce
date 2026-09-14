# Seller Hub — UrbanStep marketplace dashboard

The seller-facing dashboard for UrbanStep's multi-vendor marketplace (Option B). Manufacturers
register, get approved, list products, fulfill orders, and track what's owed to them — all
against the existing `/api/seller/*` and `/api/payouts/*` backend, which was already fully built
and tested (see `../OPTION_B_README.md`). This app was the missing piece.

## What's here

- **Register / Sign in** — `/api/seller/register`, `/api/seller/login`, `/api/seller/google`, with
  the same session-refresh pattern as the storefront (`src/utils/api.js`).
- **Sign in with Google** — same `GOOGLE_CLIENT_ID` the storefront uses. An existing account
  (matched by Google ID, or linked by email if they'd registered with a password) logs straight
  in; a brand-new Google user is routed into Register with their verified name/email prefilled and
  no password field, since Google already proved who they are — they only need to supply the
  business details a seller account requires. Set `VITE_GOOGLE_CLIENT_ID` below and
  `GOOGLE_CLIENT_ID` in `backend/.env` to turn it on; leave both blank and the button simply
  doesn't render.
- **Overview** — available balance, live product count, orders in progress, recent orders.
- **Products** — list, add, edit, remove your own products (multipart image upload, per-size
  stock, same fields the admin panel uses for platform products).
- **Orders** — filter by status, open an order to update its delivery status/tracking number/carrier,
  see its tracking history.
- **Payouts** — current payable balance and full payout history.
- **Business profile** — account status, and the bank-details form that registers you with
  Paystack as a transfer recipient.

A pending (not-yet-approved) seller can sign in and reach only the Business Profile page, so they
can add bank details while waiting — every other route redirects there until `status: 'approved'`.

## Design

A distinct visual identity rather than a copy of the admin panel's default look: deep indigo +
warm ochre ("trade ledger" palette — a nod to the indigo-dye textile trade this seller base is
selling into), Fraunces for display numbers/headings, Inter for data. Order/payout lists render as
ledger rows (hairline dividers) rather than a wall of shadowed cards, and the balance is always the
hero number — see `tailwind.config.js` for the full token set.

## Local development

```bash
cp .env.example .env      # set VITE_BACKEND_URL if your API isn't on localhost:5000
npm install
npm run dev                # http://localhost:5175
```

Or via the monorepo root: `npm run dev:seller`. Via Docker: this app is wired into the root
`docker-compose.yml` (port 5175) and `render.yaml` (`urbanstep-seller`).

**Before it talks to your backend**: add `http://localhost:5175` (or your deployed seller-dashboard
URL) to `CORS_ORIGIN` in `backend/.env` — already included in `backend/.env.example`.

## What's intentionally not here yet

- No products/orders pagination UI beyond what the API returns by default — fine for a seller with
  a normal catalog size, worth adding page controls once a seller has hundreds of SKUs.
- No charts/analytics beyond the headline numbers — `recharts` is already a dependency if you want
  to add a sales-over-time chart once there's order history to show.
- Bank code entry is a free-text field (Paystack's bank list isn't proxied through the backend yet) —
  a `GET /api/paystack/banks` passthrough would let this become a dropdown.
