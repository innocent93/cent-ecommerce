import express from 'express';
import {
  previewCoupon,
  createCoupon,
  listCoupons,
  updateCoupon,
  deleteCoupon,
} from '../controllers/coupon.controller.js';
import authUser from '../middleware/auth.js';
import { requirePermission } from '../middleware/adminAuth.js';
import { PERMISSIONS } from '../constants/roles.js';
import validate from '../middleware/validate.js';
import { previewCouponValidator, createCouponValidator, couponIdValidator } from '../validators/coupon.validators.js';

const couponRouter = express.Router();
const canManageCoupons = requirePermission(PERMISSIONS.COUPON_MANAGE);

couponRouter.post('/validate', authUser, previewCouponValidator, validate, previewCoupon);

// --- Admin (admin/superadmin only — support cannot create discounts) ---
couponRouter.get('/', canManageCoupons, listCoupons);
couponRouter.post('/', canManageCoupons, createCouponValidator, validate, createCoupon);
couponRouter.patch('/:couponId', canManageCoupons, couponIdValidator, validate, updateCoupon);
couponRouter.delete('/:couponId', canManageCoupons, couponIdValidator, validate, deleteCoupon);

export default couponRouter;
