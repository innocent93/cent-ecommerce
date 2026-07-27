import express from 'express';
import { addProduct, listProducts, removeProduct, updateProduct, singleProduct } from '../controllers/product.controller.js';
import upload from '../middleware/upload.js';
import { requirePermission } from '../middleware/adminAuth.js';
import { PERMISSIONS } from '../constants/roles.js';
import validate from '../middleware/validate.js';
import {
  addProductValidator,
  updateProductValidator,
  removeProductValidator,
  listProductsValidator,
} from '../validators/product.validators.js';

const productRouter = express.Router();

const productImageFields = upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 },
]);

const canManageProducts = requirePermission(PERMISSIONS.PRODUCT_MANAGE);

productRouter.get('/list', listProductsValidator, validate, listProducts);
productRouter.get('/single', singleProduct);
productRouter.post('/remove', canManageProducts, removeProductValidator, validate, removeProduct);
productRouter.post(
  '/add',
  canManageProducts,
  productImageFields,
  addProductValidator,
  validate,
  addProduct
);
productRouter.patch(
  '/:productId',
  canManageProducts,
  productImageFields,
  updateProductValidator,
  validate,
  updateProduct
);
// NOTE: the original codebase exposed a second, *unauthenticated* endpoint
// `/api/product/addproduct` that called a broken duplicate handler and let
// anyone (no admin token required) create products. It has been removed —
// product creation now only exists at the permission-gated `/api/product/add`.

export default productRouter;
