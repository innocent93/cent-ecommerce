import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true }, // snapshot at time of order
    image: { type: String },
    size: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }, // unit price in order currency, snapshot at purchase time
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true }, // ISO 3166-1 alpha-2, e.g. "NG", "GH", "US"
    phone: { type: String, required: true, trim: true },
  },
  { _id: false }
);

// Amazon/Jumia-style delivery lifecycle. Kept as a sub-array so the
// storefront/Flutter app can render a proper tracking timeline, not just a
// single current status.
const trackingEventSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        'placed',
        'confirmed',
        'processing',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'returned',
      ],
      required: true,
    },
    note: { type: String, trim: true },
    location: { type: String, trim: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, index: true }, // human-friendly, e.g. "ORD-20260723-0001"
    // Client-supplied idempotency key (one per checkout attempt — e.g. a UUID
    // generated when the "Place Order" button is first clicked). Prevents a
    // double-click, a client retry, or a flaky network causing two orders
    // (and two stock reservations) to be created from the same checkout.
    idempotencyKey: { type: String, index: true, sparse: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'An order must contain at least one item',
      },
    },

    // Prices are stored in whatever currency the customer checked out in,
    // alongside the base-currency equivalent for consistent internal
    // reporting/accounting regardless of which currency the storefront showed.
    currency: { type: String, required: true, default: 'NGN' },
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, default: 0, min: 0 },
    couponCode: { type: String, trim: true, uppercase: true },
    discountAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    totalBaseCurrency: { type: Number, required: true, min: 0 },

    // What the platform earns on this order (see BUSINESS_MODEL.md) —
    // computed at order time so revenue reporting doesn't drift if commission
    // rates change later.
    commissionRate: { type: Number, default: 0 }, // e.g. 0.1 = 10%
    commissionAmount: { type: Number, default: 0 },

    shippingAddress: { type: addressSchema, required: true },

    paymentMethod: {
      type: String,
      enum: ['cod', 'paystack'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentReference: { type: String, index: true }, // Paystack reference / Stripe payment_intent id
    paidAt: { type: Date },

    status: {
      type: String,
      enum: [
        'placed',
        'confirmed',
        'processing',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'returned',
      ],
      default: 'placed',
      index: true,
    },

    // Delivery/logistics — mirrors what a Jumia/Amazon tracking page shows.
    trackingNumber: { type: String, index: true },
    carrier: { type: String, trim: true }, // e.g. "GIG Logistics", "DHL", "Local Rider"
    estimatedDeliveryDate: { type: Date },
    deliveredAt: { type: Date },
    trackingEvents: { type: [trackingEventSchema], default: [] },

    // --- Refund workflow ---------------------------------------------------
    refund: {
      status: {
        type: String,
        enum: ['none', 'requested', 'approved', 'rejected', 'completed'],
        default: 'none',
      },
      reason: { type: String, trim: true, maxlength: 500 },
      requestedAt: { type: Date },
      processedAt: { type: Date },
      amount: { type: Number, min: 0 },
      adminNote: { type: String, trim: true, maxlength: 500 },
      paystackRefundId: { type: String },
    },
  },
  { timestamps: true }
);

orderSchema.index(
  { user: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

orderSchema.pre('save', async function assignOrderNumberAndTrackStatus(next) {
  if (this.isNew && !this.orderNumber) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.orderNumber = `ORD-${datePart}-${random}`;
  }
  if (this.isNew || this.isModified('status')) {
    this.trackingEvents.push({ status: this.status, at: new Date() });
    if (this.status === 'delivered' && !this.deliveredAt) this.deliveredAt = new Date();
  }
  next();
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

export default Order;
