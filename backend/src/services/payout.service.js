import mongoose from 'mongoose';
import crypto from 'crypto';
import Payout from '../models/Payout.model.js';
import Order from '../models/Order.model.js';
import Seller from '../models/Seller.model.js';
import logger from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';
import * as paystackService from './paystack.service.js';

// Orders that count toward a seller's payable balance: paid, delivered
// (not still-returnable), and not already included in a previous payout.
// Deliberately requires `delivered`, not just `paid` — paying a seller
// before a customer has actually received the item (and could still
// request a refund) is how "already paid out, now can't refund cleanly"
// disputes happen; see the check in order.service.js#approveRefund.
const getEligibleOrdersFilter = (sellerId) => ({
  seller: sellerId,
  paymentStatus: 'paid',
  status: 'delivered',
  payout: null,
});

export const getSellerBalance = async (sellerId) => {
  // Aggregated server-side rather than Order.find(...).reduce() in JS —
  // this endpoint is hit on every seller dashboard/payouts page load, and
  // the previous version pulled every eligible order's FULL document
  // (shipping address, items, everything) into memory just to sum two
  // fields, then serialized all of it back over the wire even though
  // neither caller used anything but the sum and count. Scales badly for
  // any seller with a large order history; this doesn't.
  const [result] = await Order.aggregate([
    { $match: { ...getEligibleOrdersFilter(sellerId), seller: new mongoose.Types.ObjectId(sellerId) } },
    {
      $group: {
        _id: null,
        amount: { $sum: { $subtract: ['$subtotal', '$commissionAmount'] } },
        currency: { $first: '$currency' },
        orderCount: { $sum: 1 },
      },
    },
  ]);

  return {
    amount: Math.round((result?.amount || 0) * 100) / 100,
    currency: result?.currency,
    orderCount: result?.orderCount || 0,
  };
};

// Admin-triggered payout (manual review before automating, per
// MARKETPLACE_MIGRATION.md's recommended build order). Wrapped in a
// transaction for the same reason checkout is: selecting eligible orders,
// creating the Payout record, and marking those orders as paid-out must
// happen atomically, or two payout runs triggered concurrently (e.g. two
// admins, or a double-click) could both select the same orders and pay the
// seller twice for them.
export const createPayout = async (sellerId, initiatedByUserId, log) => {
  const seller = await Seller.findById(sellerId);
  if (!seller) throw ApiError.notFound('Seller not found');
  if (!seller.paystackRecipientCode) {
    throw ApiError.badRequest('This seller has not registered bank details yet');
  }

  const session = await mongoose.startSession();
  let payout;

  try {
    await session.withTransaction(async () => {
      const orders = await Order.find(getEligibleOrdersFilter(sellerId)).session(session);
      if (orders.length === 0) {
        throw ApiError.badRequest('This seller has no eligible orders to pay out right now');
      }

      const amount = Math.round(
        orders.reduce((sum, o) => sum + (o.subtotal - o.commissionAmount), 0) * 100
      ) / 100;
      const currency = orders[0].currency;

      const created = await Payout.create(
        [
          {
            seller: sellerId,
            orders: orders.map((o) => o._id),
            amount,
            currency,
            status: 'pending',
            initiatedBy: initiatedByUserId,
          },
        ],
        { session }
      );
      payout = created[0];

      await Order.updateMany(
        { _id: { $in: orders.map((o) => o._id) } },
        { payout: payout._id },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  // The actual money movement happens AFTER the transaction commits,
  // deliberately outside it — same reasoning as Paystack calls in
  // order.service.js#placeOrder: never hold a DB transaction open across an
  // external network call. If this fails, the Payout row stays 'pending'/
  // becomes 'failed' but the orders are already marked with this payout —
  // intentional: prevents a retry from double-selecting the same orders
  // into a second concurrent payout attempt. Retrying a failed payout
  // should re-use this same Payout record (see retryFailedPayout below),
  // not create a new one.
  try {
    const reference = `PAYOUT-${payout._id}-${crypto.randomBytes(3).toString('hex')}`;
    const transfer = await paystackService.initiateTransfer({
      amountMajorUnits: payout.amount,
      recipientCode: seller.paystackRecipientCode,
      reference,
      reason: `Payout for ${payout.orders.length} order(s)`,
    });

    payout.status = 'success';
    payout.paystackTransferCode = transfer.transfer_code;
    payout.processedAt = new Date();
    await payout.save();

    log?.info({ payoutId: payout._id.toString(), sellerId, amount: payout.amount }, 'Payout completed');
  } catch (err) {
    payout.status = 'failed';
    payout.failureReason = err.message;
    await payout.save();
    logger.error({ err, payoutId: payout._id.toString() }, 'Payout transfer failed');
    throw ApiError.internal(
      `Payout record created but the transfer failed (${err.message}). The affected orders are locked to this payout — use the retry action once the issue is resolved, don't create a new payout for them.`
    );
  }

  return payout;
};

export const listPayouts = ({ sellerId, status } = {}) => {
  const filter = {};
  if (sellerId) filter.seller = sellerId;
  if (status) filter.status = status;
  return Payout.find(filter).sort({ createdAt: -1 }).populate('seller', 'businessName email');
};

// Retries the Paystack transfer for a payout stuck in 'failed' (or 'pending'
// — a crash between transaction commit and the transfer call, before this
// existed, could leave one there). Deliberately reuses the SAME Payout
// record and its already-locked orders rather than calling createPayout
// again — createPayout would find zero eligible orders anyway (they're
// already tagged with this payout's id), which is exactly the point: it's
// structurally impossible to double-select these orders into a second
// payout, so retrying is always safe to re-run as many times as needed.
export const retryFailedPayout = async (payoutId, log) => {
  const payout = await Payout.findById(payoutId);
  if (!payout) throw ApiError.notFound('Payout not found');
  if (payout.status === 'success') {
    throw ApiError.conflict('This payout already succeeded — nothing to retry');
  }

  const seller = await Seller.findById(payout.seller);
  if (!seller?.paystackRecipientCode) {
    throw ApiError.badRequest("This seller's bank details are missing or were removed — add them before retrying");
  }

  // A fresh reference each attempt: Paystack treats reference as an
  // idempotency key on its side too, so reusing the failed attempt's
  // reference would just get the same failure echoed back rather than a
  // genuine new attempt.
  const reference = `PAYOUT-${payout._id}-RETRY-${payout.retryCount + 1}-${crypto.randomBytes(3).toString('hex')}`;

  try {
    const transfer = await paystackService.initiateTransfer({
      amountMajorUnits: payout.amount,
      recipientCode: seller.paystackRecipientCode,
      reference,
      reason: `Payout retry for ${payout.orders.length} order(s)`,
    });

    payout.status = 'success';
    payout.paystackTransferCode = transfer.transfer_code;
    payout.processedAt = new Date();
    payout.failureReason = undefined;
    payout.retryCount += 1;
    await payout.save();

    log?.info({ payoutId: payout._id.toString(), attempt: payout.retryCount }, 'Payout retry succeeded');
    return payout;
  } catch (err) {
    payout.status = 'failed';
    payout.failureReason = err.message;
    payout.retryCount += 1;
    await payout.save();
    logger.error({ err, payoutId: payout._id.toString(), attempt: payout.retryCount }, 'Payout retry failed');
    throw ApiError.internal(`Retry failed: ${err.message}. The payout stays 'failed' — safe to retry again once the issue is resolved.`);
  }
};

export default { getSellerBalance, createPayout, retryFailedPayout, listPayouts };
