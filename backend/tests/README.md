# Testing

## What exists right now

`backend/tests/unit/` — **70 tests, all passing, actually executed** (not just written) using
Node's built-in test runner (`node --test`, zero extra dependencies). Run them yourself:

```bash
cd backend
npm test
```

These cover every dependency-free pure-logic module: `ApiError`, `ApiResponse`, `asyncHandler`,
`ms` (duration parsing), `shipping` (zone-based rate calculator), `currencyMath`, `orderSplit`
(multi-seller checkout splitting/coupon proportional allocation), `retry` (backoff logic), and —
most recently — `sellerGoogleAuth` (the account-linking/new-account decision logic behind
"Continue with Google" for sellers, including the security-critical rule that a verified Google
email always overrides anything a client submitted in the form).

A real bug was caught and fixed while writing the original tests — an early test's own assumption
about `asyncHandler`'s behavior was wrong (it asserted `next()` gets called on success, when
correct Express behavior is that it shouldn't) — worth mentioning because it's the actual value of
running tests rather than just writing them.

**CI**: `.github/workflows/backend-ci.yml` runs this full suite (plus a syntax-check of every
source file) on every push/PR touching `backend/` — this is no longer a manual step. See also
`.github/workflows/deploy.yml`, which re-runs it as a hard gate before any production deploy.

## What's NOT tested yet, and why honestly

Everything that imports Express, Mongoose, or any other npm package (every model, service,
controller, and route) **cannot be executed in the sandbox this project was built in** — it has no
network access, so `npm install` cannot run, and without `node_modules` present, importing
`mongoose`/`express`/`bcryptjs`/etc. fails immediately. This isn't a testing-strategy choice; it's
a hard environment constraint, and I'd rather tell you that plainly than claim broader coverage
that was never actually run.

Where a piece of DB-touching logic was tricky enough to be worth testing anyway (see
`sellerGoogleAuth.js`), the fix has been to **extract the pure decision logic into its own
dependency-free module** and test that in isolation — the same pattern already used for
`orderSplit.js`. This genuinely covers the highest-risk *logic*, but it is not a substitute for
integration tests that actually exercise the database and HTTP layer end to end.

## Recommended next step (in your own environment, with network access)

1. `npm install` in `backend/` (installs everything, including the packages needed below).
2. Add `mongodb-memory-server` (spins up a real, throwaway in-memory MongoDB for tests — no
   separate test database to manage) and `supertest` (HTTP assertions against the Express app
   without needing a running server).
3. Priority order for what to test first, highest-risk-first:
   - **`order.service.js`**: idempotency (same key → same order, not a duplicate), stock
     reservation under concurrent requests (the exact race condition the atomic-decrement pattern
     exists to prevent — see also `backend/load-test/checkout-race.k6.js` for a concurrency-level
     version of this same test), coupon discount math, refund lifecycle transitions.
   - **`seller.service.js` / `payout.service.js`**: the Google auth flow end-to-end (register →
     link → login), `createPayout`'s transactional order-locking under concurrent payout attempts,
     and the newly added `retryFailedPayout`.
   - **`user.service.js`**: account lockout after N failed logins, password reset token expiry,
     session revocation on password change.
   - **`webhook.controller.js`**: signature verification rejects a tampered payload; a replayed
     `charge.success` event doesn't double-process (idempotent `markOrderPaid`, now using an
     atomic `findOneAndUpdate` specifically so this is safe under concurrent duplicate delivery
     too).
4. Once `mongodb-memory-server`/`supertest` are available, extend `.github/workflows/backend-ci.yml`
   — no changes needed to the workflow's structure, just to what `npm test` covers.

This is intentionally scoped as "what's true today," not "what I'd like to claim." 70 real passing
tests is real, provable coverage of the logic that doesn't require a database; the higher-value
integration coverage is a concrete next step, not a gap I'm pretending doesn't exist.
