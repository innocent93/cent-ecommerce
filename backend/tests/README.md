# Testing

## What exists right now

`backend/tests/unit/` — **37 tests, all passing, actually executed** (not just written) using Node's built-in test runner (`node --test`, zero extra dependencies). Run them yourself:

```bash
cd backend
npm test
```

These cover every dependency-free pure-logic module: `ApiError`, `ApiResponse`, `asyncHandler`, `ms` (duration parsing), and `shipping` (the zone-based rate calculator). One real bug was caught and fixed while writing these — a test's own assumption about `asyncHandler`'s behavior was wrong (it asserted `next()` gets called on success, when correct Express behavior is that it shouldn't) — worth mentioning because it's the actual value of running tests rather than just writing them.

## What's NOT tested yet, and why honestly

Everything that imports Express, Mongoose, or any other npm package (every model, service, controller, and route) **cannot be executed in the sandbox this project was built in** — it has no network access, so `npm install` cannot run, and without `node_modules` present, importing `mongoose`/`express`/`bcryptjs`/etc. fails immediately. This isn't a testing-strategy choice; it's a hard environment constraint, and I'd rather tell you that plainly than claim broader coverage that was never actually run.

## Recommended next step (in your own environment, with network access)

1. `npm install` in `backend/` (installs everything, including the packages needed below).
2. Add `mongodb-memory-server` (spins up a real, throwaway in-memory MongoDB for tests — no separate test database to manage) and `supertest` (HTTP assertions against the Express app without needing a running server).
3. Priority order for what to test first, highest-risk-first:
   - **`order.service.js`**: idempotency (same key → same order, not a duplicate), stock reservation under concurrent requests (the exact race condition the atomic-decrement pattern exists to prevent), coupon discount math, refund lifecycle transitions.
   - **`user.service.js`**: account lockout after N failed logins, password reset token expiry, session revocation on password change.
   - **`webhook.controller.js`**: signature verification rejects a tampered payload; a replayed `charge.success` event doesn't double-process (idempotent `markOrderPaid`).
4. Add a GitHub Actions workflow that runs `npm test` on every PR once the above exists — nothing currently runs automatically.

This is intentionally scoped as "what's true today," not "what I'd like to claim." 37 real passing tests is real, provable coverage of the logic that doesn't require a database; the higher-value integration coverage is a concrete next step, not a gap I'm pretending doesn't exist.
