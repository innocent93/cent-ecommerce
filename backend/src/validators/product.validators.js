import { body, param, query } from 'express-validator';

export const addProductValidator = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Product description is required'),
  body('price').isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('subCategory').trim().notEmpty().withMessage('Sub-category is required'),
  body('sizes')
    .notEmpty()
    .withMessage('Sizes are required')
    .custom((value) => {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error();
        return true;
      } catch {
        throw new Error('Sizes must be a non-empty JSON array, e.g. ["S","M","L"]');
      }
    }),
  body('bestseller').optional().isIn(['true', 'false', true, false]),
  body('brand').optional().trim().isLength({ max: 100 }),
  body('color').optional().trim().isLength({ max: 50 }),
  body('gender').optional().isIn(['men', 'women', 'unisex', 'kids']),
  body('sku').optional().trim().isLength({ max: 64 }),
  body('stock')
    .optional()
    .custom((value) => {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) throw new Error();
        return true;
      } catch {
        throw new Error('stock must be a JSON object mapping size -> quantity, e.g. {"S":10,"M":5}');
      }
    }),
];

export const removeProductValidator = [body('id').isMongoId().withMessage('Invalid product id')];

export const updateProductValidator = [
  param('productId').isMongoId().withMessage('Invalid product id'),
  body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Product description cannot be empty'),
  body('price').optional().isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
  body('category').optional().trim().notEmpty(),
  body('subCategory').optional().trim().notEmpty(),
  body('bestseller').optional().isIn(['true', 'false', true, false]),
  body('brand').optional().trim().isLength({ max: 100 }),
  body('color').optional().trim().isLength({ max: 50 }),
  body('gender').optional().isIn(['men', 'women', 'unisex', 'kids']),
  body('sku').optional().trim().isLength({ max: 64 }),
  body('sizes')
    .optional()
    .custom((value) => {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error();
        return true;
      } catch {
        throw new Error('Sizes must be a non-empty JSON array, e.g. ["S","M","L"]');
      }
    }),
  body('stock')
    .optional()
    .custom((value) => {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) throw new Error();
        return true;
      } catch {
        throw new Error('stock must be a JSON object mapping size -> quantity, e.g. {"S":10,"M":5}');
      }
    }),
];

export const singleProductValidator = [
  param('productId').optional().isMongoId().withMessage('Invalid product id'),
  query('productId').optional().isMongoId().withMessage('Invalid product id'),
];

export const listProductsValidator = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export default {
  addProductValidator,
  updateProductValidator,
  removeProductValidator,
  singleProductValidator,
  listProductsValidator,
};
