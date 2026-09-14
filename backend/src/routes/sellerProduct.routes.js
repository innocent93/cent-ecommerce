import express from 'express';
import {
  addSellerProduct,
  listMySellerProducts,
  updateSellerProduct,
  removeSellerProduct,
} from '../controllers/product.controller.js';
import upload from '../middleware/upload.js';
import { requireApprovedSeller } from '../middleware/sellerAuth.js';
import validate from '../middleware/validate.js';
import { addProductValidator, updateProductValidator } from '../validators/product.validators.js';

// Mounted at /api/seller/products — a seller-scoped mirror of
// /api/product/*, reusing the exact same validators/upload config as the
// admin product routes, but gated by requireApprovedSeller (an unapproved
// seller can log in and check their status, but can't list products yet)
// and with ownership enforced in product.service.js (a seller can only
// edit/delete their own products, checked server-side, not just hidden in
// the UI).
const sellerProductRouter = express.Router();

const productImageFields = upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 },
]);

sellerProductRouter.get('/', requireApprovedSeller, listMySellerProducts);
sellerProductRouter.post('/', requireApprovedSeller, productImageFields, addProductValidator, validate, addSellerProduct);
sellerProductRouter.patch(
  '/:productId',
  requireApprovedSeller,
  productImageFields,
  updateProductValidator,
  validate,
  updateSellerProduct
);
sellerProductRouter.delete('/:productId', requireApprovedSeller, removeSellerProduct);

export default sellerProductRouter;
