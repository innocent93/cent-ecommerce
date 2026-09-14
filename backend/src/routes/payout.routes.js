import express from 'express';
import { param } from 'express-validator';
import {
  getSellerBalance,
  createPayout,
  retryPayout,
  listPayouts,
  getMyPayouts,
  getMyBalance,
} from '../controllers/payout.controller.js';
import { requirePermission } from '../middleware/adminAuth.js';
import { requireApprovedSeller } from '../middleware/sellerAuth.js';
import { PERMISSIONS } from '../constants/roles.js';
import validate from '../middleware/validate.js';

const payoutRouter = express.Router();
const canManagePayouts = requirePermission(PERMISSIONS.PAYOUT_MANAGE);

// --- Admin ---
payoutRouter.get('/', canManagePayouts, listPayouts);
payoutRouter.get('/sellers/:sellerId/balance', canManagePayouts, param('sellerId').isMongoId(), validate, getSellerBalance);
payoutRouter.post('/sellers/:sellerId', canManagePayouts, param('sellerId').isMongoId(), validate, createPayout);
payoutRouter.post('/:payoutId/retry', canManagePayouts, param('payoutId').isMongoId(), validate, retryPayout);

// --- Seller (own history/balance, mounted separately at /api/seller/payouts) ---
export const sellerPayoutRouter = express.Router();
sellerPayoutRouter.get('/', requireApprovedSeller, getMyPayouts);
sellerPayoutRouter.get('/balance', requireApprovedSeller, getMyBalance);

export default payoutRouter;
