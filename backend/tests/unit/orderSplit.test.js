import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { groupItemsBySeller, computeSubtotal, allocateProportionally } from '../../src/utils/orderSplit.js';

describe('groupItemsBySeller', () => {
  test('groups platform-owned items (sellerId null) under "platform"', () => {
    const items = [
      { name: 'A', sellerId: null, unitPriceBase: 100, quantity: 1 },
      { name: 'B', sellerId: null, unitPriceBase: 200, quantity: 1 },
    ];
    const groups = groupItemsBySeller(items);
    assert.equal(groups.size, 1);
    assert.equal(groups.get('platform').length, 2);
  });

  test('splits items across multiple sellers correctly', () => {
    const items = [
      { name: 'A', sellerId: 'seller1', unitPriceBase: 100, quantity: 1 },
      { name: 'B', sellerId: 'seller2', unitPriceBase: 200, quantity: 1 },
      { name: 'C', sellerId: 'seller1', unitPriceBase: 50, quantity: 2 },
    ];
    const groups = groupItemsBySeller(items);
    assert.equal(groups.size, 2);
    assert.equal(groups.get('seller1').length, 2);
    assert.equal(groups.get('seller2').length, 1);
  });

  test('a mixed cart (platform + sellers) produces three separate groups', () => {
    const items = [
      { name: 'A', sellerId: null, unitPriceBase: 100, quantity: 1 },
      { name: 'B', sellerId: 'seller1', unitPriceBase: 200, quantity: 1 },
      { name: 'C', sellerId: 'seller2', unitPriceBase: 300, quantity: 1 },
    ];
    const groups = groupItemsBySeller(items);
    assert.equal(groups.size, 3);
    assert.ok(groups.has('platform'));
    assert.ok(groups.has('seller1'));
    assert.ok(groups.has('seller2'));
  });
});

describe('computeSubtotal', () => {
  test('sums price * quantity across items', () => {
    const items = [
      { unitPriceBase: 100, quantity: 2 }, // 200
      { unitPriceBase: 50, quantity: 3 },  // 150
    ];
    assert.equal(computeSubtotal(items), 350);
  });

  test('empty items array is zero', () => {
    assert.equal(computeSubtotal([]), 0);
  });
});

describe('allocateProportionally (the critical money-splitting math)', () => {
  test('splits a discount proportionally by subtotal share', () => {
    // seller1: 7500 of 10000 total (75%), seller2: 2500 (25%)
    const result = allocateProportionally(1000, { seller1: 7500, seller2: 2500 });
    assert.equal(result.seller1, 750);
    assert.equal(result.seller2, 250);
  });

  test('CRITICAL: allocated amounts always sum to exactly the original total (no rounding drift)', () => {
    // A split that doesn't divide evenly — the classic source of rounding
    // bugs where allocated parts silently sum to slightly more or less
    // than what was actually supposed to be deducted.
    const result = allocateProportionally(100, { a: 3333, b: 3333, c: 3334 });
    const sum = Object.values(result).reduce((s, v) => s + v, 0);
    assert.equal(Math.round(sum * 100) / 100, 100);
  });

  test('a single group gets the entire discount', () => {
    const result = allocateProportionally(500, { platform: 10000 });
    assert.equal(result.platform, 500);
  });

  test('zero discount allocates zero to every group', () => {
    const result = allocateProportionally(0, { a: 100, b: 200 });
    assert.equal(result.a, 0);
    assert.equal(result.b, 0);
  });

  test('zero combined subtotal (edge case) does not divide by zero / throw', () => {
    const result = allocateProportionally(50, { a: 0, b: 0 });
    assert.equal(result.a, 0);
    assert.equal(result.b, 0);
  });

  test('many groups still sum exactly to the total (stress case)', () => {
    const groups = { a: 999, b: 1001, c: 500, d: 7500, e: 3000, f: 1 };
    const result = allocateProportionally(333.33, groups);
    const sum = Object.values(result).reduce((s, v) => s + v, 0);
    assert.equal(Math.round(sum * 100) / 100, 333.33);
  });
});
