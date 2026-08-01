// Pure currency-conversion math — deliberately has zero dependencies (no
// config, no logger, no module-level cache) so it's fully unit-testable and
// so the conversion formula itself can be reasoned about/verified in
// isolation from where the rates come from.
//
// `rates` is always a map of "units of currency X per 1 USD" (the standard
// convention every FX API — including exchangerate-api.com, used by
// currency.js — returns rates in). Critically, this does NOT assume the
// base/store currency is USD: to convert an amount that's already
// denominated in `baseCurrency` into `targetCurrency`, you must go via the
// ratio of their USD rates, not multiply by the target rate directly.
//
// Concrete bug this fixes: with BASE_CURRENCY=NGN and rates {USD:1, NGN:1550},
// naively doing `amount * rates['NGN']` to convert a NGN amount to NGN
// multiplies every price by 1550 (since that's "how many NGN per 1 USD",
// not a no-op factor) — turning ₦1 into ₦1,550 on display, and, far more
// seriously, inflating real checkout/order totals by the same 1550x
// whenever displaying in the default (base) currency, which is the most
// common case for every order. The ratio-based formula below is correct
// regardless of what BASE_CURRENCY is set to, including when it's USD
// (ratio becomes rates[target]/1, i.e. the old behavior, unchanged).
export const convertAmount = (amount, { rates, fromCurrency, toCurrency }) => {
  const from = (fromCurrency || '').toUpperCase();
  const to = (toCurrency || from).toUpperCase();

  if (from === to) {
    // Explicit fast path: never let floating-point rate math introduce
    // drift when no conversion is actually happening (the single most
    // common case — displaying prices in the store's own base currency).
    return { amount: roundForCurrency(amount, to), currency: to };
  }

  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) {
    // Unknown currency on either side — return the original amount
    // unconverted rather than silently producing a wrong number.
    return { amount: roundForCurrency(amount, from), currency: from };
  }

  const ratio = toRate / fromRate;
  return { amount: roundForCurrency(amount * ratio, to), currency: to };
};

// JPY (and a few others) are conventionally zero-decimal currencies.
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY']);

export const roundForCurrency = (amount, currency) => {
  const decimals = ZERO_DECIMAL_CURRENCIES.has((currency || '').toUpperCase()) ? 0 : 2;
  return Number(amount.toFixed(decimals));
};

export default { convertAmount, roundForCurrency };
