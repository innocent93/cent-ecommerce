import mongoose from 'mongoose';

// Refresh tokens are stored server-side (hashed) rather than trusting a
// long-lived JWT alone. This is what makes "logout" and "logout everywhere"
// actually work, and lets a compromised token be revoked immediately instead
// of waiting out its expiry — the biggest weakness of pure stateless JWTs
// for a system that moves money.
const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    userAgent: { type: String },
    ip: { type: String },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    replacedByHash: { type: String }, // set on rotation, for reuse-detection
  },
  { timestamps: true }
);

// Auto-purge expired tokens from the collection.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.models.RefreshToken || mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshToken;
