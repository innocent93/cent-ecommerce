import { body, param } from 'express-validator';

export const placeOrderValidator = [
  body('shippingAddress.fullName').trim().notEmpty().withMessage('Full name is required'),
  body('shippingAddress.line1').trim().notEmpty().withMessage('Address line 1 is required'),
  body('shippingAddress.city').trim().notEmpty().withMessage('City is required'),
  body('shippingAddress.postalCode').trim().notEmpty().withMessage('Postal code is required'),
  body('shippingAddress.country')
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('Country must be a 2-letter ISO code, e.g. "NG", "GH", "US"'),
  body('shippingAddress.phone').trim().notEmpty().withMessage('Phone number is required'),
  body('paymentMethod').isIn(['cod', 'paystack']).withMessage('paymentMethod must be "cod" or "paystack"'),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }),
  body('idempotencyKey').optional().isString().isLength({ min: 8, max: 100 }),
  body('couponCode').optional().trim().isLength({ min: 3, max: 30 }),
];

export const orderIdValidator = [param('orderId').isMongoId().withMessage('Invalid order id')];

export const trackingNumberValidator = [
  param('trackingNumber').trim().notEmpty().withMessage('Tracking number is required'),
];

export const updateOrderStatusValidator = [
  param('orderId').isMongoId().withMessage('Invalid order id'),
  body('status')
    .optional()
    .isIn(['placed', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'])
    .withMessage('Invalid status'),
  body('trackingNumber').optional().trim().isLength({ max: 100 }),
  body('carrier').optional().trim().isLength({ max: 100 }),
  body('estimatedDeliveryDate').optional().isISO8601().withMessage('estimatedDeliveryDate must be a valid date'),
  body('note').optional().trim().isLength({ max: 300 }),
  body('location').optional().trim().isLength({ max: 150 }),
];

export const requestRefundValidator = [
  param('orderId').isMongoId().withMessage('Invalid order id'),
  body('reason').trim().isLength({ min: 5, max: 500 }).withMessage('Please provide a reason (5-500 characters)'),
];

export const refundDecisionValidator = [
  param('orderId').isMongoId().withMessage('Invalid order id'),
  body('amount').optional().isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  body('adminNote').optional().trim().isLength({ max: 500 }),
];

export default {
  placeOrderValidator,
  orderIdValidator,
  trackingNumberValidator,
  updateOrderStatusValidator,
  requestRefundValidator,
  refundDecisionValidator,
};
