import mongoose from 'mongoose';

// Audit trail for every payout run to a seller — exactly like PaymentEvent
// exists for customer-facing payment disputes, this exists so a seller
// dispute ("where's my money for order X") has a queryable answer, and so
// a refund against an already-paid-out order has something to reconcile
// against (see MARKETPLACE_MIGRATION.md's note on this being the most
// common real bug in marketplace payout systems).
const payoutSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
      index: true,
    },
    paystackTransferCode: { type: String },
    failureReason: { type: String },
    retryCount: { type: Number, default: 0 },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // the staff member who triggered it
    processedAt: { type: Date },
  },
  { timestamps: true }
);

const Payout = mongoose.models.Payout || mongoose.model('Payout', payoutSchema);

export default Payout;
