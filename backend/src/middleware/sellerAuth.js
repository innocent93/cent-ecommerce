import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import Seller from '../models/Seller.model.js';
import { extractToken } from './auth.js';

// Mirrors staffAuth's pattern (adminAuth.js): verifies the JWT, then does a
// real database lookup rather than trusting the token's claims alone — so
// suspending a seller takes effect immediately on their next request, not
// after their token happens to expire. Attaches `req.seller = { id, status }`.
export const sellerAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw ApiError.unauthorized('Not authorized, please login again');
  }

  const decoded = jwt.verify(token, config.jwt.secret);
  if (!decoded?.id || decoded.role !== 'seller') {
    throw ApiError.unauthorized('Not authorized, please login again');
  }

  const seller = await Seller.findById(decoded.id);
  if (!seller) {
    throw ApiError.unauthorized('Not authorized, please login again');
  }
  if (seller.deletedAt) throw ApiError.forbidden('This seller account is archived. Contact support.');
  if (seller.ban?.isBanned && (!seller.ban.expiresAt || seller.ban.expiresAt > new Date())) throw ApiError.forbidden('Your seller account has been banned. Contact support.');
  if (seller.status === 'suspended') {
    throw ApiError.forbidden('Your seller account has been suspended. Contact support.');
  }

  req.seller = { id: seller._id.toString(), status: seller.status };
  next();
});

// Stricter gate for actions that require full approval (listing products,
// for example) — a pending seller can log in and check their status, but
// can't act like an approved one yet.
export const requireApprovedSeller = asyncHandler(async (req, res, next) => {
  await new Promise((resolve, reject) => {
    sellerAuth(req, res, (err) => (err ? reject(err) : resolve()));
  });
  if (req.seller.status !== 'approved') {
    throw ApiError.forbidden(
      req.seller.status === 'pending'
        ? 'Your seller account is pending admin approval'
        : 'Your seller account is not in good standing'
    );
  }
  next();
});

export default sellerAuth;
