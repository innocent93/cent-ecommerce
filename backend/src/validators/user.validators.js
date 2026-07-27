import { body } from 'express-validator';
import { STAFF_ROLES } from '../constants/roles.js';

// Shared across every place a *new* password is set (register, reset,
// change-password, staff creation) so the rule is defined once. Mirrors
// exactly what the frontend's live password-strength indicator checks
// (see frontend/src/components/PasswordStrength.jsx) — client-side is UX,
// this is the actual enforcement boundary.
const strongPassword = (field) =>
  body(field)
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must include at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must include at least one lowercase letter')
    .matches(/[^A-Za-z0-9]/)
    .withMessage('Password must include at least one symbol');

export const registerValidator = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').trim().isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  strongPassword('password'),
];

export const loginValidator = [
  body('email').trim().isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const adminLoginValidator = [
  body('email').trim().isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const forgotPasswordValidator = [
  body('email').trim().isEmail().withMessage('Please enter a valid email').normalizeEmail(),
];

export const resetPasswordValidator = [
  body('token').isString().notEmpty().withMessage('Reset token is required'),
  strongPassword('password'),
];

export const verifyEmailValidator = [
  body('token').isString().notEmpty().withMessage('Verification token is required'),
];

export const updateProfileValidator = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('phone').optional().trim().isLength({ max: 20 }),
];

export const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  strongPassword('newPassword'),
];

export const addAddressValidator = [
  body('fullName').trim().notEmpty(),
  body('line1').trim().notEmpty(),
  body('city').trim().notEmpty(),
  body('postalCode').trim().notEmpty(),
  body('country').trim().isLength({ min: 2, max: 2 }),
  body('phone').trim().notEmpty(),
];

// --- Staff management (superadmin only) ---
export const createStaffValidator = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').trim().isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  strongPassword('password'),
  body('role').isIn(STAFF_ROLES).withMessage(`role must be one of: ${STAFF_ROLES.join(', ')}`),
];

export const updateStaffValidator = [
  body('role').optional().isIn(STAFF_ROLES).withMessage(`role must be one of: ${STAFF_ROLES.join(', ')}`),
  body('active').optional().isBoolean().withMessage('active must be true or false'),
];

export default {
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
};
