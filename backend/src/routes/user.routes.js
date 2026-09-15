import express from 'express';
import { param, body } from 'express-validator';
import {
  adminLogin,
  getMe,
  loginUser,
  googleLogin,
  logoutUser,
  logoutEverywhere,
  refreshToken,
  registerUser,
  updateProfile,
  changePassword,
  listAddresses,
  addAddress,
  removeAddress,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  setPreferredCurrency,
  listStaff,
  createStaff,
  updateStaff, listCustomers, setCustomerBan, softDeleteCustomer, restoreCustomer,
} from '../controllers/user.controller.js';
import {
  registerValidator,
  loginValidator,
  adminLoginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  verifyEmailValidator,
  updateProfileValidator,
  changePasswordValidator,
  addAddressValidator,
  createStaffValidator,
  updateStaffValidator,
} from '../validators/user.validators.js';
import validate from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import authUser from '../middleware/auth.js';
import { requirePermission } from '../middleware/adminAuth.js';
import { PERMISSIONS } from '../constants/roles.js';

const userRouter = express.Router();

userRouter.post('/register', authLimiter, registerValidator, validate, registerUser);
userRouter.post('/login', authLimiter, loginValidator, validate, loginUser);
userRouter.post(
  '/google',
  authLimiter,
  body('idToken').isString().notEmpty().withMessage('idToken is required'),
  validate,
  googleLogin
);
userRouter.post('/admin', authLimiter, adminLoginValidator, validate, adminLogin);
userRouter.post('/refresh-token', refreshToken);
userRouter.get('/me', authUser, getMe);
userRouter.post('/logout', logoutUser);
userRouter.post('/logout-all', authUser, logoutEverywhere);

// --- Profile & password ---
userRouter.patch('/profile', authUser, updateProfileValidator, validate, updateProfile);
userRouter.post('/change-password', authUser, changePasswordValidator, validate, changePassword);

// --- Addresses ---
userRouter.get('/addresses', authUser, listAddresses);
userRouter.post('/addresses', authUser, addAddressValidator, validate, addAddress);
userRouter.delete(
  '/addresses/:addressId',
  authUser,
  param('addressId').isMongoId(),
  validate,
  removeAddress
);

// --- Forgot / reset password (rate-limited like login — a common brute
// force / abuse vector otherwise) ---
userRouter.post('/forgot-password', authLimiter, forgotPasswordValidator, validate, forgotPassword);
userRouter.post('/reset-password', authLimiter, resetPasswordValidator, validate, resetPassword);

// --- Email verification ---
userRouter.post('/verify-email', verifyEmailValidator, validate, verifyEmail);
userRouter.post('/resend-verification', authUser, resendVerificationEmail);

// --- Wishlist ---
userRouter.get('/wishlist', authUser, getWishlist);
userRouter.post(
  '/wishlist',
  authUser,
  body('productId').isMongoId().withMessage('Invalid product id'),
  validate,
  addToWishlist
);
userRouter.delete(
  '/wishlist/:productId',
  authUser,
  param('productId').isMongoId().withMessage('Invalid product id'),
  validate,
  removeFromWishlist
);

// --- Currency preference ---
userRouter.patch(
  '/currency',
  authUser,
  body('currency').isString().isLength({ min: 3, max: 3 }),
  validate,
  setPreferredCurrency
);

// --- Customer lifecycle management --------------------------------------
userRouter.get('/customers', requirePermission(PERMISSIONS.CUSTOMER_VIEW), listCustomers);
userRouter.patch('/customers/:userId/ban', requirePermission(PERMISSIONS.CUSTOMER_MANAGE), setCustomerBan);
userRouter.delete('/customers/:userId', requirePermission(PERMISSIONS.CUSTOMER_MANAGE), softDeleteCustomer);
userRouter.patch('/customers/:userId/restore', requirePermission(PERMISSIONS.CUSTOMER_MANAGE), restoreCustomer);

// --- Staff management (superadmin only) ---
const canManageStaff = requirePermission(PERMISSIONS.STAFF_MANAGE);
userRouter.get('/staff', canManageStaff, listStaff);
userRouter.post('/staff', canManageStaff, createStaffValidator, validate, createStaff);
userRouter.patch(
  '/staff/:staffId',
  canManageStaff,
  param('staffId').isMongoId(),
  updateStaffValidator,
  validate,
  updateStaff
);

export default userRouter;
