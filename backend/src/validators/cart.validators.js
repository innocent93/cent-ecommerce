import { body } from 'express-validator';

export const addToCartValidator = [
  body('itemId').isMongoId().withMessage('A valid itemId is required'),
  body('size').isString().trim().notEmpty().withMessage('Size is required'),
];

export const updateCartValidator = [
  body('itemId').isMongoId().withMessage('A valid itemId is required'),
  body('size').isString().trim().notEmpty().withMessage('Size is required'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
];

export default { addToCartValidator, updateCartValidator };
