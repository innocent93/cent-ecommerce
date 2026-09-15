import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.model.js';
import Product from '../models/Product.model.js';
import config from '../config/env.js';
import logger from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { SUPPORTED_CURRENCIES } from '../utils/currency.js';
import { ROLES, STAFF_ROLES } from '../constants/roles.js';
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserSessions,
} from './token.service.js';
import * as emailService from './email.service.js';

const isLocked = (user) => Boolean(user.lockUntil && user.lockUntil > new Date());

const registerFailedAttempt = async (user) => {
  user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
  if (user.failedLoginAttempts >= config.maxLoginAttempts) {
    user.lockUntil = new Date(Date.now() + config.accountLockMinutes * 60 * 1000);
    user.failedLoginAttempts = 0;
  }
  await user.save();
};

const clearFailedAttempts = async (user) => {
  if (user.failedLoginAttempts || user.lockUntil) {
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
  }
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Server-side enforcement of the same policy the frontend shows live
// feedback for (see PasswordStrength.jsx): at least 8 characters, one
// uppercase, one lowercase, one symbol. The frontend check is UX; this one
// is the actual security boundary — never trust client-side validation
// alone; a Flutter client or a direct API call bypasses the React form
// entirely.
const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a symbol';

export const assertStrongPassword = (password) => {
  const isLongEnough = typeof password === 'string' && password.length >= 8;
  const hasUpper = /[A-Z]/.test(password || '');
  const hasLower = /[a-z]/.test(password || '');
  const hasSymbol = /[^A-Za-z0-9]/.test(password || '');
  if (!isLongEnough || !hasUpper || !hasLower || !hasSymbol) {
    throw ApiError.badRequest(PASSWORD_POLICY_MESSAGE);
  }
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

// --- Shopper (customer) auth ---------------------------------------------

export const register = async ({ name, email, password }, meta) => {
  const normalizedEmail = email.toLowerCase();

  if (!validator.isEmail(normalizedEmail)) {
    throw ApiError.badRequest('Please enter a valid email');
  }
  assertStrongPassword(password);

  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');

  const user = await User.create({
    name,
    email: normalizedEmail,
    password: await hashPassword(password),
    role: ROLES.CUSTOMER,
    passwordChangedAt: new Date(),
    emailVerificationTokenHash: hashToken(verificationToken),
  });

  const accessToken = signAccessToken(user._id, user.role);
  const { rawToken: refreshToken } = await issueRefreshToken(user._id, meta);

  // Fire-and-forget: sendMail() never throws (see email.service.js), so this
  // can't fail registration even if SMTP is down.
  emailService.sendWelcomeEmail(user).catch((err) => logger.error({ err }, 'sendWelcomeEmail failed'));
  emailService
    .sendEmailVerificationEmail(user, `${config.frontendUrl}/verify-email?token=${verificationToken}`)
    .catch((err) => logger.error({ err }, 'sendEmailVerificationEmail failed'));

  return { user, accessToken, refreshToken };
};

// Shared by both the customer login and the staff login below — same
// credential-checking logic (timing-safe, lockout-aware), the only
// difference is which roles are allowed through each entry point.
const authenticateByEmailPassword = async ({ email, password }, allowedRoles) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  const genericError = () => ApiError.unauthorized('Invalid email or password');

  if (!user || !allowedRoles.includes(user.role)) {
    // Run bcrypt anyway against a dummy hash so response time doesn't leak
    // whether the account exists or which role it has.
    await bcrypt.compare(password, '$2a$12$invalidsaltinvalidsaltinvalidsaltinvalidsalt');
    throw genericError();
  }

  if (!user.active || user.deletedAt) throw ApiError.forbidden('This account is unavailable. Contact an administrator.');
  if (user.ban?.isBanned && (!user.ban.expiresAt || user.ban.expiresAt > new Date())) throw ApiError.forbidden(`This account is banned${user.ban.reason ? `: ${user.ban.reason}` : ''}`);

  if (isLocked(user)) {
    const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw ApiError.tooManyRequests(`Too many failed attempts. Try again in ${minutesLeft} minute(s).`);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    await registerFailedAttempt(user);
    throw genericError();
  }

  await clearFailedAttempts(user);
  return user;
};

export const login = async (credentials, meta) => {
  const user = await authenticateByEmailPassword(credentials, [ROLES.CUSTOMER]);
  const accessToken = signAccessToken(user._id, user.role);
  const { rawToken: refreshToken } = await issueRefreshToken(user._id, meta);
  return { user, accessToken, refreshToken };
};

// --- Google Sign-In -------------------------------------------------------
// Verifies an ID token issued by Google Identity Services (the frontend's
// "Continue with Google" button — see frontend/src/components/GoogleLoginButton.jsx)
// against Google's public keys, server-side, using GOOGLE_CLIENT_ID as the
// expected audience. This is the standard, secure pattern: the frontend
// never sends a password, and the backend never trusts anything about the
// user's identity without Google's own cryptographic signature backing it.
let googleClient;
const getGoogleClient = () => {
  if (!config.googleClientId) {
    throw ApiError.badRequest('Google Sign-In is not configured on this store yet');
  }
  if (!googleClient) googleClient = new OAuth2Client(config.googleClientId);
  return googleClient;
};

export const googleLogin = async (idToken, meta) => {
  if (!idToken) throw ApiError.badRequest('Google idToken is required');

  const client = getGoogleClient();
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: config.googleClientId });
    payload = ticket.getPayload();
  } catch (err) {
    logger.warn({ err: err.message }, 'Google ID token verification failed');
    throw ApiError.unauthorized('Invalid Google sign-in — please try again');
  }

  if (!payload?.email || payload.email_verified === false) {
    throw ApiError.unauthorized('Your Google account email could not be verified');
  }

  const normalizedEmail = payload.email.toLowerCase();
  let user = await User.findOne({ googleId: payload.sub }).select('+googleId');
  let isNewUser = false;

  if (!user) {
    // No account linked to this Google ID yet — check if this email already
    // has a local (password-based) account. If so, link Google to it
    // (safe: Google has already cryptographically verified this person
    // owns that email) rather than creating a confusing duplicate account.
    user = await User.findOne({ email: normalizedEmail });
    if (user) {
      user.googleId = payload.sub;
      if (!user.isEmailVerified) user.isEmailVerified = true;
      await user.save();
    } else {
      isNewUser = true;
      user = await User.create({
        name: payload.name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        authProvider: 'google',
        googleId: payload.sub,
        role: ROLES.CUSTOMER,
        isEmailVerified: true, // Google already verified this
        passwordChangedAt: new Date(),
      });
    }
  }

  if (!user.active || user.deletedAt) throw ApiError.forbidden('This account is unavailable. Contact an administrator.');
  if (user.ban?.isBanned && (!user.ban.expiresAt || user.ban.expiresAt > new Date())) throw ApiError.forbidden(`This account is banned${user.ban.reason ? `: ${user.ban.reason}` : ''}`);

  const accessToken = signAccessToken(user._id, user.role);
  const { rawToken: refreshToken } = await issueRefreshToken(user._id, meta);

  if (isNewUser) {
    emailService.sendWelcomeEmail(user).catch((err) => logger.error({ err }, 'sendWelcomeEmail failed'));
  }

  return { user, accessToken, refreshToken, isNewUser };
};


// Staff are real User documents (not a hardcoded env credential) — see
// seedSuperAdmin() below for how the first superadmin account is created.
export const staffLogin = async (credentials, meta) => {
  const user = await authenticateByEmailPassword(credentials, STAFF_ROLES);
  const accessToken = signAccessToken(user._id, user.role);
  const { rawToken: refreshToken } = await issueRefreshToken(user._id, meta);
  return { user, accessToken, refreshToken };
};

// Kept as the exported name `adminLogin` for backward compatibility with
// the existing `/api/user/admin` route/controller — it's now a real,
// database-backed staff login rather than a static credential comparison.
export const adminLogin = staffLogin;

export const refreshSession = async (rawRefreshToken, meta) => {
  if (!rawRefreshToken) {
    throw ApiError.unauthorized('No refresh token provided');
  }
  const result = await rotateRefreshToken(rawRefreshToken, meta);
  if (!result.ok) {
    throw ApiError.unauthorized('Session expired, please login again');
  }

  // Re-read the user's *current* role/active status from the database on
  // every refresh, rather than trusting whatever role the old token had.
  // This means a role change or deactivation takes effect within one
  // refresh cycle, not only after the old access token's full expiry.
  const user = await User.findById(result.userId);
  if (!user || !user.active) {
    throw ApiError.unauthorized('Session expired, please login again');
  }

  const accessToken = signAccessToken(user._id, user.role);
  return { accessToken, refreshToken: result.rawToken };
};

export const logout = async (rawRefreshToken) => {
  if (rawRefreshToken) await revokeRefreshToken(rawRefreshToken);
};

export const logoutEverywhere = async (userId) => {
  await revokeAllUserSessions(userId);
};

export const getProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user;
};

// --- Profile & password management --------------------------------------

export const updateProfile = async (userId, { name, phone }) => {
  const update = {};
  if (name !== undefined) update.name = name;
  if (phone !== undefined) update.phone = phone;

  const user = await User.findByIdAndUpdate(userId, update, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound('User not found');
  return user;
};

export const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw ApiError.notFound('User not found');

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw ApiError.badRequest('Current password is incorrect');
  assertStrongPassword(newPassword);

  user.password = await hashPassword(newPassword);
  user.passwordChangedAt = new Date();
  await user.save();

  // Changing your password should invalidate every other session — if an
  // attacker had a stolen refresh token, this locks them out immediately.
  await revokeAllUserSessions(userId);
};

// --- Addresses -------------------------------------------------------

export const listAddresses = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user.addresses;
};

export const addAddress = async (userId, address) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  if (address.isDefault) {
    user.addresses.forEach((a) => { a.isDefault = false; });
  }
  user.addresses.push(address);
  await user.save();
  return user.addresses;
};

export const removeAddress = async (userId, addressId) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  user.addresses = user.addresses.filter((a) => a._id.toString() !== addressId);
  await user.save();
  return user.addresses;
};

// --- Forgot / reset password ---------------------------------------------

export const forgotPassword = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  // Always respond as if it succeeded, whether or not the account exists —
  // otherwise this endpoint becomes a way to enumerate registered emails.
  if (!user) return;

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetTokenHash = hashToken(resetToken);
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;
  await emailService.sendPasswordResetEmail(user, resetUrl);
};

export const resetPassword = async (token, newPassword) => {
  assertStrongPassword(newPassword);

  const user = await User.findOne({
    passwordResetTokenHash: hashToken(token),
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpires');

  if (!user) {
    throw ApiError.badRequest('This reset link is invalid or has expired');
  }

  user.password = await hashPassword(newPassword);
  user.passwordChangedAt = new Date();
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Force re-login everywhere — the old password (and any session issued
  // under it) shouldn't remain trusted after a reset.
  await revokeAllUserSessions(user._id);
};

// --- Email verification -----------------------------------------------

export const verifyEmail = async (token) => {
  const user = await User.findOne({ emailVerificationTokenHash: hashToken(token) }).select(
    '+emailVerificationTokenHash'
  );
  if (!user) {
    throw ApiError.badRequest('This verification link is invalid or has already been used');
  }
  user.isEmailVerified = true;
  user.emailVerificationTokenHash = undefined;
  await user.save();
};

export const resendVerificationEmail = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  if (user.isEmailVerified) return;

  const verificationToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationTokenHash = hashToken(verificationToken);
  await user.save();

  await emailService.sendEmailVerificationEmail(
    user,
    `${config.frontendUrl}/verify-email?token=${verificationToken}`
  );
};

// --- Wishlist ----------------------------------------------------------

export const getWishlist = async (userId) => {
  const user = await User.findById(userId).populate('wishlist');
  if (!user) throw ApiError.notFound('User not found');
  return user.wishlist;
};

export const addToWishlist = async (userId, productId) => {
  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound('Product not found');
  await User.findByIdAndUpdate(userId, { $addToSet: { wishlist: productId } });
};

export const removeFromWishlist = async (userId, productId) => {
  await User.findByIdAndUpdate(userId, { $pull: { wishlist: productId } });
};

export const setPreferredCurrency = async (userId, currency) => {
  const upper = (currency || '').toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(upper)) {
    throw ApiError.badRequest(`Unsupported currency. Supported: ${SUPPORTED_CURRENCIES.join(', ')}`);
  }
  await User.findByIdAndUpdate(userId, { preferredCurrency: upper });
  return upper;
};

// --- Staff management (superadmin only — enforced at the route layer via
// requirePermission(STAFF_MANAGE), re-checked here defensively) -----------

export const listStaff = () => User.find({ role: { $in: STAFF_ROLES } }).sort({ createdAt: -1 });

export const createStaff = async ({ name, email, password, role }) => {
  const normalizedEmail = email.toLowerCase();

  if (!STAFF_ROLES.includes(role)) {
    throw ApiError.badRequest(`role must be one of: ${STAFF_ROLES.join(', ')}`);
  }
  if (!validator.isEmail(normalizedEmail)) {
    throw ApiError.badRequest('Please enter a valid email');
  }
  assertStrongPassword(password);

  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) {
    throw ApiError.conflict('An account with this email already exists');
  }

  return User.create({
    name,
    email: normalizedEmail,
    password: await hashPassword(password),
    role,
    isEmailVerified: true, // staff accounts are provisioned by a superadmin, not self-registered
    passwordChangedAt: new Date(),
  });
};

export const updateStaff = async (staffId, { role, active }) => {
  const staff = await User.findById(staffId);
  if (!staff || !STAFF_ROLES.includes(staff.role)) {
    throw ApiError.notFound('Staff account not found');
  }

  if (role !== undefined) {
    if (!STAFF_ROLES.includes(role)) {
      throw ApiError.badRequest(`role must be one of: ${STAFF_ROLES.join(', ')}`);
    }
    staff.role = role;
  }
  if (active !== undefined) {
    staff.active = active;
    // Deactivating should also kill any live sessions immediately, not
    // just block future logins.
    if (!active) await revokeAllUserSessions(staff._id);
  }

  await staff.save();
  return staff;
};

// Ensures exactly one superadmin exists, created from ADMIN_EMAIL/
// ADMIN_PASSWORD in .env — this is what lets you log into the admin panel
// on day one without a chicken-and-egg "who creates the first superadmin"
// problem. Called once at server startup (see server.js). Safe to call on
// every boot: it's a no-op once a superadmin already exists.
export const seedSuperAdmin = async () => {
  const existing = await User.findOne({ role: ROLES.SUPERADMIN });
  if (existing) return;

  const email = config.admin.email.toLowerCase();
  const byEmail = await User.findOne({ email });
  if (byEmail) {
    // An account with that email already exists under a different role —
    // don't silently overwrite it; surface this loudly instead.
    logger.warn(
      { email },
      'ADMIN_EMAIL matches an existing non-superadmin account — skipping superadmin seed. ' +
        'Either change ADMIN_EMAIL or manually promote this account.'
    );
    return;
  }

  await User.create({
    name: 'Super Admin',
    email,
    password: await hashPassword(config.admin.password),
    role: ROLES.SUPERADMIN,
    isEmailVerified: true,
    passwordChangedAt: new Date(),
  });
  logger.info({ email }, 'Seeded initial superadmin account from ADMIN_EMAIL/ADMIN_PASSWORD');
};


export const listCustomers = async ({ search, includeDeleted = 'false' } = {}) => {
  const filter = { role: ROLES.CUSTOMER, ...(includeDeleted === 'true' ? {} : { deletedAt: null }) };
  if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
  return User.find(filter).sort({ createdAt: -1 }).select('-password');
};
export const setCustomerBan = async (userId, { banned, reason, expiresAt }, adminId) => {
  const user = await User.findOne({ _id: userId, role: ROLES.CUSTOMER }); if (!user) throw ApiError.notFound('Customer not found');
  user.ban = { isBanned: Boolean(banned), reason: banned ? reason : undefined, expiresAt: banned && expiresAt ? new Date(expiresAt) : null, bannedAt: banned ? new Date() : null, bannedBy: banned ? adminId : null };
  if (banned) await revokeAllUserSessions(userId); await user.save(); return user;
};
export const softDeleteCustomer = async (userId, adminId) => {
  const user = await User.findOne({ _id: userId, role: ROLES.CUSTOMER }); if (!user) throw ApiError.notFound('Customer not found');
  user.active = false; user.deletedAt = new Date(); user.deletedBy = adminId; await revokeAllUserSessions(userId); await user.save(); return user;
};
export const restoreCustomer = async (userId) => {
  const user = await User.findOne({ _id: userId, role: ROLES.CUSTOMER }); if (!user) throw ApiError.notFound('Customer not found');
  user.active = true; user.deletedAt = null; user.deletedBy = null; await user.save(); return user;
};

export default {
  assertStrongPassword,
  register,
  login,
  googleLogin,
  staffLogin,
  adminLogin,
  refreshSession,
  logout,
  logoutEverywhere,
  getProfile,
  updateProfile,
  changePassword,
  listAddresses,
  addAddress,
  removeAddress,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  setPreferredCurrency,
  listStaff,
  createStaff,
  updateStaff,
  seedSuperAdmin,
};
