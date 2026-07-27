// Zone-based shipping rate table (all amounts in the base currency, NGN by
// default). This is still a rate *table*, not a live courier-rate API call —
// upgrading to real-time rates (weight/dimensions-based, from GIG/DHL/etc.)
// is a separate integration; this replaces the previous single flat number
// with something zone-aware, which is the realistic middle ground for a
// week-one launch.

const NIGERIA_ZONES = {
  // Lagos: cheapest / fastest, most orders will originate/deliver here.
  lagos: { states: ['Lagos'], fee: 1500 },
  // Major metro areas: still same-week delivery via most couriers.
  metro: { states: ['Abuja', 'FCT', 'Rivers', 'Oyo', 'Kano'], fee: 2500 },
  // Everywhere else in Nigeria.
  other: { fee: 3500 },
};

// Flat fee for other countries currently shipped to (see SHIPPING_COUNTRIES).
// Intentionally simple — most early-stage African e-commerce stores quote a
// flat regional rate for the handful of neighboring countries they support
// before investing in real per-country logistics contracts.
const INTERNATIONAL_FLAT_FEE = {
  GH: 8000,
  KE: 9000,
  ZA: 9500,
};
const DEFAULT_INTERNATIONAL_FEE = 10000;

// Free shipping above this subtotal (base currency), regardless of zone.
const FREE_SHIPPING_THRESHOLD = 100000;

export const calculateShippingFee = (subtotalBase, { country, state } = {}) => {
  if (subtotalBase >= FREE_SHIPPING_THRESHOLD) return 0;
  if (subtotalBase === 0) return 0;

  const countryCode = (country || 'NG').toUpperCase();

  if (countryCode === 'NG') {
    const normalizedState = (state || '').trim();
    if (NIGERIA_ZONES.lagos.states.some((s) => s.toLowerCase() === normalizedState.toLowerCase())) {
      return NIGERIA_ZONES.lagos.fee;
    }
    if (NIGERIA_ZONES.metro.states.some((s) => s.toLowerCase() === normalizedState.toLowerCase())) {
      return NIGERIA_ZONES.metro.fee;
    }
    return NIGERIA_ZONES.other.fee;
  }

  return INTERNATIONAL_FLAT_FEE[countryCode] || DEFAULT_INTERNATIONAL_FEE;
};

export default calculateShippingFee;
