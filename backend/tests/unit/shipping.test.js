import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateShippingFee } from '../../src/utils/shipping.js';

describe('calculateShippingFee', () => {
  test('free shipping at/above the threshold, regardless of destination', () => {
    assert.equal(calculateShippingFee(100000, { country: 'NG', state: 'Lagos' }), 0);
    assert.equal(calculateShippingFee(150000, { country: 'GH' }), 0);
  });

  test('zero subtotal (empty cart edge case) is free, not an error', () => {
    assert.equal(calculateShippingFee(0, { country: 'NG' }), 0);
  });

  test('Lagos gets the cheapest Nigerian rate', () => {
    assert.equal(calculateShippingFee(20000, { country: 'NG', state: 'Lagos' }), 1500);
  });

  test('Lagos match is case-insensitive', () => {
    assert.equal(calculateShippingFee(20000, { country: 'NG', state: 'lagos' }), 1500);
    assert.equal(calculateShippingFee(20000, { country: 'NG', state: 'LAGOS' }), 1500);
  });

  test('metro states (Abuja/FCT/Rivers/Oyo/Kano) get the mid-tier rate', () => {
    assert.equal(calculateShippingFee(20000, { country: 'NG', state: 'Abuja' }), 2500);
    assert.equal(calculateShippingFee(20000, { country: 'NG', state: 'Rivers' }), 2500);
  });

  test('any other Nigerian state falls back to the base rate', () => {
    assert.equal(calculateShippingFee(20000, { country: 'NG', state: 'Enugu' }), 3500);
  });

  test('missing state (Nigeria) still resolves — falls back to base rate, not a crash', () => {
    assert.equal(calculateShippingFee(20000, { country: 'NG' }), 3500);
  });

  test('known international destinations use their flat rate', () => {
    assert.equal(calculateShippingFee(20000, { country: 'GH' }), 8000);
    assert.equal(calculateShippingFee(20000, { country: 'KE' }), 9000);
    assert.equal(calculateShippingFee(20000, { country: 'ZA' }), 9500);
  });

  test('an unlisted country falls back to the default international fee', () => {
    assert.equal(calculateShippingFee(20000, { country: 'US' }), 10000);
  });

  test('defaults to Nigeria when no country is given at all', () => {
    assert.equal(calculateShippingFee(20000, {}), 3500);
  });

  test('country code matching is case-insensitive', () => {
    assert.equal(calculateShippingFee(20000, { country: 'gh' }), 8000);
  });
});
