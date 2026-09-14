import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ROLES } from '../constants/roles.js';

// Extracts a bearer token from either the standard `Authorization: Bearer <token>`
// header (what Flutter/mobile HTTP clients and most API tooling send by
// default) or the legacy custom `token` header the original frontend used.
// Both are supported so the existing React apps keep working unchanged
// while new clients (Flutter) can use the standard convention.
export const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (req.headers.token) {
    return req.headers.token;
  }
  return null;
};

// Authenticates a shopper (role: "customer"). On success attaches
// `req.user = { id }`. (Previously this mutated req.body.userId, which
// silently broke on GET requests / any body-less request and conflated
// auth state with payload.)
//
// NOTE on the role rename: tokens issued before this change carried
// `role: "user"`; this middleware now expects `role: "customer"`. Because
// access tokens are short-lived (15 minutes) and refresh automatically,
// this self-heals within one refresh cycle — no manual migration needed,
// just a brief window where very recently issued tokens need a re-login.
export const authUser = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw ApiError.unauthorized('Not authorized, please login again');
  }

  const decoded = jwt.verify(token, config.jwt.secret);
  if (!decoded?.id || decoded.role !== ROLES.CUSTOMER) {
    throw ApiError.unauthorized('Not authorized, please login again');
  }

  req.user = { id: decoded.id };
  next();
});

export default authUser;
