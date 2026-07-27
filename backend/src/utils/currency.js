import config from '../config/env.js';
import logger from '../config/logger.js';

// --- Static fallback rates (relative to 1 USD) ------------------------
// These are placeholders so the feature works out of the box with zero
// external dependencies. For real production use, set EXCHANGE_RATE_API_KEY
// in .env and rates will be fetched from a live FX API and cached — see
// refreshRates() below. Update FALLBACK_RATES occasionally either way, as a
// safety net for when the live API is unreachable.
const FALLBACK_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.78,
  NGN: 1550,
  CAD: 1.36,
  AUD: 1.5,
  INR: 83.5,
  JPY: 149,
  ZAR: 18.2,
  KES: 129,
  GHS: 15.3,
};

export const SUPPORTED_CURRENCIES = Object.keys(FALLBACK_RATES);

let cachedRates = { ...FALLBACK_RATES };
let lastFetchedAt = 0;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Optional: pulls live rates from exchangerate-api.com (or any compatible
// provider) if EXCHANGE_RATE_API_KEY is configured. Silently falls back to
// the last known good rates on failure — a flaky FX provider should never
// take checkout down.
export const refreshRates = async () => {
  if (!config.exchangeRateApiKey) return cachedRates;
  const isStale = Date.now() - lastFetchedAt > CACHE_TTL_MS;
  if (!isStale) return cachedRates;

  try {
    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${config.exchangeRateApiKey}/latest/USD`
    );
    if (!res.ok) throw new Error(`FX API responded ${res.status}`);
    const data = await res.json();
    if (data?.conversion_rates) {
      cachedRates = { ...FALLBACK_RATES, ...data.conversion_rates };
      lastFetchedAt = Date.now();
      logger.info('Exchange rates refreshed from live API');
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Failed to refresh exchange rates, using cached/fallback');
  }
  return cachedRates;
};

export const convert = (amountInBaseCurrency, targetCurrency) => {
  const currency = (targetCurrency || config.baseCurrency).toUpperCase();
  const rate = cachedRates[currency];
  if (!rate) return { amount: amountInBaseCurrency, currency: config.baseCurrency };
  // Round to 2 decimals except JPY-style zero-decimal currencies.
  const decimals = currency === 'JPY' ? 0 : 2;
  const amount = Number((amountInBaseCurrency * rate).toFixed(decimals));
  return { amount, currency };
};

// Attaches a `price` (converted) + `priceBase`/`currency` to a product-like
// object without mutating the original, for use in API responses.
export const withConvertedPrice = (product, targetCurrency) => {
  const plain = typeof product.toObject === 'function' ? product.toObject() : product;
  const { amount, currency } = convert(plain.price, targetCurrency);
  return { ...plain, priceBase: plain.price, price: amount, currency };
};

export default { convert, withConvertedPrice, refreshRates, SUPPORTED_CURRENCIES };
