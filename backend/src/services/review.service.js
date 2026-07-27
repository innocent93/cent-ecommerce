import Review from '../models/Review.model.js';
import Product from '../models/Product.model.js';
import Order from '../models/Order.model.js';
import User from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';

const recalculateProductRating = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: productId } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const { avg = 0, count = 0 } = stats[0] || {};
  await Product.findByIdAndUpdate(productId, {
    ratingAverage: Math.round(avg * 10) / 10,
    ratingCount: count,
  });
};

export const createReview = async (userId, productId, { rating, comment }) => {
  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound('Product not found');

  const existing = await Review.findOne({ product: productId, user: userId });
  if (existing) throw ApiError.conflict('You have already reviewed this product');

  const [hasPurchased, reviewer] = await Promise.all([
    Order.exists({
      user: userId,
      'items.product': productId,
      status: { $in: ['delivered', 'shipped', 'out_for_delivery', 'processing', 'confirmed', 'placed'] },
    }),
    User.findById(userId),
  ]);

  const review = await Review.create({
    product: productId,
    user: userId,
    userName: reviewer?.name || 'Anonymous',
    rating,
    comment,
    verifiedPurchase: Boolean(hasPurchased),
  });

  await recalculateProductRating(product._id);
  return review;
};

export const getProductReviews = (productId) => Review.find({ product: productId }).sort({ createdAt: -1 });

export const deleteReview = async (reviewId, requester) => {
  const review = await Review.findById(reviewId);
  if (!review) throw ApiError.notFound('Review not found');

  const isOwner = requester.userId && review.user.toString() === requester.userId;
  if (!isOwner && !requester.isAdmin) {
    throw ApiError.forbidden('Not authorized to delete this review');
  }

  await review.deleteOne();
  await recalculateProductRating(review.product);
};

export default { createReview, getProductReviews, deleteReview };
