import * as productService from '../services/product.service.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';

// POST /api/product/add
export const addProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body, req.files || {});
  req.log.info({ productId: product._id.toString() }, 'Product created');
  return sendSuccess(res, { statusCode: 201, message: 'Product added successfully', product });
});

// GET /api/product/list
export const listProducts = asyncHandler(async (req, res) => {
  const { products, pagination } = await productService.listProducts(req.query);
  return sendSuccess(res, { products, ...(pagination && { pagination }) });
});

// POST /api/product/remove
export const removeProduct = asyncHandler(async (req, res) => {
  await productService.removeProduct(req.body.id);
  req.log.info({ productId: req.body.id }, 'Product removed');
  return sendSuccess(res, { message: 'Product removed' });
});

// PATCH /api/product/:productId
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.productId, req.body, req.files || {});
  req.log.info({ productId: product._id.toString() }, 'Product updated');
  return sendSuccess(res, { message: 'Product updated', product });
});

// GET /api/product/single
export const singleProduct = asyncHandler(async (req, res) => {
  const productId = req.query.productId || req.body.productId;
  if (!productId) throw ApiError.badRequest('productId is required');
  const product = await productService.getProductById(productId, req.query.currency);
  return sendSuccess(res, { product });
});

// --- Seller-scoped (Option B marketplace) ---------------------------------

// POST /api/seller/products
export const addSellerProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body, req.files || {}, req.seller.id);
  req.log.info({ productId: product._id.toString(), sellerId: req.seller.id }, 'Seller product created');
  return sendSuccess(res, { statusCode: 201, message: 'Product added successfully', product });
});

// GET /api/seller/products
export const listMySellerProducts = asyncHandler(async (req, res) => {
  const products = await productService.listSellerProducts(req.seller.id);
  return sendSuccess(res, { products });
});

// PATCH /api/seller/products/:productId
export const updateSellerProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.productId, req.body, req.files || {}, req.seller.id);
  return sendSuccess(res, { message: 'Product updated', product });
});

// DELETE /api/seller/products/:productId
export const removeSellerProduct = asyncHandler(async (req, res) => {
  await productService.removeProduct(req.params.productId, req.seller.id);
  return sendSuccess(res, { message: 'Product removed' });
});

export default {
  addProduct,
  listProducts,
  removeProduct,
  updateProduct,
  singleProduct,
  addSellerProduct,
  listMySellerProducts,
  updateSellerProduct,
  removeSellerProduct,
};