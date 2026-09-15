import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';
import User from '../models/User.model.js';
import Seller from '../models/Seller.model.js';
import Product from '../models/Product.model.js';
import Order from '../models/Order.model.js';

export const getDashboardAnalytics = asyncHandler(async (req, res) => {
  const [customers, sellers, products, orders, revenueAgg, pendingSellers, refunds] = await Promise.all([
    User.countDocuments({ role: 'customer', deletedAt: null }),
    Seller.countDocuments({ deletedAt: null, status: 'approved' }),
    Product.countDocuments({ deletedAt: null }),
    Order.countDocuments({}),
    Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$totalBaseCurrency' }, commission: { $sum: '$commissionAmount' } } }]),
    Seller.countDocuments({ deletedAt: null, status: 'pending' }),
    Order.countDocuments({ 'refund.status': { $in: ['requested', 'approved'] } }),
  ]);
  return sendSuccess(res, { analytics: { customers, sellers, products, orders, revenue: revenueAgg[0]?.total || 0, commission: revenueAgg[0]?.commission || 0, pendingSellers, pendingRefunds: refunds } });
});
