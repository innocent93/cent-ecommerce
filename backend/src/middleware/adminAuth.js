import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/User.model.js';
import { STAFF_ROLES, roleHasPermission } from '../constants/roles.js';
import { extractToken } from './auth.js';

// NOTE on the original bug this replaced (from an earlier refactor pass):
// The very first version of this file signed the admin token with
// `jwt.sign(email + password, JWT_SECRET)` (a bare string, not a payload
// object) and compared the *decoded* token to `ADMIN_EMAIL + ADMIN_PASSWORD`
// — which `jwt.verify()` can never produce, so it could never work.
//
// This version goes further than a fix: rather than one hardcoded admin
// credential living outside the database, staff (support/admin/superadmin)
// are real User documents with a `role`, verified against the database on
// every request (see the DB lookup below). That's a deliberate trade-off —
// one extra query per staff request, in exchange for instant effect when a
// superadmin deactivates a compromised or offboarded staff account, rather
// than waiting out a token's expiry.
export const staffAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw ApiError.unauthorized('Not authorized, please login again');
  }

  const decoded = jwt.verify(token, config.jwt.secret);
  if (!decoded?.id || !STAFF_ROLES.includes(decoded.role)) {
    throw ApiError.forbidden('Not authorized as staff');
  }

  const staffUser = await User.findById(decoded.id);
  if (!staffUser || !staffUser.active || !STAFF_ROLES.includes(staffUser.role)) {
    throw ApiError.forbidden('Not authorized as staff');
  }

  req.admin = { id: staffUser._id.toString(), email: staffUser.email, role: staffUser.role };
  next();
});

// Wraps staffAuth with a specific permission check — use this on
// sensitive/role-specific routes (e.g. only an admin+ can manage products,
// only a superadmin can manage other staff). Routes that just need "any
// staff member" can use `staffAuth` (aliased below as `adminAuth` for
// backward compatibility with existing route files) directly.
export const requirePermission = (permission) =>
  asyncHandler(async (req, res, next) => {
    await new Promise((resolve, reject) => {
      staffAuth(req, res, (err) => (err ? reject(err) : resolve()));
    });
    if (!roleHasPermission(req.admin.role, permission)) {
      throw ApiError.forbidden(`Your role (${req.admin.role}) does not have permission to do this`);
    }
    next();
  });

// Backward-compatible name — existing route files import `adminAuth` as the
// "any staff member" gate. Kept as the default export too.
export const adminAuth = staffAuth;
export default adminAuth;
