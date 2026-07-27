import express from 'express';
import { createReview, getProductReviews, deleteReview } from '../controllers/review.controller.js';
import authUser from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import {
  createReviewValidator,
  productIdParamValidator,
  reviewIdParamValidator,
} from '../validators/review.validators.js';

// Mounted twice from app.js:
//   /api/products/:productId/reviews  (create, list)
//   /api/reviews/:reviewId            (delete)
const productReviewRouter = express.Router({ mergeParams: true });
productReviewRouter.get('/', productIdParamValidator, validate, getProductReviews);
productReviewRouter.post('/', authUser, createReviewValidator, validate, createReview);

const reviewRouter = express.Router();
reviewRouter.delete('/:reviewId', authUser, reviewIdParamValidator, validate, deleteReview);

export { productReviewRouter, reviewRouter };
export default productReviewRouter;
