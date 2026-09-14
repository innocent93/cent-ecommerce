import { body, param } from 'express-validator';

export const previewCouponValidator = [
  body('code').trim().notEmpty().withMessage('Coupon code is required'),
  body('subtotal').isFloat({ gt: 0 }).withMessage('subtotal must be a positive number'),
];

export const createCouponValidator = [
  body('code').trim().isLength({ min: 3, max: 30 }).withMessage('Code must be 3-30 characters'),
  body('type').isIn(['percentage', 'fixed']).withMessage('type must be "percentage" or "fixed"'),
  body('value').isFloat({ gt: 0 }).withMessage('value must be a positive number'),
  body('minOrderAmount').optional().isFloat({ min: 0 }),
  body('maxDiscountAmount').optional().isFloat({ gt: 0 }),
  body('usageLimit').optional().isInt({ gt: 0 }),
  body('usageLimitPerUser').optional().isInt({ gt: 0 }),
  body('startsAt').optional().isISO8601(),
  body('expiresAt').optional().isISO8601(),
];

export const couponIdValidator = [param('couponId').isMongoId().withMessage('Invalid coupon id')];

export default { previewCouponValidator, createCouponValidator, couponIdValidator };
