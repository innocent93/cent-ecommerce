import * as couponService from '../services/coupon.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';

// POST /api/coupons/validate  { code, subtotal } — preview only, doesn't redeem.
// Lets the storefront show "You saved ₦X" before the order is actually
// placed. Real enforcement (and the only place a coupon is actually spent)
// is inside order.service.js's placeOrder.
export const previewCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;
  const { discountAmountBase } = await couponService.validateCoupon(code, {
    userId: req.user.id,
    subtotalBase: Number(subtotal),
  });
  return sendSuccess(res, { message: 'Coupon applied', discountAmount: discountAmountBase });
});

// --- Admin CRUD ---
export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.createCoupon(req.body);
  return sendSuccess(res, { statusCode: 201, message: 'Coupon created', coupon });
});

export const listCoupons = asyncHandler(async (req, res) => {
  const coupons = await couponService.listCoupons();
  return sendSuccess(res, { coupons });
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.updateCoupon(req.params.couponId, req.body);
  return sendSuccess(res, { message: 'Coupon updated', coupon });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  await couponService.deleteCoupon(req.params.couponId);
  return sendSuccess(res, { message: 'Coupon deleted' });
});

export default { previewCoupon, createCoupon, listCoupons, updateCoupon, deleteCoupon };
