import * as cartService from '../services/cart.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';

// POST /api/cart/add  { itemId, size }
export const addToCart = asyncHandler(async (req, res) => {
  const { itemId, size } = req.body;
  const cartData = await cartService.addToCart(req.user.id, itemId, size);
  req.log.info({ userId: req.user.id, itemId, size }, 'Item added to cart');
  return sendSuccess(res, { message: 'Added to cart', cartData });
});

// PUT /api/cart/update  { itemId, size, quantity }
export const updateCart = asyncHandler(async (req, res) => {
  const { itemId, size, quantity } = req.body;
  const cartData = await cartService.updateCart(req.user.id, itemId, size, quantity);
  req.log.info({ userId: req.user.id, itemId, size, quantity }, 'Cart updated');
  return sendSuccess(res, { message: 'Cart updated', cartData });
});

// POST /api/cart/get
export const getUserCart = asyncHandler(async (req, res) => {
  const cartData = await cartService.getUserCart(req.user.id);
  return sendSuccess(res, { cartData });
});

export default { addToCart, updateCart, getUserCart };
