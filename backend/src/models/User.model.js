import mongoose from 'mongoose';
import { ROLES, roleHasPermission } from '../constants/roles.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      // Basic shape validation at the DB layer too, not just in request
      // validators — a defense-in-depth habit for a field this important
      // (it's the login identifier and where password resets go).
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
      index: true,
    },
    password: {
      type: String,
      // Not required for accounts created via Google Sign-In (see
      // authProvider below) — those authenticate with Google, never with a
      // local password, so there's nothing to hash and store.
      required: [
        function passwordRequiredUnlessGoogle() {
          return this.authProvider !== 'google';
        },
        'Password is required',
      ],
      select: false, // never return password hash unless explicitly requested
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // allows many documents with no googleId (local accounts)
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      // E.164-ish: optional leading +, 7-15 digits. Loose on purpose (real
      // phone validation belongs in a library like libphonenumber if you
      // need to be strict) — this just stops obviously garbage input.
      match: [/^\+?[0-9]{7,15}$/, 'Please provide a valid phone number'],
    },

    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.CUSTOMER,
      index: true,
    },
    // Soft-disable instead of deleting — for staff accounts (offboarding
    // without losing the audit trail of what they did) and, if ever needed,
    // for customers (fraud holds) without breaking every Order/Review
    // document's `user` reference.
    active: { type: Boolean, default: true },

    cartData: {
      type: Object,
      default: {},
    },
    wishlist: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Product',
      default: [],
    },
    addresses: {
      type: [
        {
          label: { type: String, trim: true, default: 'Home' },
          fullName: { type: String, trim: true },
          line1: { type: String, trim: true },
          line2: { type: String, trim: true },
          city: { type: String, trim: true },
          state: { type: String, trim: true },
          postalCode: { type: String, trim: true },
          country: { type: String, trim: true },
          phone: { type: String, trim: true },
          isDefault: { type: Boolean, default: false },
        },
      ],
      default: [],
    },

    // Lets returning customers see prices in their currency by default
    // without re-detecting it every visit. Falls back to the storefront's
    // auto-detected/selected currency when unset.
    preferredCurrency: { type: String, trim: true, uppercase: true },
    country: { type: String, trim: true }, // ISO 3166-1 alpha-2

    // --- Account security -------------------------------------------------
    // Brute-force protection: lock the account for a cooldown period after
    // too many wrong passwords, instead of allowing unlimited guesses
    // (rate limiting alone is IP-based and doesn't stop a distributed attack
    // against one specific account).
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },

    passwordChangedAt: { type: Date },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false },
  },
  { minimize: false, timestamps: true }
);

userSchema.virtual('isLocked').get(function isLocked() {
  return Boolean(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.hasPermission = function hasPermission(permission) {
  return roleHasPermission(this.role, permission);
};

// --- API/Flutter-facing shape --------------------------------------------
// Every client (the React storefront, the admin panel, and — the whole
// point of this — a Flutter app) should get the exact same, predictable
// user shape back, with no password hash or internal security fields ever
// leaking through, no matter which controller happens to call
// `res.json(user)` vs `user.toJSON()`. Overriding toJSON (not just relying
// on `select: false`, which only protects direct queries) means this holds
// even if a populate() or a lean() query pulls the document in unexpectedly.
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetExpires;
    delete ret.emailVerificationTokenHash;
    delete ret.googleId;
    delete ret.__v;
    return ret;
  },
});

// NOTE: the original schema registered the model as "user " (with a
// trailing space in the string passed to mongoose.model), which is a subtle
// bug — it still "worked" because Mongoose pluralizes/uses it internally,
// but it's fragile and breaks `mongoose.models.user` lookups elsewhere,
// causing duplicate model registration errors under hot-reload/tests.
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
