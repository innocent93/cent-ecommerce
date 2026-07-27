// Tiny duration parser (avoids adding the `ms` npm package as a dependency
// just for this). Supports the same shorthand used in JWT expiresIn strings:
// "15m", "1h", "30d", "45s", or a plain number of milliseconds.
const UNIT_MS = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export const ms = (value) => {
  if (typeof value === 'number') return value;
  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)$/i.exec(String(value).trim());
  if (!match) {
    throw new Error(`Invalid duration string: "${value}"`);
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_MS[unit.toLowerCase()];
};

export default ms;
