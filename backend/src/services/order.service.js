import crypto from 'crypto';
import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';
import User from '../models/User.model.js';
import config from '../config/env.js';
import logger from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { convert } from '../utils/currency.js';
import * as paystackService from './paystack.service.js';
import * as emailService from './email.service.js';
import * as smsService from './sms.service.js';
import * as couponService from './coupon.service.js';
import { calculateShippingFee } from '../utils/shipping.js';

// Atomically decrements stock for one (productId, size, quantity), but only
// if enough stock exists — avoids overselling under concurrent checkouts
// without requiring a MongoDB replica set / multi-document transaction.
// If the product doesn't track stock for that size (`stock` unset), it's
// treated as unlimited and always succeeds.
const tryDecrementStock = async (productId, size, quantity) => {
  const product = await Product.findById(productId);
  if (!product) return { ok: false, reason: 'not_found' };
  if (!product.stock) return { ok: true, tracked: false };

  const key = `stock.${size}`;
  const updated = await Product.findOneAndUpdate(
    { _id: productId, [key]: { $gte: quantity } },
    { $inc: { [key]: -quantity } },
    { new: true }
  );
  if (!updated) return { ok: false, reason: 'insufficient_stock' };
  return { ok: true, tracked: true };
};

const restoreStock = async (productId, size, quantity) => {
  await Product.updateOne({ _id: productId, stock: { $ne: null } }, { $inc: { [`stock.${size}`]: quantity } });
};

// Builds the priced line items + totals from a user's cart. Pure/no side
// effects — used by placeOrder before anything is committed.
const buildOrderFromCart = async (user, currency, shippingAddress) => {
  const cartData = user.cartData || {};
  const productIds = Object.keys(cartData);
  if (productIds.length === 0) {
    throw ApiError.badRequest('Your cart is empty');
  }

  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const items = [];
  let subtotalBase = 0;

  for (const productId of productIds) {
    const product = productMap.get(productId);
    if (!product) throw ApiError.badRequest('A product in your cart is no longer available');

    for (const [size, qty] of Object.entries(cartData[productId])) {
      const quantity = Number(qty);
      if (!quantity || quantity <= 0) continue;
      items.push({
        product: product._id,
        name: product.name,
        image: product.image?.[0],
        size,
        quantity,
        unitPriceBase: product.price,
      });
      subtotalBase += product.price * quantity;
    }
  }

  if (items.length === 0) throw ApiError.badRequest('Your cart is empty');

  const shippingFeeBase = calculateShippingFee(subtotalBase, {
    country: shippingAddress?.country,
    state: shippingAddress?.state,
  });
  const totalBase = subtotalBase + shippingFeeBase;

  return { items, subtotalBase, shippingFeeBase, totalBase };
};

// Reserves stock for every line item; rolls back everything already
// reserved if any single item fails, so a failed checkout never leaves
// stock partially deducted.
const reserveStock = async (items) => {
  const decremented = [];
  for (const item of items) {
    const result = await tryDecrementStock(item.product, item.size, item.quantity);
    if (!result.ok) {
      for (const d of decremented) await restoreStock(d.product, d.size, d.quantity);
      if (result.reason === 'not_found') {
        throw ApiError.badRequest('A product in your cart is no longer available');
      }
      throw ApiError.conflict(`"${item.name}" (size ${item.size}) is out of stock or has insufficient quantity`);
    }
    decremented.push(item);
  }
};

export const placeOrder = async (userId, { shippingAddress, paymentMethod, currency: requestedCurrency, idempotencyKey, couponCode }, log) => {
  // If this exact checkout attempt (same user + same client-generated key)
  // already produced an order — from a double-click, a client retry after a
  // dropped response, or a flaky network — return that order instead of
  // creating (and reserving stock for) a second one.
  if (idempotencyKey) {
    const existing = await Order.findOne({ user: userId, idempotencyKey });
    if (existing) {
      log?.info({ userId, orderId: existing._id.toString(), idempotencyKey }, 'Idempotent replay: returning existing order');
      // A fresh Paystack authorization URL can't be reconstructed after the
      // fact; a client retrying a Paystack checkout should follow the order's
      // existing `paymentReference`/`paymentStatus` rather than expect a new
      // redirect URL here.
      return { order: existing, paystackAuthorizationUrl: undefined, isReplay: true };
    }
  }

  if (
    config.shippingCountries.length > 0 &&
    !config.shippingCountries.includes(shippingAddress.country.toUpperCase())
  ) {
    throw ApiError.badRequest(
      `Sorry, we don't currently ship to ${shippingAddress.country}. We ship to: ${config.shippingCountries.join(', ')}`
    );
  }

  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const currency = (requestedCurrency || user.preferredCurrency || config.baseCurrency).toUpperCase();
  const { items, subtotalBase, shippingFeeBase } = await buildOrderFromCart(user, currency, shippingAddress);

  let discountAmountBase = 0;
  let appliedCoupon;
  if (couponCode) {
    const result = await couponService.validateCoupon(couponCode, { userId, subtotalBase });
    discountAmountBase = result.discountAmountBase;
    appliedCoupon = result.coupon;
  }

  const totalBase = Math.max(subtotalBase + shippingFeeBase - discountAmountBase, 0);

  await reserveStock(items);

  const { amount: subtotal } = convert(subtotalBase, currency);
  const { amount: shippingFee } = convert(shippingFeeBase, currency);
  const { amount: discountAmount } = convert(discountAmountBase, currency);
  const { amount: total } = convert(totalBase, currency);

  const commissionRate = config.commissionRate;
  const commissionAmount = Math.round((subtotal - discountAmount) * commissionRate * 100) / 100;

  let paymentStatus = 'pending';
  let paystackAuthorizationUrl;
  let paymentReference;

  if (paymentMethod === 'paystack') {
    paymentReference = `PSK-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const init = await paystackService.initializeTransaction({
      email: user.email,
      amountMajorUnits: total,
      currency,
      reference: paymentReference,
      metadata: { userId: userId.toString() },
    });
    paystackAuthorizationUrl = init.authorization_url;
  }
  // 'cod' (cash on delivery): nothing to charge now, paymentStatus stays 'pending'.

  let order;
  try {
    order = await Order.create({
      user: userId,
      idempotencyKey: idempotencyKey || undefined,
      items: items.map((i) => ({
        product: i.product,
        name: i.name,
        image: i.image,
        size: i.size,
        quantity: i.quantity,
        price: convert(i.unitPriceBase, currency).amount,
      })),
      currency,
      subtotal,
      shippingFee,
      couponCode: appliedCoupon?.code,
      discountAmount,
      total,
      totalBaseCurrency: totalBase,
      commissionRate,
      commissionAmount,
      shippingAddress,
      paymentMethod,
      paymentStatus,
      paymentReference,
      status: 'placed',
    });
  } catch (err) {
    // Two concurrent requests with the same idempotency key both passed the
    // findOne check above and raced to insert — the unique index catches
    // the loser here. Roll back the stock we just reserved and return the
    // winner's order instead of a confusing duplicate-key error.
    if (err.code === 11000 && idempotencyKey) {
      for (const item of items) await restoreStock(item.product, item.size, item.quantity);
      const winner = await Order.findOne({ user: userId, idempotencyKey });
      if (winner) return { order: winner, paystackAuthorizationUrl: undefined, isReplay: true };
    }
    throw err;
  }

  if (appliedCoupon) {
    await couponService.redeemCoupon(appliedCoupon._id, userId, order._id);
  }

  // Cart is cleared once converted into an order. For Paystack orders this
  // does mean an abandoned payment leaves the cart empty — acceptable
  // trade-off here since the order + stock reservation already exist and
  // can be resumed/cancelled from the order rather than the cart.
  user.cartData = {};
  user.markModified('cartData');
  await user.save();

  log?.info({ userId, orderId: order._id.toString(), total, currency, paymentMethod }, 'Order placed');

  // Fire-and-forget: email.service.js never throws, so a slow/down SMTP
  // provider can't delay or fail the checkout response.
  emailService.sendOrderConfirmationEmail(user, order).catch((err) => log?.error({ err }, 'sendOrderConfirmationEmail failed'));
  emailService.sendAdminNewOrderNotification(order).catch((err) => log?.error({ err }, 'sendAdminNewOrderNotification failed'));
  smsService.sendOrderConfirmationSms(user.phone, order).catch((err) => log?.error({ err }, 'sendOrderConfirmationSms failed'));

  return { order, paystackAuthorizationUrl };
};

export const getMyOrders = (userId) => Order.find({ user: userId }).sort({ createdAt: -1 });

export const getOrderById = async (orderId, requester) => {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');

  const isOwner = requester.userId && order.user.toString() === requester.userId;
  if (!isOwner && !requester.isAdmin) {
    throw ApiError.forbidden('Not authorized to view this order');
  }
  return order;
};

export const getOrderByTrackingNumber = async (trackingNumber) => {
  const order = await Order.findOne({ trackingNumber }).select(
    'orderNumber status trackingNumber carrier estimatedDeliveryDate deliveredAt trackingEvents createdAt'
  );
  if (!order) throw ApiError.notFound('No order found with that tracking number');
  return order;
};

export const getAllOrders = async ({ status, page = 1, limit = 20 }) => {
  const filter = {};
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Order.countDocuments(filter),
  ]);

  return { orders, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) } };
};

// Admin: update order status and/or delivery/tracking info (courier,
// tracking number, ETA) in one call — mirrors how a Jumia/Amazon seller
// dashboard updates a shipment.
export const updateOrderStatus = async (orderId, { status, trackingNumber, carrier, estimatedDeliveryDate, note, location }, log) => {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');

  if (status && status === 'cancelled' && order.status !== 'cancelled' && order.status !== 'delivered') {
    for (const item of order.items) {
      await restoreStock(item.product, item.size, item.quantity);
    }
  }

  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (carrier) order.carrier = carrier;
  if (estimatedDeliveryDate) order.estimatedDeliveryDate = new Date(estimatedDeliveryDate);

  if (status) {
    order.status = status;
  } else if (note || location) {
    // Allow adding a tracking checkpoint (e.g. "Arrived at Lagos hub")
    // without necessarily changing the top-level status.
    order.trackingEvents.push({ status: order.status, note, location, at: new Date() });
  }

  await order.save();
  log?.info({ orderId: order._id.toString(), status: order.status }, 'Order updated');

  // Notify the customer on any real status change — 'placed' is skipped
  // since the order-confirmation email already covers that moment.
  if (status && status !== 'placed') {
    const user = await User.findById(order.user);
    if (user) {
      emailService
        .sendShippingUpdateEmail(user, order)
        .catch((err) => log?.error({ err }, 'sendShippingUpdateEmail failed'));

      if (status === 'shipped') {
        smsService.sendShippingSms(user.phone, order).catch((err) => log?.error({ err }, 'sendShippingSms failed'));
      } else if (status === 'delivered') {
        smsService.sendDeliverySms(user.phone, order).catch((err) => log?.error({ err }, 'sendDeliverySms failed'));
      }
    }
  }

  return order;
};

// Called from the Paystack webhook once a payment is verified as successful.
export const markOrderPaid = async (paymentReference, log) => {
  const order = await Order.findOne({ paymentReference });
  if (!order) {
    log?.warn({ paymentReference }, 'Paystack webhook: no matching order found');
    return null;
  }
  if (order.paymentStatus === 'paid') return order; // idempotent — webhooks can be delivered more than once

  order.paymentStatus = 'paid';
  order.paidAt = new Date();
  if (order.status === 'placed') order.status = 'confirmed';
  await order.save();

  log?.info({ orderId: order._id.toString(), paymentReference }, 'Order marked paid via Paystack webhook');

  const user = await User.findById(order.user);
  if (user) {
    emailService
      .sendPaymentConfirmationEmail(user, order)
      .catch((err) => log?.error({ err }, 'sendPaymentConfirmationEmail failed'));
  }

  return order;
};

export const markOrderPaymentFailed = async (paymentReference, log) => {
  const order = await Order.findOne({ paymentReference });
  if (!order) return null;
  order.paymentStatus = 'failed';
  await order.save();
  log?.warn({ orderId: order._id.toString(), paymentReference }, 'Order payment failed via Paystack webhook');
  return order;
};

// --- Refund workflow -----------------------------------------------------
// request (customer) -> approved/rejected (admin) -> completed (automatic
// Paystack refund call on approval, or manual for COD) -> stock restored,
// customer emailed. Every transition is logged for audit purposes.

export const requestRefund = async (orderId, userId, reason) => {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.user.toString() !== userId) throw ApiError.forbidden('Not authorized to refund this order');

  if (order.paymentStatus !== 'paid') {
    throw ApiError.badRequest('Only paid orders can be refunded');
  }
  if (order.refund.status !== 'none' && order.refund.status !== 'rejected') {
    throw ApiError.conflict(`A refund is already ${order.refund.status} for this order`);
  }

  order.refund = {
    status: 'requested',
    reason,
    requestedAt: new Date(),
  };
  await order.save();

  return order;
};

export const getRefundRequests = async ({ page = 1, limit = 20 } = {}) => {
  const filter = { 'refund.status': 'requested' };
  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ 'refund.requestedAt': 1 }).skip(skip).limit(Number(limit)),
    Order.countDocuments(filter),
  ]);
  return { orders, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) } };
};

// Admin: approve a refund request. For Paystack orders this calls Paystack's
// refund API (real money movement); for COD orders (which were never
// charged through Paystack) this just records the refund as completed —
// the actual money-back happens outside the system (e.g. bank transfer),
// which the admin confirms manually.
export const approveRefund = async (orderId, { amount, adminNote }, log) => {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.refund.status !== 'requested') {
    throw ApiError.badRequest('This order does not have a pending refund request');
  }

  const refundAmount = amount || order.total;
  if (refundAmount > order.total) {
    throw ApiError.badRequest('Refund amount cannot exceed the order total');
  }

  if (order.paymentMethod === 'paystack') {
    const result = await paystackService.refundTransaction({
      reference: order.paymentReference,
      amountMajorUnits: refundAmount,
      reason: adminNote,
    });
    order.refund.paystackRefundId = String(result.id || '');
  }

  order.refund.status = 'completed';
  order.refund.amount = refundAmount;
  order.refund.processedAt = new Date();
  order.refund.adminNote = adminNote;
  order.paymentStatus = 'refunded';

  // Restore stock only if it hadn't already been restored by a cancellation.
  if (order.status !== 'cancelled' && order.status !== 'returned') {
    for (const item of order.items) await restoreStock(item.product, item.size, item.quantity);
  }
  order.status = 'returned';

  await order.save();
  log?.info({ orderId: order._id.toString(), refundAmount }, 'Refund approved and processed');

  const user = await User.findById(order.user);
  if (user) {
    emailService.sendRefundEmail(user, order, refundAmount).catch((err) => log?.error({ err }, 'sendRefundEmail failed'));
    smsService.sendRefundSms(user.phone, order, refundAmount).catch((err) => log?.error({ err }, 'sendRefundSms failed'));
  }

  return order;
};

export const rejectRefund = async (orderId, { adminNote }, log) => {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.refund.status !== 'requested') {
    throw ApiError.badRequest('This order does not have a pending refund request');
  }

  order.refund.status = 'rejected';
  order.refund.adminNote = adminNote;
  order.refund.processedAt = new Date();
  await order.save();

  log?.info({ orderId: order._id.toString() }, 'Refund request rejected');
  return order;
};

export default {
  placeOrder,
  getMyOrders,
  getOrderById,
  getOrderByTrackingNumber,
  getAllOrders,
  updateOrderStatus,
  markOrderPaid,
  markOrderPaymentFailed,
  requestRefund,
  getRefundRequests,
  approveRefund,
  rejectRefund,
};
