import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import { OAuth2Client } from 'google-auth-library';
import Seller from '../models/Seller.model.js';
import config from '../config/env.js';
import logger from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { assertStrongPassword } from './user.service.js';
import { decideGoogleAuthOutcome, resolveSellerRegistrationFields } from '../utils/sellerGoogleAuth.js';
import {
  signSellerToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeAllUserSessions,
} from './token.service.js';
import * as paystackService from './paystack.service.js';
import { cloudinary } from '../db/cloudinary.js';


const uploadCertificate = (file) => new Promise((resolve, reject) => {
  if (!file) return resolve(null);
  const stream = cloudinary.uploader.upload_stream({ folder: 'urbanstep/seller-certificates', resource_type: 'auto' }, (error, result) => {
    if (error) return reject(error);
    resolve({ url: result.secure_url, publicId: result.public_id });
  });
  stream.end(file.buffer);
});

const hashPassword = async (password) => bcrypt.hash(password, await bcrypt.genSalt(12));

const isLocked = (seller) => Boolean(seller.lockUntil && seller.lockUntil > new Date());

// Same verification approach as user.service.js#googleLogin — one shared
// GOOGLE_CLIENT_ID, one client instance, reused here for sellers so both
// auth surfaces stay consistent and only the audience check ever needs
// touching if Google's requirements change.
let googleClient;
const getGoogleClient = () => {
  if (!config.googleClientId) {
    throw ApiError.badRequest('Google Sign-In is not configured on this store yet');
  }
  if (!googleClient) googleClient = new OAuth2Client(config.googleClientId);
  return googleClient;
};

const verifyGoogleIdToken = async (idToken) => {
  const client = getGoogleClient();
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: config.googleClientId });
    payload = ticket.getPayload();
  } catch (err) {
    logger.warn({ err: err.message }, 'Google ID token verification failed (seller)');
    throw ApiError.unauthorized('Invalid Google sign-in — please try again');
  }
  if (!payload?.email || payload.email_verified === false) {
    throw ApiError.unauthorized('Your Google account email could not be verified');
  }
  return payload;
};

// --- Seller auth (own login, separate from customers/staff) --------------

export const register = async ({ businessName, ownerName, email, password, phone, googleIdToken }, certificateFile = null) => {
  let googlePayload;
  if (googleIdToken) {
    // Google has already verified this email cryptographically — trust it
    // over anything the client typed (see resolveSellerRegistrationFields,
    // and its tests, for exactly why the precedence matters here).
    googlePayload = await verifyGoogleIdToken(googleIdToken);
  } else {
    if (!validator.isEmail(String(email || '').toLowerCase())) throw ApiError.badRequest('Please enter a valid email');
    assertStrongPassword(password);
  }

  const resolved = resolveSellerRegistrationFields({ businessName, ownerName, email, phone, googlePayload });

  const exists = await Seller.findOne({ email: resolved.email });
  if (exists) throw ApiError.conflict('A seller account with this email already exists');

  const certificate = await uploadCertificate(certificateFile);

  const seller = await Seller.create({
    businessName: resolved.businessName,
    ownerName: resolved.ownerName,
    email: resolved.email,
    phone: resolved.phone,
    ...(resolved.authFields || { password: await hashPassword(password) }),
    status: 'pending',
    passwordChangedAt: new Date(),
    ...(certificate ? { businessCertificate: { ...certificate, originalName: certificateFile.originalname, mimeType: certificateFile.mimetype, uploadedAt: new Date() } } : {}),
  });

  logger.info({ sellerId: seller._id.toString() }, 'New seller registered, pending approval');
  return seller;
};

export const login = async ({ email, password }, meta) => {
  const seller = await Seller.findOne({ email: email.toLowerCase() }).select('+password');
  const genericError = () => ApiError.unauthorized('Invalid email or password');

  if (!seller) {
    await bcrypt.compare(password, '$2a$12$invalidsaltinvalidsaltinvalidsaltinvalidsalt');
    throw genericError();
  }
  if (seller.deletedAt) throw ApiError.forbidden('This seller account is archived. Contact support.');
  if (seller.ban?.isBanned && (!seller.ban.expiresAt || seller.ban.expiresAt > new Date())) throw ApiError.forbidden(`Your seller account is banned${seller.ban.reason ? `: ${seller.ban.reason}` : ''}`);
  if (seller.status === 'suspended') {
    throw ApiError.forbidden('Your seller account has been suspended. Contact support.');
  }
  if (isLocked(seller)) {
    const minutesLeft = Math.ceil((seller.lockUntil - Date.now()) / 60000);
    throw ApiError.tooManyRequests(`Too many failed attempts. Try again in ${minutesLeft} minute(s).`);
  }

  const isMatch = await bcrypt.compare(password, seller.password);
  if (!isMatch) {
    seller.failedLoginAttempts = (seller.failedLoginAttempts || 0) + 1;
    if (seller.failedLoginAttempts >= config.maxLoginAttempts) {
      seller.lockUntil = new Date(Date.now() + config.accountLockMinutes * 60 * 1000);
      seller.failedLoginAttempts = 0;
    }
    await seller.save();
    throw genericError();
  }

  seller.failedLoginAttempts = 0;
  seller.lockUntil = undefined;
  await seller.save();

  const accessToken = signSellerToken(seller._id);
  const { rawToken: refreshToken } = await issueRefreshToken(seller._id, meta);
  return { seller, accessToken, refreshToken };
};

// "Continue with Google" for an EXISTING seller, or account-linking for a
// seller who registered with a password and is now trying Google with the
// same email. Deliberately does NOT auto-create a brand-new seller here —
// unlike a customer account, a seller needs a businessName before it can
// exist at all, so a first-time Google user is sent back to the frontend
// with isNewSeller so it can collect that on the registration form (see
// register() above, which accepts the same googleIdToken to finish the job).
export const googleLogin = async (idToken, meta) => {
  if (!idToken) throw ApiError.badRequest('Google idToken is required');
  const payload = await verifyGoogleIdToken(idToken);
  const normalizedEmail = payload.email.toLowerCase();

  const [sellerByGoogleId, sellerByEmail] = await Promise.all([
    Seller.findOne({ googleId: payload.sub }),
    Seller.findOne({ email: normalizedEmail }),
  ]);

  const outcome = decideGoogleAuthOutcome({ sellerByGoogleId, sellerByEmail });

  if (outcome.action === 'new') {
    return {
      isNewSeller: true,
      prefill: { name: payload.name || '', email: normalizedEmail },
    };
  }

  const seller = outcome.seller;

  if (outcome.action === 'link_and_login') {
    // Safe to link: Google has already cryptographically verified this
    // person owns this email address.
    seller.googleId = payload.sub;
    if (!seller.isEmailVerified) seller.isEmailVerified = true;
    await seller.save();
  }

  if (seller.deletedAt) throw ApiError.forbidden('This seller account is archived. Contact support.');
  if (seller.ban?.isBanned && (!seller.ban.expiresAt || seller.ban.expiresAt > new Date())) throw ApiError.forbidden(`Your seller account is banned${seller.ban.reason ? `: ${seller.ban.reason}` : ''}`);
  if (seller.status === 'suspended') {
    throw ApiError.forbidden('Your seller account has been suspended. Contact support.');
  }

  const accessToken = signSellerToken(seller._id);
  const { rawToken: refreshToken } = await issueRefreshToken(seller._id, meta);
  return { seller, accessToken, refreshToken, isNewSeller: false };
};

export const refreshSession = async (rawRefreshToken, meta) => {
  if (!rawRefreshToken) throw ApiError.unauthorized('No refresh token provided');
  const result = await rotateRefreshToken(rawRefreshToken, meta);
  if (!result.ok) throw ApiError.unauthorized('Session expired, please login again');

  const seller = await Seller.findById(result.userId);
  if (!seller || seller.status === 'suspended') throw ApiError.unauthorized('Session expired, please login again');

  const accessToken = signSellerToken(seller._id);
  return { accessToken, refreshToken: result.rawToken };
};

export const getProfile = async (sellerId) => {
  const seller = await Seller.findById(sellerId);
  if (!seller) throw ApiError.notFound('Seller not found');
  return seller;
};

export const updateBankDetails = async (sellerId, { accountNumber, bankCode, accountName }) => {
  const seller = await Seller.findById(sellerId);
  if (!seller) throw ApiError.notFound('Seller not found');

  // Registers (or re-registers, if details changed) with Paystack so a
  // future payout has a recipient_code to send money to. This is a real
  // external call, deliberately not silently swallowed on failure — a
  // seller should know immediately if their bank details didn't validate.
  const recipient = await paystackService.createTransferRecipient({ accountNumber, bankCode, accountName });

  seller.bankDetails = { accountNumber, bankCode, accountName };
  seller.paystackRecipientCode = recipient.recipient_code;
  await seller.save();
  return seller;
};

// --- Admin management (PERMISSIONS.SELLER_MANAGE) -------------------------

export const listSellers = ({ status, includeDeleted = 'false' } = {}) => {
  const filter = includeDeleted === 'true' ? {} : { deletedAt: null };
  if (status) filter.status = status;
  return Seller.find(filter).sort({ createdAt: -1 });
};

export const setSellerStatus = async (sellerId, status, log) => {
  if (!['pending', 'approved', 'suspended'].includes(status)) throw ApiError.badRequest('Invalid status');
  const existing = await Seller.findById(sellerId);
  if (!existing) throw ApiError.notFound('Seller not found');
  if (status === 'approved' && !existing.businessCertificate?.url) throw ApiError.badRequest('Seller must upload a business certificate before approval');
  const seller = await Seller.findByIdAndUpdate(sellerId, { status }, { new: true });

  if (status === 'suspended') {
    // Kill their active sessions immediately, same pattern as staff
    // deactivation — don't wait for their token to expire on its own.
    await revokeAllUserSessions(sellerId);
  }

  log?.info({ sellerId: seller._id.toString(), status }, 'Seller status updated');
  return seller;
};


export const uploadBusinessCertificate = async (sellerId, file) => {
  if (!file) throw ApiError.badRequest('Certificate file is required');
  const certificate = await uploadCertificate(file);
  const seller = await Seller.findByIdAndUpdate(sellerId, { businessCertificate: { ...certificate, originalName: file.originalname, mimeType: file.mimetype, uploadedAt: new Date() } }, { new: true });
  if (!seller) throw ApiError.notFound('Seller not found');
  return seller;
};

export const softDeleteSeller = async (sellerId, adminId) => {
  const seller = await Seller.findById(sellerId); if (!seller) throw ApiError.notFound('Seller not found');
  seller.deletedAt = new Date(); seller.deletedBy = adminId; seller.status = 'suspended'; await seller.save(); await revokeAllUserSessions(sellerId); return seller;
};
export const restoreSeller = async (sellerId) => {
  const seller = await Seller.findById(sellerId); if (!seller) throw ApiError.notFound('Seller not found');
  seller.deletedAt = null; seller.deletedBy = null; seller.status = 'pending'; await seller.save(); return seller;
};
export const setSellerBan = async (sellerId, { banned, reason, expiresAt }, adminId) => {
  const seller = await Seller.findById(sellerId); if (!seller) throw ApiError.notFound('Seller not found');
  seller.ban = { isBanned: Boolean(banned), reason: banned ? reason : undefined, expiresAt: banned && expiresAt ? new Date(expiresAt) : null, bannedAt: banned ? new Date() : null, bannedBy: banned ? adminId : null };
  if (banned) { seller.status = 'suspended'; await revokeAllUserSessions(sellerId); }
  await seller.save(); return seller;
};

export default {
  register,
  login,
  googleLogin,
  refreshSession,
  getProfile,
  updateBankDetails,
  listSellers,
  setSellerStatus,
  uploadBusinessCertificate, softDeleteSeller, restoreSeller, setSellerBan,
};
