import * as orderService from '../services/order.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';

// POST /api/orders
export const placeOrder = asyncHandler(async (req, res) => {
  const idempotencyKey = req.body.idempotencyKey || req.headers['idempotency-key'];
  const { order, paystackAuthorizationUrl, isReplay } = await orderService.placeOrder(
    req.user.id,
    { ...req.body, idempotencyKey },
    req.log
  );
  return sendSuccess(res, {
    statusCode: isReplay ? 200 : 201,
    message: isReplay ? 'Order already placed' : 'Order placed successfully',
    order,
    ...(paystackAuthorizationUrl && { paystackAuthorizationUrl }),
  });
});

// GET /api/orders/mine
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.getMyOrders(req.user.id);
  return sendSuccess(res, { orders });
});

// GET /api/orders/:orderId
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.orderId, {
    userId: req.user?.id,
    isAdmin: Boolean(req.admin),
  });
  return sendSuccess(res, { order });
});

// GET /api/orders/track/:trackingNumber — public, no auth required (like
// Jumia/DHL "track your package" pages).
export const trackOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderByTrackingNumber(req.params.trackingNumber);
  return sendSuccess(res, { order });
});

// GET /api/orders  (admin)
export const getAllOrders = asyncHandler(async (req, res) => {
  const { orders, pagination } = await orderService.getAllOrders(req.query);
  return sendSuccess(res, { orders, pagination });
});

// PATCH /api/orders/:orderId/status  (admin)
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderStatus(req.params.orderId, req.body, req.log);
  return sendSuccess(res, { message: 'Order updated', order });
});

// --- Refunds ---

// POST /api/orders/:orderId/refund-request  (customer)
export const requestRefund = asyncHandler(async (req, res) => {
  const order = await orderService.requestRefund(req.params.orderId, req.user.id, req.body.reason);
  return sendSuccess(res, { message: 'Refund requested. We will review it shortly.', order });
});

// GET /api/orders/refunds  (admin) — pending requests queue
export const getRefundRequests = asyncHandler(async (req, res) => {
  const { orders, pagination } = await orderService.getRefundRequests(req.query);
  return sendSuccess(res, { orders, pagination });
});

// PATCH /api/orders/:orderId/refund/approve  (admin)
export const approveRefund = asyncHandler(async (req, res) => {
  const order = await orderService.approveRefund(req.params.orderId, req.body, req.log);
  return sendSuccess(res, { message: 'Refund processed', order });
});

// PATCH /api/orders/:orderId/refund/reject  (admin)
export const rejectRefund = asyncHandler(async (req, res) => {
  const order = await orderService.rejectRefund(req.params.orderId, req.body, req.log);
  return sendSuccess(res, { message: 'Refund request rejected', order });
});

export default {
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
};
