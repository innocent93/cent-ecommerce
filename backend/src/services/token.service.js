import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import ms from '../utils/ms.js';
import config from '../config/env.js';
import RefreshToken from '../models/RefreshToken.model.js';
import { STAFF_ROLES } from '../constants/roles.js';

// --- Access tokens: short-lived, stateless JWTs -----------------------
// Kept short specifically because this app moves money — a leaked
// long-lived token used to be the biggest exposure. The refresh token
// below is what makes short access tokens practical without forcing the
// user to log in constantly.
//
// One signer for every role (customer/support/admin/superadmin) — the role
// actually carried on the User document is embedded directly, rather than
// hardcoding a fixed string. Staff roles get a shorter expiry than
// customers (config.jwt.staffExpiresIn vs accessExpiresIn) since a
// compromised staff token is more damaging than a compromised customer one.
export const signAccessToken = (userId, role) => {
  const expiresIn = STAFF_ROLES.includes(role) ? config.jwt.staffExpiresIn : config.jwt.accessExpiresIn;
  return jwt.sign({ id: userId, role }, config.jwt.secret, { expiresIn });
};

// Sellers are a separate collection from User (see Seller.model.js), but
// deliberately reuse this same signing function and the refresh-token
// machinery below (issueRefreshToken/rotateRefreshToken/revokeRefreshToken
// just operate on a generic ID — they don't care whether it belongs to a
// User or a Seller document) rather than duplicating the entire
// rotation-with-reuse-detection logic for a second model. `role: 'seller'`
// distinguishes seller tokens from customer/staff ones in every auth
// middleware check.
export const signSellerToken = (sellerId) =>
  jwt.sign({ id: sellerId, role: 'seller' }, config.jwt.secret, { expiresIn: config.jwt.staffExpiresIn });

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// --- Refresh tokens: opaque random strings, stored server-side (hashed) ---
// This is what enables real "log out" / "log out everywhere" / instant
// revocation on suspected compromise — a pure stateless JWT can't do any of
// that until it expires on its own.
export const issueRefreshToken = async (userId, { userAgent, ip } = {}) => {
  const rawToken = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + ms(config.jwt.refreshExpiresIn));

  await RefreshToken.create({
    user: userId,
    tokenHash: hashToken(rawToken),
    userAgent,
    ip,
    expiresAt,
  });

  return { rawToken, expiresAt };
};

// Verifies a presented refresh token, and rotates it (issues a new one,
// revokes the old one). Rotation means a stolen-then-replayed refresh token
// is detectable: if the old (already-rotated) token is presented again,
// every token in that chain is revoked (see `replacedByHash` reuse check).
export const rotateRefreshToken = async (rawToken, { userAgent, ip } = {}) => {
  const tokenHash = hashToken(rawToken);
  const existing = await RefreshToken.findOne({ tokenHash });

  if (!existing) {
    return { ok: false, reason: 'not_found' };
  }
  if (existing.revokedAt) {
    // Reuse of an already-rotated/revoked token — likely theft. Revoke the
    // whole session chain for this user as a precaution.
    await RefreshToken.updateMany(
      { user: existing.user, revokedAt: null },
      { revokedAt: new Date() }
    );
    return { ok: false, reason: 'reuse_detected' };
  }
  if (existing.expiresAt < new Date()) {
    return { ok: false, reason: 'expired' };
  }

  const { rawToken: newRawToken, expiresAt } = await issueRefreshToken(existing.user, { userAgent, ip });
  existing.revokedAt = new Date();
  existing.replacedByHash = hashToken(newRawToken);
  await existing.save();

  return { ok: true, userId: existing.user, rawToken: newRawToken, expiresAt };
};

export const revokeRefreshToken = async (rawToken) => {
  const tokenHash = hashToken(rawToken);
  await RefreshToken.updateOne({ tokenHash, revokedAt: null }, { revokedAt: new Date() });
};

export const revokeAllUserSessions = async (userId) => {
  await RefreshToken.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });
};

export const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'strict',
  domain: config.cookieDomain || undefined,
  path: '/api',
  maxAge: ms(config.jwt.refreshExpiresIn),
});

export default {
  signAccessToken,
  signSellerToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserSessions,
  refreshCookieOptions,
};
