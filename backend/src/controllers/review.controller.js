import * as reviewService from '../services/review.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';

// POST /api/products/:productId/reviews
export const createReview = asyncHandler(async (req, res) => {
  const review = await reviewService.createReview(req.user.id, req.params.productId, req.body);
  req.log.info({ productId: req.params.productId, userId: req.user.id }, 'Review created');
  return sendSuccess(res, { statusCode: 201, message: 'Review submitted', review });
});

// GET /api/products/:productId/reviews
export const getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await reviewService.getProductReviews(req.params.productId);
  return sendSuccess(res, { reviews });
});

// DELETE /api/reviews/:reviewId
export const deleteReview = asyncHandler(async (req, res) => {
  await reviewService.deleteReview(req.params.reviewId, {
    userId: req.user?.id,
    isAdmin: Boolean(req.admin),
  });
  return sendSuccess(res, { message: 'Review deleted' });
});

export default { createReview, getProductReviews, deleteReview };
