import * as sellerService from '../services/seller.service.js';
import { refreshCookieOptions } from '../services/token.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';

const requestMeta = (req) => ({ userAgent: req.headers['user-agent'], ip: req.ip });
const setRefreshCookie = (res, token) => res.cookie('refreshToken', token, refreshCookieOptions());

const toSellerPayload = (seller) => ({
  id: seller._id,
  businessName: seller.businessName,
  ownerName: seller.ownerName,
  email: seller.email,
  phone: seller.phone,
  status: seller.status,
  hasBankDetails: Boolean(seller.paystackRecipientCode),
});

export const registerSeller = asyncHandler(async (req, res) => {
  const seller = await sellerService.register(req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Seller account created — pending admin approval before you can list products',
    seller: toSellerPayload(seller),
  });
});

export const loginSeller = asyncHandler(async (req, res) => {
  const { seller, accessToken, refreshToken } = await sellerService.login(req.body, requestMeta(req));
  setRefreshCookie(res, refreshToken);
  req.log.info({ sellerId: seller._id.toString() }, 'Seller logged in');
  return sendSuccess(res, { message: 'Login successful', token: accessToken, refreshToken, seller: toSellerPayload(seller) });
});

export const googleLoginSeller = asyncHandler(async (req, res) => {
  const result = await sellerService.googleLogin(req.body.idToken, requestMeta(req));

  if (result.isNewSeller) {
    // No account exists for this Google identity yet. Deliberately a 200,
    // not an error — the frontend uses this to route the person into
    // registration with their name/email prefilled, not to show a failure.
    return sendSuccess(res, {
      message: 'No seller account found for this Google account yet',
      isNewSeller: true,
      prefill: result.prefill,
    });
  }

  setRefreshCookie(res, result.refreshToken);
  req.log.info({ sellerId: result.seller._id.toString() }, 'Seller logged in via Google');
  return sendSuccess(res, {
    message: 'Login successful',
    token: result.accessToken,
    refreshToken: result.refreshToken,
    seller: toSellerPayload(result.seller),
    isNewSeller: false,
  });
});

export const refreshSellerToken = asyncHandler(async (req, res) => {
  const raw = req.cookies?.refreshToken || req.body?.refreshToken;
  const { accessToken, refreshToken } = await sellerService.refreshSession(raw, requestMeta(req));
  setRefreshCookie(res, refreshToken);
  return sendSuccess(res, { message: 'Session refreshed', token: accessToken, refreshToken });
});

export const getSellerProfile = asyncHandler(async (req, res) => {
  const seller = await sellerService.getProfile(req.seller.id);
  return sendSuccess(res, { seller: toSellerPayload(seller) });
});

export const updateBankDetails = asyncHandler(async (req, res) => {
  const seller = await sellerService.updateBankDetails(req.seller.id, req.body);
  return sendSuccess(res, { message: 'Bank details saved', seller: toSellerPayload(seller) });
});

// --- Admin ---
export const listSellers = asyncHandler(async (req, res) => {
  const sellers = await sellerService.listSellers(req.query);
  return sendSuccess(res, { sellers: sellers.map(toSellerPayload) });
});

export const setSellerStatus = asyncHandler(async (req, res) => {
  const seller = await sellerService.setSellerStatus(req.params.sellerId, req.body.status, req.log);
  return sendSuccess(res, { message: 'Seller status updated', seller: toSellerPayload(seller) });
});

export default {
  registerSeller,
  loginSeller,
  googleLoginSeller,
  refreshSellerToken,
  getSellerProfile,
  updateBankDetails,
  listSellers,
  setSellerStatus,
};
