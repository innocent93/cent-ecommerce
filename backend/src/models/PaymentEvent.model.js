import mongoose from 'mongoose';

// Immutable audit trail of every webhook event received from Paystack —
// independent of what order.service.js does with it. Exists specifically
// for dispute resolution ("Paystack says they sent this, did we receive
// it? What did we do with it?") and debugging webhook delivery issues,
// which a log line alone doesn't give you a queryable record of.
const paymentEventSchema = new mongoose.Schema(
  {
    provider: { type: String, default: 'paystack' },
    eventType: { type: String, required: true }, // e.g. "charge.success"
    reference: { type: String, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    signatureValid: { type: Boolean, required: true },
    rawPayload: { type: mongoose.Schema.Types.Mixed },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const PaymentEvent = mongoose.models.PaymentEvent || mongoose.model('PaymentEvent', paymentEventSchema);

export default PaymentEvent;
