import express from 'express';
import {
  registerSeller,
  loginSeller,
  googleLoginSeller,
  refreshSellerToken,
  getSellerProfile,
  updateBankDetails,
  listSellers,
  setSellerStatus,
} from '../controllers/seller.controller.js';
import sellerAuth from '../middleware/sellerAuth.js';
import { requirePermission } from '../middleware/adminAuth.js';
import { PERMISSIONS } from '../constants/roles.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import validate from '../middleware/validate.js';
import {
  registerSellerValidator,
  loginSellerValidator,
  googleLoginValidator,
  bankDetailsValidator,
  sellerIdValidator,
  setSellerStatusValidator,
} from '../validators/seller.validators.js';

const sellerRouter = express.Router();

// --- Seller self-service ---
sellerRouter.post('/register', authLimiter, registerSellerValidator, validate, registerSeller);
sellerRouter.post('/login', authLimiter, loginSellerValidator, validate, loginSeller);
sellerRouter.post('/google', authLimiter, googleLoginValidator, validate, googleLoginSeller);
sellerRouter.post('/refresh-token', refreshSellerToken);
sellerRouter.get('/me', sellerAuth, getSellerProfile);
sellerRouter.post('/bank-details', sellerAuth, bankDetailsValidator, validate, updateBankDetails);

// --- Admin (PERMISSIONS.SELLER_MANAGE) ---
const canManageSellers = requirePermission(PERMISSIONS.SELLER_MANAGE);
sellerRouter.get('/', canManageSellers, listSellers);
sellerRouter.patch('/:sellerId/status', canManageSellers, setSellerStatusValidator, validate, setSellerStatus);

export default sellerRouter;
