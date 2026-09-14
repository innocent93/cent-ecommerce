import * as payoutService from '../services/payout.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';

// --- Admin (PERMISSIONS.PAYOUT_MANAGE) ---
export const getSellerBalance = asyncHandler(async (req, res) => {
  const balance = await payoutService.getSellerBalance(req.params.sellerId);
  return sendSuccess(res, balance);
});

export const createPayout = asyncHandler(async (req, res) => {
  const payout = await payoutService.createPayout(req.params.sellerId, req.admin.id, req.log);
  return sendSuccess(res, { statusCode: 201, message: 'Payout processed', payout });
});

export const retryPayout = asyncHandler(async (req, res) => {
  const payout = await payoutService.retryFailedPayout(req.params.payoutId, req.log);
  return sendSuccess(res, { message: 'Payout retried', payout });
});

export const listPayouts = asyncHandler(async (req, res) => {
  const payouts = await payoutService.listPayouts(req.query);
  return sendSuccess(res, { payouts });
});

// --- Seller (their own payout history) ---
export const getMyPayouts = asyncHandler(async (req, res) => {
  const payouts = await payoutService.listPayouts({ sellerId: req.seller.id });
  return sendSuccess(res, { payouts });
});

export const getMyBalance = asyncHandler(async (req, res) => {
  const balance = await payoutService.getSellerBalance(req.seller.id);
  return sendSuccess(res, balance);
});

export default { getSellerBalance, createPayout, retryPayout, listPayouts, getMyPayouts, getMyBalance };
