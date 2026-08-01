import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { convertAmount, roundForCurrency } from '../../src/utils/currencyMath.js';

// Rates as returned by a real FX API: units of currency per 1 USD.
const RATES = { USD: 1, NGN: 1550, EUR: 0.92, GBP: 0.78, JPY: 149 };

describe('convertAmount', () => {
  test('REGRESSION: converting NGN (base currency) to NGN is a no-op, not x1550', () => {
    // This is the exact bug reported in production: an admin enters a
    // price of 1 (in NGN, the store's base currency) and the storefront
    // displayed 1550 instead of 1, because the old implementation
    // multiplied by rates['NGN'] directly regardless of what currency the
    // amount was already in.
    const result = convertAmount(1, { rates: RATES, fromCurrency: 'NGN', toCurrency: 'NGN' });
    assert.equal(result.amount, 1);
    assert.equal(result.currency, 'NGN');
  });

  test('same-currency conversion is always a no-op, for any currency', () => {
    for (const code of Object.keys(RATES)) {
      const result = convertAmount(42, { rates: RATES, fromCurrency: code, toCurrency: code });
      assert.equal(result.amount, 42, `expected no-op for ${code}`);
    }
  });

  test('converts correctly when the base currency is NGN and target is USD', () => {
    // ₦15,500 (base) should be ~$10 USD, not ₦15,500 * 1550.
    const result = convertAmount(15500, { rates: RATES, fromCurrency: 'NGN', toCurrency: 'USD' });
    assert.equal(result.amount, 10);
  });

  test('converts correctly when the base currency is USD and target is NGN (legacy default)', () => {
    const result = convertAmount(10, { rates: RATES, fromCurrency: 'USD', toCurrency: 'NGN' });
    assert.equal(result.amount, 15500);
  });

  test('converts correctly between two non-USD currencies (NGN -> EUR)', () => {
    // 1550 NGN == 1 USD == 0.92 EUR
    const result = convertAmount(1550, { rates: RATES, fromCurrency: 'NGN', toCurrency: 'EUR' });
    assert.equal(result.amount, 0.92);
  });

  test('falls back to the original amount, unconverted, for an unknown currency', () => {
    const result = convertAmount(100, { rates: RATES, fromCurrency: 'NGN', toCurrency: 'XYZ' });
    assert.equal(result.amount, 100);
    assert.equal(result.currency, 'NGN');
  });

  test('defaults toCurrency to fromCurrency when omitted', () => {
    const result = convertAmount(500, { rates: RATES, fromCurrency: 'NGN' });
    assert.equal(result.amount, 500);
    assert.equal(result.currency, 'NGN');
  });
});

describe('roundForCurrency', () => {
  test('rounds to 2 decimals for standard currencies', () => {
    assert.equal(roundForCurrency(10.126, 'USD'), 10.13);
    assert.equal(roundForCurrency(1550, 'NGN'), 1550);
  });

  test('rounds to 0 decimals for JPY (zero-decimal currency)', () => {
    assert.equal(roundForCurrency(1489.7, 'JPY'), 1490);
  });
});
