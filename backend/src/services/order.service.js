import crypto from 'crypto';
import mongoose from 'mongoose';
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
import { groupItemsBySeller, computeSubtotal, allocateProportionally } from '../utils/orderSplit.js';

// Atomically decrements stock for one (productId, size, quantity), but only
// if enough stock exists — avoids overselling under concurrent checkouts.
// Runs inside the checkout transaction (see placeOrder) when a session is
// provided, so a failed reservation aborts the *entire* checkout — order
// creation, coupon redemption, and cart-clearing all roll back together,
// atomically, via MongoDB's transaction commit/abort rather than manual
// compensating-rollback code. If the product doesn't track stock for that
// size (`stock` unset), it's treated as unlimited and always succeeds.
const tryDecrementStock = async (productId, size, quantity, session) => {
  const product = await Product.findById(productId).session(session ?? null);
  if (!product) return { ok: false, reason: 'not_found' };
  if (!product.stock) return { ok: true, tracked: false };

  const key = `stock.${size}`;
  const updated = await Product.findOneAndUpdate(
    { _id: productId, [key]: { $gte: quantity } },
    { $inc: { [key]: -quantity } },
    { new: true, session }
  );
  if (!updated) return { ok: false, reason: 'insufficient_stock' };
  return { ok: true, tracked: true };
};

// Used outside the transactional checkout path — order cancellation and
// refund approval, which happen well after the original checkout
// transaction has already committed, so they're their own atomic
// operations rather than part of a longer-running transaction.
const restoreStock = async (productId, size, quantity, session) => {
  await Product.updateOne(
    { _id: productId, stock: { $ne: null } },
    { $inc: { [`stock.${size}`]: quantity } },
    { session }
  );
};

// Builds the priced line items + totals from a user's cart, including
// which seller (if any) owns each product — the foundation for splitting a
// mixed cart into one Order per seller. Pure/no side effects (read-only) —
// used by placeOrder before the transaction starts.
const buildOrderFromCart = async (user) => {
  const cartData = user.cartData || {};
  const productIds = Object.keys(cartData);
  if (productIds.length === 0) {
    throw ApiError.badRequest('Your cart is empty');
  }

  const products = await Product.find({ _id: { $in: productIds } }).populate('seller', 'commissionRateOverride status');
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const items = [];

  for (const productId of productIds) {
    const product = productMap.get(productId);
    if (!product) throw ApiError.badRequest('A product in your cart is no longer available');
    if (product.seller && product.seller.status !== 'approved') {
      throw ApiError.badRequest(`"${product.name}" is currently unavailable`);
    }

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
        sellerId: product.seller?._id || null,
        sellerCommissionRate: product.seller?.commissionRateOverride,
      });
    }
  }

  if (items.length === 0) throw ApiError.badRequest('Your cart is empty');
  return items;
};

// Reserves stock for every line item within the given transaction session.
// No manual rollback loop needed here (unlike the pre-transaction version
// of this code) — if any item fails, this throws, session.withTransaction()
// catches it and aborts the whole transaction, and MongoDB itself undoes
// every $inc already applied in this attempt. That's the actual point of
// using a real transaction instead of hand-rolled compensating logic.
const reserveStock = async (items, session) => {
  for (const item of items) {
    const result = await tryDecrementStock(item.product, item.size, item.quantity, session);
    if (!result.ok) {
      if (result.reason === 'not_found') {
        throw ApiError.badRequest('A product in your cart is no longer available');
      }
      throw ApiError.conflict(`"${item.name}" (size ${item.size}) is out of stock or has insufficient quantity`);
    }
  }
};

// Checkout — splits a cart spanning multiple sellers into one Order per
// seller (grouped under a shared checkoutSessionId + paymentReference, so
// the customer pays ONCE for the whole cart, but each seller gets their own
// Order document with their own totals/tracking/status — see
// MARKETPLACE_MIGRATION.md for the full reasoning behind this design). A
// cart with only platform-owned products (Option A behavior, or a store
// that hasn't onboarded any sellers yet) produces exactly one Order,
// identical in every respect to the pre-marketplace implementation.
export const placeOrder = async (userId, { shippingAddress, paymentMethod, currency: requestedCurrency, idempotencyKey, couponCode }, log) => {
  // If this exact checkout attempt already produced orders — a double-click,
  // a client retry, a flaky network — return those instead of creating (and
  // reserving stock for) new ones.
  if (idempotencyKey) {
    const existing = await Order.find({ user: userId, idempotencyKey });
    if (existing.length > 0) {
      log?.info({ userId, idempotencyKey, orderCount: existing.length }, 'Idempotent replay: returning existing orders');
      return { orders: existing, paystackAuthorizationUrl: undefined, isReplay: true };
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
  const items = await buildOrderFromCart(user);

  const groups = groupItemsBySeller(items);
  const groupKeys = [...groups.keys()];

  // Each seller group gets its OWN shipping fee — they ship independently,
  // from different locations, so a per-shipment threshold-based fee is the
  // realistic model (not one combined fee split arbitrarily across sellers).
  const groupSubtotalsBase = {};
  const groupShippingFeesBase = {};
  for (const key of groupKeys) {
    const groupItems = groups.get(key);
    const subtotal = computeSubtotal(groupItems);
    groupSubtotalsBase[key] = subtotal;
    groupShippingFeesBase[key] = calculateShippingFee(subtotal, {
      country: shippingAddress?.country,
      state: shippingAddress?.state,
    });
  }

  const cartSubtotalBase = Object.values(groupSubtotalsBase).reduce((s, v) => s + v, 0);

  // Coupon is validated once against the WHOLE cart, then its discount is
  // allocated proportionally across seller groups by subtotal share (see
  // orderSplit.js#allocateProportionally — rounding-safe, guaranteed to sum
  // to exactly the original discount, tested explicitly for this).
  let appliedCoupon;
  let discountAllocationBase = Object.fromEntries(groupKeys.map((k) => [k, 0]));
  if (couponCode) {
    const result = await couponService.validateCoupon(couponCode, { userId, subtotalBase: cartSubtotalBase });
    appliedCoupon = result.coupon;
    discountAllocationBase = allocateProportionally(result.discountAmountBase, groupSubtotalsBase);
  }

  // Per-group totals, converted to the checkout currency.
  const groupTotals = {};
  let grandTotalBase = 0;
  for (const key of groupKeys) {
    const subtotalBase = groupSubtotalsBase[key];
    const shippingFeeBase = groupShippingFeesBase[key];
    const discountBase = discountAllocationBase[key] || 0;
    const totalBase = Math.max(subtotalBase + shippingFeeBase - discountBase, 0);
    grandTotalBase += totalBase;

    const { amount: subtotal } = convert(subtotalBase, currency);
    const { amount: shippingFee } = convert(shippingFeeBase, currency);
    const { amount: discountAmount } = convert(discountBase, currency);
    const { amount: total } = convert(totalBase, currency);

    // Platform-owned items ('platform' group) have no seller to pay out to,
    // so commission is meaningless for them — the platform keeps 100% of
    // that portion by definition, commissionAmount stays 0 rather than
    // double-counting revenue that was never split with anyone.
    const isSellerGroup = key !== 'platform';
    const groupItems = groups.get(key);
    const sellerCommissionRate = isSellerGroup ? (groupItems[0].sellerCommissionRate ?? config.commissionRate) : 0;
    const commissionAmount = isSellerGroup ? Math.round((subtotal - discountAmount) * sellerCommissionRate * 100) / 100 : 0;

    groupTotals[key] = { subtotalBase, shippingFeeBase, totalBase, subtotal, shippingFee, discountAmount, total, commissionRate: sellerCommissionRate, commissionAmount };
  }

  const { amount: grandTotal } = convert(grandTotalBase, currency);

  let paymentStatus = 'pending';
  let paystackAuthorizationUrl;
  let paymentReference;
  const checkoutSessionId = `CHK-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  // Deliberately OUTSIDE the transaction below: a network call to a third
  // party. One single charge for the customer's entire cart (grandTotal),
  // regardless of how many seller Orders it gets split into afterward.
  if (paymentMethod === 'paystack') {
    paymentReference = `PSK-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const init = await paystackService.initializeTransaction({
      email: user.email,
      amountMajorUnits: grandTotal,
      currency,
      reference: paymentReference,
      metadata: { userId: userId.toString(), checkoutSessionId },
    });
    paystackAuthorizationUrl = init.authorization_url;
  }

  // --- Everything that must succeed or fail together, atomically ---------
  // Stock reservation across every seller group + creation of every
  // resulting Order + coupon redemption + cart-clearing all happen inside
  // one MongoDB transaction: either the entire checkout commits, or none of
  // it does — including across multiple sellers' orders at once.
  const session = await mongoose.startSession();
  let orders = [];

  try {
    await session.withTransaction(async () => {
      for (const key of groupKeys) {
        await reserveStock(groups.get(key), session);
      }

      try {
        for (const key of groupKeys) {
          const groupItems = groups.get(key);
          const totals = groupTotals[key];
          const created = await Order.create(
            [
              {
                user: userId,
                seller: key === 'platform' ? null : groupItems[0].sellerId,
                checkoutSessionId,
                idempotencyKey: idempotencyKey || undefined,
                items: groupItems.map((i) => ({
                  product: i.product,
                  name: i.name,
                  image: i.image,
                  size: i.size,
                  quantity: i.quantity,
                  price: convert(i.unitPriceBase, currency).amount,
                })),
                currency,
                subtotal: totals.subtotal,
                shippingFee: totals.shippingFee,
                couponCode: appliedCoupon?.code,
                discountAmount: totals.discountAmount,
                total: totals.total,
                totalBaseCurrency: totals.totalBase,
                commissionRate: totals.commissionRate,
                commissionAmount: totals.commissionAmount,
                shippingAddress,
                paymentMethod,
                paymentStatus,
                paymentReference,
                status: 'placed',
              },
            ],
            { session }
          );
          orders.push(created[0]);
        }
      } catch (err) {
        if (err.code === 11000 && idempotencyKey) {
          const dupErr = new Error('IDEMPOTENCY_DUPLICATE');
          dupErr.isIdempotencyDuplicate = true;
          throw dupErr;
        }
        throw err;
      }

      if (appliedCoupon) {
        // Redeemed once per checkout session, not once per resulting
        // order — a coupon is "used" by the customer's purchase, not by
        // however many seller-orders it happened to split into.
        await couponService.redeemCoupon(appliedCoupon._id, userId, orders[0]._id, session);
      }

      user.cartData = {};
      user.markModified('cartData');
      await user.save({ session });
    });
  } catch (err) {
    if (err.isIdempotencyDuplicate) {
      const winners = await Order.find({ user: userId, idempotencyKey });
      if (winners.length > 0) {
        return { orders: winners, paystackAuthorizationUrl: undefined, isReplay: true };
      }
    }
    throw err;
  } finally {
    await session.endSession();
  }

  log?.info(
    { userId, checkoutSessionId, orderCount: orders.length, grandTotal, currency, paymentMethod },
    'Order(s) placed (transaction committed)'
  );

  // Fire-and-forget, per resulting order — a mixed-seller cart means the
  // customer gets one confirmation email per seller's shipment, which
  // mirrors how Amazon/Jumia marketplace order confirmations actually work
  // (each seller's portion is tracked/communicated independently).
  for (const order of orders) {
    emailService.sendOrderConfirmationEmail(user, order).catch((err) => log?.error({ err }, 'sendOrderConfirmationEmail failed'));
    emailService.sendAdminNewOrderNotification(order).catch((err) => log?.error({ err }, 'sendAdminNewOrderNotification failed'));
    smsService.sendOrderConfirmationSms(user.phone, order).catch((err) => log?.error({ err }, 'sendOrderConfirmationSms failed'));
  }

  return { orders, paystackAuthorizationUrl };
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

// Seller-scoped mirror of getAllOrders — a seller only ever sees orders
// for their own products, enforced by the filter itself (not just hidden
// in a UI), same pattern as product ownership checks in product.service.js.
export const getSellerOrders = async (sellerId, { status, page = 1, limit = 20 }) => {
  const filter = { seller: sellerId };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Order.countDocuments(filter),
  ]);

  return { orders, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) } };
};

// Same update as updateOrderStatus, but a seller may only touch their own
// orders — checked here, not just at the route layer, so this stays safe
// even if a route is ever reused/misconfigured.
export const updateSellerOrderStatus = async (sellerId, orderId, payload, log) => {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (String(order.seller) !== String(sellerId)) {
    throw ApiError.forbidden('You can only update your own orders');
  }
  return updateOrderStatus(orderId, payload, log);
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
// A single Paystack payment reference can now correspond to MULTIPLE
// orders (a checkout that split across several sellers — see placeOrder).
// Marks every order sharing that reference as paid, not just one.
export const markOrderPaid = async (paymentReference, log) => {
  const orders = await Order.find({ paymentReference });
  if (orders.length === 0) {
    log?.warn({ paymentReference }, 'Paystack webhook: no matching order(s) found');
    return [];
  }

  const user = await User.findById(orders[0].user);

  for (const order of orders) {
    // Atomic compare-and-set: only the delivery that actually transitions
    // paymentStatus gets `updated` back non-null, so if Paystack (or a
    // retry-happy proxy) delivers this webhook twice concurrently, exactly
    // one of them sends the confirmation email — a plain
    // read-then-save would let both racing requests pass the check before
    // either write lands.
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, paymentStatus: { $ne: 'paid' } },
      {
        $set: {
          paymentStatus: 'paid',
          paidAt: new Date(),
          ...(order.status === 'placed' ? { status: 'confirmed' } : {}),
        },
      },
      { new: true }
    );
    if (!updated) continue; // already paid — idempotent, webhooks can be delivered more than once

    log?.info({ orderId: order._id.toString(), paymentReference }, 'Order marked paid via Paystack webhook');

    if (user) {
      emailService
        .sendPaymentConfirmationEmail(user, updated)
        .catch((err) => log?.error({ err }, 'sendPaymentConfirmationEmail failed'));
    }
  }

  return orders;
};

export const markOrderPaymentFailed = async (paymentReference, log) => {
  const orders = await Order.find({ paymentReference });
  if (orders.length === 0) return [];
  for (const order of orders) {
    order.paymentStatus = 'failed';
    await order.save();
  }
  log?.warn({ paymentReference, orderCount: orders.length }, 'Order(s) payment failed via Paystack webhook');
  return orders;
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

  // Marketplace-specific: this order's seller share may have already left
  // the platform's Paystack balance via a payout. Refunding the customer
  // here does NOT automatically claw that money back from the seller — per
  // MARKETPLACE_MIGRATION.md, that requires an explicit policy decision
  // (deduct from their next payout is standard), not a silent assumption.
  // Fail loudly rather than let the numbers quietly stop reconciling.
  if (order.payout) {
    throw ApiError.conflict(
      'This order has already been paid out to the seller. Refunding it now requires manually reconciling the seller\'s next payout — this is not done automatically. Contact the seller/finance before proceeding.'
    );
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
  getSellerOrders,
  updateOrderStatus,
  updateSellerOrderStatus,
  markOrderPaid,
  markOrderPaymentFailed,
  requestRefund,
  getRefundRequests,
  approveRefund,
  rejectRefund,
};
