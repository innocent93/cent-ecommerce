import { body, param } from 'express-validator';

export const registerSellerValidator = [
  body('businessName').trim().isLength({ min: 2, max: 150 }),
  body('ownerName').optional().trim().isLength({ min: 2, max: 100 }),
  body('email')
    .if(body('googleIdToken').not().exists())
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .if(body('googleIdToken').not().exists())
    .isLength({ min: 8 })
    .matches(/[A-Z]/)
    .matches(/[a-z]/)
    .matches(/[^A-Za-z0-9]/)
    .withMessage('Password must be 8+ characters with an uppercase letter, lowercase letter, and symbol'),
  body('googleIdToken').optional().isString(),
  body('phone').optional().trim(),
];

export const googleLoginValidator = [body('idToken').isString().notEmpty()];

export const loginSellerValidator = [
  body('email').trim().isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

export const bankDetailsValidator = [
  body('accountNumber').trim().isLength({ min: 10, max: 10 }).withMessage('Account number must be 10 digits'),
  body('bankCode').trim().notEmpty().withMessage('Bank code is required'),
  body('accountName').trim().notEmpty(),
];

export const sellerIdValidator = [param('sellerId').isMongoId()];

export const setSellerStatusValidator = [
  param('sellerId').isMongoId(),
  body('status').isIn(['pending', 'approved', 'suspended']),
];

export default {
  registerSellerValidator,
  loginSellerValidator,
  googleLoginValidator,
  bankDetailsValidator,
  sellerIdValidator,
  setSellerStatusValidator,
};
