import express from 'express';
import {
  placeOrder,
  getMyOrders,
  getOrderById,
  trackOrder,
  getAllOrders,
  updateOrderStatus,
  requestRefund,
  getRefundRequests,
  approveRefund,
  rejectRefund,
} from '../controllers/order.controller.js';
import authUser from '../middleware/auth.js';
import { staffAuth, requirePermission } from '../middleware/adminAuth.js';
import { PERMISSIONS } from '../constants/roles.js';
import validate from '../middleware/validate.js';
import {
  placeOrderValidator,
  orderIdValidator,
  trackingNumberValidator,
  updateOrderStatusValidator,
  requestRefundValidator,
  refundDecisionValidator,
} from '../validators/order.validators.js';

const orderRouter = express.Router();

const canViewOrders = requirePermission(PERMISSIONS.ORDER_VIEW);
const canUpdateOrderStatus = requirePermission(PERMISSIONS.ORDER_UPDATE_STATUS);
const canViewRefunds = requirePermission(PERMISSIONS.REFUND_VIEW);
const canDecideRefunds = requirePermission(PERMISSIONS.REFUND_DECIDE);

// --- Customer routes ---
orderRouter.post('/', authUser, placeOrderValidator, validate, placeOrder);
orderRouter.get('/mine', authUser, getMyOrders);
orderRouter.post('/:orderId/refund-request', authUser, requestRefundValidator, validate, requestRefund);

// --- Public tracking (no auth — like a Jumia/DHL tracking page) ---
orderRouter.get('/track/:trackingNumber', trackingNumberValidator, validate, trackOrder);

// --- Staff routes (support can view + update status; only admin+ can
// decide refunds — see src/constants/roles.js for the full permission map) ---
orderRouter.get('/', canViewOrders, getAllOrders);
orderRouter.get('/refunds', canViewRefunds, getRefundRequests);
orderRouter.get('/admin/:orderId', staffAuth, orderIdValidator, validate, getOrderById);
orderRouter.patch('/:orderId/status', canUpdateOrderStatus, updateOrderStatusValidator, validate, updateOrderStatus);
orderRouter.patch('/:orderId/refund/approve', canDecideRefunds, refundDecisionValidator, validate, approveRefund);
orderRouter.patch('/:orderId/refund/reject', canDecideRefunds, refundDecisionValidator, validate, rejectRefund);

// --- Customer order detail (kept last: matches /:orderId generically) ---
orderRouter.get('/:orderId', authUser, orderIdValidator, validate, getOrderById);

export default orderRouter;
