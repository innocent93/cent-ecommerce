// Pure order-splitting math for marketplace checkout (Option B) — zero
// dependencies, fully unit-testable, following the exact lesson from the
// currency-conversion incident documented in ENGINEERING_REPORT.md: money
// math belongs in small, isolated, testable functions, not buried inline
// inside a large transactional service function where a bug is invisible
// until it hits a real deployment.

// Groups cart line items by which seller owns the product. `null` seller
// means "platform-owned" (Option A behavior) — grouped under the key
// 'platform' so it's treated identically to any other seller group by
// everything downstream (one Order document, its own shipping fee, etc.),
// keeping the single-seller code path exactly as simple as it already was.
export const groupItemsBySeller = (items) => {
  const groups = new Map();
  for (const item of items) {
    const key = item.sellerId ? String(item.sellerId) : 'platform';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
};

export const computeSubtotal = (items) =>
  items.reduce((sum, item) => sum + item.unitPriceBase * item.quantity, 0);

// Splits a single total discount (e.g. from a coupon applied at the whole-
// cart level) proportionally across seller groups by their share of the
// combined subtotal. Rounding-safe: every group except the last gets its
// exact proportional share rounded to 2dp, and the last group absorbs
// whatever rounding remainder is left — guarantees the parts always sum to
// *exactly* the original total discount, never a cent more or less
// (floating-point proportional splits drift otherwise, and "the discount
// total doesn't match what was actually deducted" is exactly the class of
// bug the currency incident was).
export const allocateProportionally = (totalAmount, groupSubtotals) => {
  const keys = Object.keys(groupSubtotals);
  const combinedSubtotal = keys.reduce((sum, k) => sum + groupSubtotals[k], 0);

  if (totalAmount === 0 || combinedSubtotal === 0) {
    return Object.fromEntries(keys.map((k) => [k, 0]));
  }

  const allocations = {};
  let allocatedSoFar = 0;

  keys.forEach((key, index) => {
    const isLast = index === keys.length - 1;
    if (isLast) {
      allocations[key] = Number((totalAmount - allocatedSoFar).toFixed(2));
    } else {
      const share = Number(((groupSubtotals[key] / combinedSubtotal) * totalAmount).toFixed(2));
      allocations[key] = share;
      allocatedSoFar += share;
    }
  });

  return allocations;
};

export default { groupItemsBySeller, computeSubtotal, allocateProportionally };
