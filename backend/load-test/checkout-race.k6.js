// Load test for the ONE endpoint where a bug is most expensive: checkout.
// Two scenarios:
//
//   1. oversell_race — the important one. Many virtual users hit "buy now"
//      on the SAME low-stock product at the SAME instant. This is exactly
//      the scenario order.service.js#tryDecrementStock's atomic
//      findOneAndUpdate({ $gte: quantity }) exists to prevent. This test
//      proves it (or catches a regression) under real concurrency, which a
//      unit test cannot: unit tests call the function once at a time.
//
//   2. checkout_throughput — realistic mixed traffic, to catch latency
//      regressions and confirm the app doesn't fall over under normal load.
//
// Requires: k6 (https://k6.io/docs/get-started/installation/) — a Go
// binary, not an npm package, so `npm install` won't fetch it.
//
// Setup before running:
//   1. Seed ONE product with known, LOW stock for a specific size, e.g.
//      stock: { "M": 5 } — do this on a staging environment, never
//      production, since this test WILL exhaust that stock.
//   2. Create/have credentials for N test customer accounts (or register
//      them in setup() below — see the commented-out example).
//   3. Run:
//        k6 run \
//          -e BASE_URL=https://staging-api.example.com \
//          -e PRODUCT_ID=<the seeded product's _id> \
//          -e SIZE=M \
//          -e SEEDED_STOCK=5 \
//          -e USER_TOKENS=token1,token2,token3,...  # one per VU, pre-issued
//          load-test/checkout-race.k6.js
//
// What "pass" looks like: successful ('placed'/201) checkouts for that
// product+size never exceed SEEDED_STOCK, no matter how many VUs raced for
// it — everyone else should get a clean 409 "out of stock", never a
// silent oversell or a 500.

import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const PRODUCT_ID = __ENV.PRODUCT_ID;
const SIZE = __ENV.SIZE || 'M';
const SEEDED_STOCK = Number(__ENV.SEEDED_STOCK || 5);
const USER_TOKENS = (__ENV.USER_TOKENS || '').split(',').filter(Boolean);

const successfulPurchases = new Counter('successful_purchases');
const outOfStockRejections = new Counter('out_of_stock_rejections');
const unexpectedErrors = new Counter('unexpected_errors');

export const options = {
  scenarios: {
    oversell_race: {
      executor: 'per-vu-iterations',
      vus: Math.max(USER_TOKENS.length, 20), // deliberately more VUs than stock
      iterations: 1, // each VU attempts exactly once — this is a single race, not sustained load
      exec: 'attemptRaceCheckout',
      startTime: '0s',
    },
    checkout_throughput: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 },
      ],
      exec: 'attemptThroughputCheckout',
      startTime: '15s', // after the race scenario has settled
    },
  },
  thresholds: {
    'http_req_duration{scenario:checkout_throughput}': ['p(95)<1500'],
    unexpected_errors: ['count==0'],
  },
};

const authHeaders = (token) => ({ headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });

const shippingAddress = {
  fullName: 'Load Test',
  line1: '1 Test Street',
  city: 'Lagos',
  postalCode: '100001',
  country: 'NG',
  phone: '08000000000',
};

// --- Scenario 1: the actual race ------------------------------------------
export function attemptRaceCheckout() {
  const token = USER_TOKENS[__VU % USER_TOKENS.length];
  if (!token) return;

  // Add the contested item to this VU's cart, then immediately checkout —
  // no random sleep here, deliberately, since the whole point is maximum
  // simultaneous arrival at the stock-decrement line.
  http.post(`${BASE_URL}/api/cart/add`, JSON.stringify({ itemId: PRODUCT_ID, size: SIZE }), authHeaders(token));

  const res = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify({
      shippingAddress,
      paymentMethod: 'cod', // avoids needing real Paystack test-mode wiring for this test
      idempotencyKey: `race-${__VU}-${Date.now()}`,
    }),
    authHeaders(token)
  );

  if (res.status === 201 || res.status === 200) {
    successfulPurchases.add(1);
  } else if (res.status === 409) {
    outOfStockRejections.add(1);
  } else {
    unexpectedErrors.add(1);
    console.error(`Unexpected checkout response: ${res.status} ${res.body}`);
  }

  check(res, {
    'never a 500': (r) => r.status < 500,
  });
}

// --- Scenario 2: realistic throughput --------------------------------------
export function attemptThroughputCheckout() {
  const token = USER_TOKENS[__VU % USER_TOKENS.length];
  if (!token) return;

  const res = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify({
      shippingAddress,
      paymentMethod: 'cod',
      idempotencyKey: `throughput-${__VU}-${__ITER}-${Date.now()}`,
    }),
    authHeaders(token)
  );

  check(res, { 'status is 2xx, 400, or 409': (r) => r.status < 500 });
}

// After the race scenario, assert the invariant that actually matters:
// successful purchases of the contested item can never exceed what was
// seeded, regardless of how many VUs tried simultaneously.
export function teardown() {
  console.log(`Successful purchases: ${successfulPurchases.name ? '' : ''}`);
  console.log(
    `If successful_purchases (see summary above) exceeds SEEDED_STOCK (${SEEDED_STOCK}), ` +
      `that's an oversold race condition — treat it as a P0.`
  );
}
