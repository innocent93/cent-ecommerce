import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 }, // percentage: 0-100, fixed: amount in base currency
    minOrderAmount: { type: Number, default: 0, min: 0 }, // in base currency
    maxDiscountAmount: { type: Number }, // caps a percentage discount, optional
    usageLimit: { type: Number }, // total redemptions allowed across all users, unlimited if unset
    usageLimitPerUser: { type: Number, default: 1 },
    timesUsed: { type: Number, default: 0 },
    usedBy: {
      type: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
          usedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    startsAt: { type: Date },
    expiresAt: { type: Date },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

couponSchema.index({ code: 1 });

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);

export default Coupon;
