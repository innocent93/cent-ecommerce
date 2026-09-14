import Coupon from '../models/Coupon.model.js';
import { ApiError } from '../utils/ApiError.js';

// Validates a coupon against a subtotal (in base currency) and a user,
// without mutating anything — used at checkout time to compute a discount.
// Actual redemption (usedBy/timesUsed increment) happens separately once
// the order is actually created, so a validation check alone never
// "spends" a use. Accepts an optional MongoDB session so, when called from
// inside placeOrder's transaction, the read is part of the same
// snapshot/isolation as the rest of the checkout.
export const validateCoupon = async (code, { userId, subtotalBase }, session) => {
  const coupon = await Coupon.findOne({ code: (code || '').toUpperCase() }).session(session ?? null);
  if (!coupon || !coupon.active) {
    throw ApiError.badRequest('Invalid or inactive coupon code');
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    throw ApiError.badRequest('This coupon is not active yet');
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw ApiError.badRequest('This coupon has expired');
  }
  if (coupon.usageLimit && coupon.timesUsed >= coupon.usageLimit) {
    throw ApiError.badRequest('This coupon has reached its usage limit');
  }
  if (coupon.minOrderAmount && subtotalBase < coupon.minOrderAmount) {
    throw ApiError.badRequest(`This coupon requires a minimum order of ${coupon.minOrderAmount}`);
  }

  const userUsageCount = coupon.usedBy.filter((u) => u.user.toString() === userId).length;
  if (userUsageCount >= coupon.usageLimitPerUser) {
    throw ApiError.badRequest('You have already used this coupon');
  }

  let discount = coupon.type === 'percentage' ? (subtotalBase * coupon.value) / 100 : coupon.value;
  if (coupon.maxDiscountAmount) discount = Math.min(discount, coupon.maxDiscountAmount);
  discount = Math.min(discount, subtotalBase); // never discount below zero

  return { coupon, discountAmountBase: Math.round(discount * 100) / 100 };
};

export const redeemCoupon = async (couponId, userId, orderId, session) => {
  await Coupon.findByIdAndUpdate(
    couponId,
    {
      $inc: { timesUsed: 1 },
      $push: { usedBy: { user: userId, order: orderId, usedAt: new Date() } },
    },
    { session }
  );
};

// --- Admin CRUD ---

export const createCoupon = (data) => Coupon.create({ ...data, code: data.code.toUpperCase() });

export const listCoupons = () => Coupon.find().sort({ createdAt: -1 });

export const updateCoupon = async (id, data) => {
  const coupon = await Coupon.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!coupon) throw ApiError.notFound('Coupon not found');
  return coupon;
};

export const deleteCoupon = async (id) => {
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) throw ApiError.notFound('Coupon not found');
};

export default { validateCoupon, redeemCoupon, createCoupon, listCoupons, updateCoupon, deleteCoupon };
