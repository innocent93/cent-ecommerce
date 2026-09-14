import mongoose from 'mongoose';

// Sellers are deliberately a separate collection from User, not another
// RBAC role — they need business-specific fields (bank details, business
// name, approval status) that don't belong on a customer/staff account,
// and keeping their auth entirely separate means a bug in customer/staff
// permission logic can never accidentally grant seller capabilities or
// vice versa. See MARKETPLACE_MIGRATION.md for the full reasoning.
const sellerSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true, trim: true, minlength: 2, maxlength: 150 },
    ownerName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      select: false,
      required: [
        function passwordRequiredUnlessGoogle() {
          return this.authProvider !== 'google';
        },
        'Password is required',
      ],
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    googleId: {
      type: String,
      select: false,
      unique: true,
      sparse: true, // allows many sellers with no googleId (local accounts)
    },
    isEmailVerified: { type: Boolean, default: false },
    phone: { type: String, trim: true },

    // A seller can't list products until an admin approves them (fraud/
    // quality control) — mirrors the existing refund-approval-queue pattern
    // already in this codebase (Order.refund.status).
    status: {
      type: String,
      enum: ['pending', 'approved', 'suspended'],
      default: 'pending',
      index: true,
    },

    // What this seller keeps per sale, overriding the platform default
    // (config.commissionRate) if set — lets you negotiate different rates
    // per seller instead of one global rate.
    commissionRateOverride: { type: Number, min: 0, max: 1 },

    // Bank details for Paystack Transfers (payouts). Populated once, when
    // the seller is approved and you register them as a Paystack transfer
    // recipient — see paystack.service.js#createTransferRecipient.
    bankDetails: {
      accountNumber: { type: String, trim: true },
      bankCode: { type: String, trim: true },
      accountName: { type: String, trim: true },
    },
    paystackRecipientCode: { type: String },

    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    passwordChangedAt: { type: Date },
  },
  { timestamps: true }
);

sellerSchema.virtual('isLocked').get(function isLocked() {
  return Boolean(this.lockUntil && this.lockUntil > Date.now());
});

sellerSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.googleId;
    delete ret.__v;
    return ret;
  },
});

const Seller = mongoose.models.Seller || mongoose.model('Seller', sellerSchema);

export default Seller;
