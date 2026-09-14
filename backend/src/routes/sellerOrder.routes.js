import express from 'express';
import { getMySellerOrders, updateMySellerOrderStatus } from '../controllers/order.controller.js';
import { requireApprovedSeller } from '../middleware/sellerAuth.js';
import validate from '../middleware/validate.js';
import { updateOrderStatusValidator } from '../validators/order.validators.js';

// Mounted at /api/seller/orders — a seller-scoped mirror of /api/orders,
// ownership enforced in order.service.js#updateSellerOrderStatus, not just
// hidden in a UI.
const sellerOrderRouter = express.Router();

sellerOrderRouter.get('/', requireApprovedSeller, getMySellerOrders);
sellerOrderRouter.patch('/:orderId/status', requireApprovedSeller, updateOrderStatusValidator, validate, updateMySellerOrderStatus);

export default sellerOrderRouter;
