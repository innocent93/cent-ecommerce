import User from '../models/User.model.js';
import Product from '../models/Product.model.js';
import { ApiError } from '../utils/ApiError.js';

// cartData shape: { [productId]: { [size]: quantity } }

export const addToCart = async (userId, itemId, size) => {
  const product = await Product.findById(itemId);
  if (!product) throw ApiError.notFound('Product not found');
  if (!product.sizes.includes(size)) {
    throw ApiError.badRequest(`"${size}" is not an available size for this product`);
  }

  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const cartData = user.cartData || {};
  cartData[itemId] = cartData[itemId] || {};
  const nextQty = (cartData[itemId][size] || 0) + 1;

  // Soft check only — this is UX (fail fast with a clear message), not the
  // source of truth. Stock is atomically re-checked and reserved at
  // checkout (order.service.js) to prevent race conditions between two
  // shoppers adding the last pair of shoes to their carts simultaneously.
  if (product.stock) {
    const available = product.stock.get(size) ?? 0;
    if (nextQty > available) {
      throw ApiError.conflict(
        available === 0
          ? `"${product.name}" (size ${size}) is out of stock`
          : `Only ${available} left of "${product.name}" (size ${size})`
      );
    }
  }

  cartData[itemId][size] = nextQty;
  user.cartData = cartData;
  user.markModified('cartData');
  await user.save();

  return user.cartData;
};

export const updateCart = async (userId, itemId, size, quantity) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const cartData = user.cartData || {};

  if (quantity <= 0) {
    if (cartData[itemId]) {
      delete cartData[itemId][size];
      if (Object.keys(cartData[itemId]).length === 0) delete cartData[itemId];
    }
  } else {
    cartData[itemId] = cartData[itemId] || {};
    cartData[itemId][size] = quantity;
  }

  user.cartData = cartData;
  user.markModified('cartData');
  await user.save();

  return user.cartData;
};

export const getUserCart = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user.cartData || {};
};

export default { addToCart, updateCart, getUserCart };
