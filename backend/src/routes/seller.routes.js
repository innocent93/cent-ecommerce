import express from 'express';
import {
  registerSeller,
  loginSeller,
  googleLoginSeller,
  refreshSellerToken,
  getSellerProfile,
  updateBankDetails,
  listSellers,
  setSellerStatus, uploadCertificate, softDeleteSeller, restoreSeller, setSellerBan,
} from '../controllers/seller.controller.js';
import sellerAuth from '../middleware/sellerAuth.js';
import { requirePermission } from '../middleware/adminAuth.js';
import { PERMISSIONS } from '../constants/roles.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { certificateUpload } from '../middleware/upload.js';
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
sellerRouter.post('/register', authLimiter, certificateUpload.single('businessCertificate'), registerSellerValidator, validate, registerSeller);
sellerRouter.post('/login', authLimiter, loginSellerValidator, validate, loginSeller);
sellerRouter.post('/google', authLimiter, googleLoginValidator, validate, googleLoginSeller);
sellerRouter.post('/refresh-token', refreshSellerToken);
sellerRouter.get('/me', sellerAuth, getSellerProfile);
sellerRouter.post('/bank-details', sellerAuth, bankDetailsValidator, validate, updateBankDetails);
sellerRouter.post('/business-certificate', sellerAuth, certificateUpload.single('businessCertificate'), uploadCertificate);

// --- Admin (PERMISSIONS.SELLER_MANAGE) ---
const canManageSellers = requirePermission(PERMISSIONS.SELLER_MANAGE);
sellerRouter.get('/', canManageSellers, listSellers);
sellerRouter.patch('/:sellerId/status', canManageSellers, setSellerStatusValidator, validate, setSellerStatus);
sellerRouter.patch('/:sellerId/ban', canManageSellers, setSellerBan);
sellerRouter.delete('/:sellerId', canManageSellers, softDeleteSeller);
sellerRouter.patch('/:sellerId/restore', canManageSellers, restoreSeller);

export default sellerRouter;
