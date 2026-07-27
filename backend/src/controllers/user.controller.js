import * as userService from '../services/user.service.js';
import { refreshCookieOptions } from '../services/token.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';

// Controllers stay thin: parse the request, delegate to the service layer,
// shape the HTTP response. No business logic lives here — see
// src/services/user.service.js.

const requestMeta = (req) => ({ userAgent: req.headers['user-agent'], ip: req.ip });

const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, refreshCookieOptions());
};

// Standard, predictable user shape returned by every auth endpoint —
// deliberately the same fields whether it's register/login/staff-login/me,
// so a Flutter (or any) client can rely on one model class for "the current
// user" instead of juggling slightly different shapes per endpoint. Thanks
// to User.model.js's toJSON transform, `user` here already excludes the
// password hash and internal security tokens even if a future field is
// added and someone forgets to list it here explicitly.
const toUserPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  preferredCurrency: user.preferredCurrency,
});

// POST /api/user/register
export const registerUser = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await userService.register(req.body, requestMeta(req));
  setRefreshCookie(res, refreshToken);
  req.log.info({ userId: user._id.toString() }, 'User registered');
  // `refreshToken` is also returned in the body for native clients (Flutter)
  // that can't rely on browser cookies — store it with flutter_secure_storage.
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Account created successfully',
    token: accessToken,
    refreshToken,
    user: toUserPayload(user),
  });
});

// POST /api/user/login
export const loginUser = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await userService.login(req.body, requestMeta(req));
  setRefreshCookie(res, refreshToken);
  req.log.info({ userId: user._id.toString() }, 'User logged in');
  return sendSuccess(res, {
    message: 'Login successful',
    token: accessToken,
    refreshToken,
    user: toUserPayload(user),
  });
});

// POST /api/user/admin — staff login (support/admin/superadmin). Name kept
// for backward compatibility with the existing admin panel; internally
// this is now a real, database-backed staff login (see user.service.js).
export const adminLogin = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await userService.staffLogin(req.body, requestMeta(req));
  setRefreshCookie(res, refreshToken);
  req.log.info({ staffId: user._id.toString(), role: user.role }, 'Staff logged in');
  return sendSuccess(res, {
    message: 'Login successful',
    token: accessToken,
    refreshToken,
    user: toUserPayload(user),
  });
});

// POST /api/user/refresh-token
// Accepts the refresh token from the httpOnly cookie (web) or the request
// body (Flutter/native, which stores it in secure storage instead).
export const refreshToken = asyncHandler(async (req, res) => {
  const raw = req.cookies?.refreshToken || req.body?.refreshToken;
  const { accessToken, refreshToken: newRefreshToken } = await userService.refreshSession(
    raw,
    requestMeta(req)
  );
  setRefreshCookie(res, newRefreshToken);
  return sendSuccess(res, { message: 'Session refreshed', token: accessToken, refreshToken: newRefreshToken });
});

// GET /api/user/me
export const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user.id);
  return sendSuccess(res, { user: { ...toUserPayload(user), addresses: user.addresses } });
});

// POST /api/user/logout — revokes just this session/device.
export const logoutUser = asyncHandler(async (req, res) => {
  const raw = req.cookies?.refreshToken || req.body?.refreshToken;
  await userService.logout(raw);
  res.clearCookie('refreshToken', { path: '/api/user' });
  return sendSuccess(res, { message: 'Logged out successfully' });
});

// POST /api/user/logout-all — revokes every session/device (e.g. "I think
// my account was compromised" button).
export const logoutEverywhere = asyncHandler(async (req, res) => {
  await userService.logoutEverywhere(req.user.id);
  res.clearCookie('refreshToken', { path: '/api/user' });
  return sendSuccess(res, { message: 'Logged out of all devices' });
});

// --- Profile & password ---
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);
  return sendSuccess(res, { message: 'Profile updated', user: toUserPayload(user) });
});

export const changePassword = asyncHandler(async (req, res) => {
  await userService.changePassword(req.user.id, req.body);
  res.clearCookie('refreshToken', { path: '/api/user' });
  return sendSuccess(res, { message: 'Password changed. Please log in again on all devices.' });
});

// --- Addresses ---
export const listAddresses = asyncHandler(async (req, res) => {
  const addresses = await userService.listAddresses(req.user.id);
  return sendSuccess(res, { addresses });
});

export const addAddress = asyncHandler(async (req, res) => {
  const addresses = await userService.addAddress(req.user.id, req.body);
  return sendSuccess(res, { statusCode: 201, message: 'Address added', addresses });
});

export const removeAddress = asyncHandler(async (req, res) => {
  const addresses = await userService.removeAddress(req.user.id, req.params.addressId);
  return sendSuccess(res, { message: 'Address removed', addresses });
});

// --- Forgot / reset password ---
export const forgotPassword = asyncHandler(async (req, res) => {
  await userService.forgotPassword(req.body.email);
  // Same response whether or not the account exists — see user.service.js.
  return sendSuccess(res, { message: 'If an account exists for that email, a reset link has been sent.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await userService.resetPassword(req.body.token, req.body.password);
  return sendSuccess(res, { message: 'Password reset successfully. Please log in.' });
});

// --- Email verification ---
export const verifyEmail = asyncHandler(async (req, res) => {
  await userService.verifyEmail(req.body.token);
  return sendSuccess(res, { message: 'Email verified successfully' });
});

export const resendVerificationEmail = asyncHandler(async (req, res) => {
  await userService.resendVerificationEmail(req.user.id);
  return sendSuccess(res, { message: 'Verification email sent' });
});

// --- Wishlist ---
export const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await userService.getWishlist(req.user.id);
  return sendSuccess(res, { wishlist });
});

export const addToWishlist = asyncHandler(async (req, res) => {
  await userService.addToWishlist(req.user.id, req.body.productId);
  return sendSuccess(res, { message: 'Added to wishlist' });
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  await userService.removeFromWishlist(req.user.id, req.params.productId);
  return sendSuccess(res, { message: 'Removed from wishlist' });
});

// --- Currency preference ---
export const setPreferredCurrency = asyncHandler(async (req, res) => {
  const preferredCurrency = await userService.setPreferredCurrency(req.user.id, req.body.currency);
  return sendSuccess(res, { message: 'Currency preference updated', preferredCurrency });
});

// --- Staff management (superadmin only) ---
export const listStaff = asyncHandler(async (req, res) => {
  const staff = await userService.listStaff();
  return sendSuccess(res, { staff: staff.map(toUserPayload) });
});

export const createStaff = asyncHandler(async (req, res) => {
  const staff = await userService.createStaff(req.body);
  req.log.info({ staffId: staff._id.toString(), role: staff.role, createdBy: req.admin.id }, 'Staff account created');
  return sendSuccess(res, { statusCode: 201, message: 'Staff account created', staff: toUserPayload(staff) });
});

export const updateStaff = asyncHandler(async (req, res) => {
  const staff = await userService.updateStaff(req.params.staffId, req.body);
  req.log.info({ staffId: staff._id.toString(), updatedBy: req.admin.id }, 'Staff account updated');
  return sendSuccess(res, { message: 'Staff account updated', staff: toUserPayload(staff) });
});

export default {
  registerUser,
  loginUser,
  adminLogin,
  refreshToken,
  getMe,
  updateProfile,
  changePassword,
  listAddresses,
  addAddress,
  removeAddress,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  logoutUser,
  logoutEverywhere,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  setPreferredCurrency,
  listStaff,
  createStaff,
  updateStaff,
};
