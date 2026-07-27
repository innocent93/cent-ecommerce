import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    sku: { type: String, unique: true, sparse: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },

    // All prices are stored in a single base currency (see config.baseCurrency,
    // default USD) and converted on the fly for display — see src/utils/currency.js.
    // This avoids having to re-price every product whenever exchange rates move.
    price: { type: Number, required: true, min: 0 },

    image: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one product image is required',
      },
    },

    category: { type: String, required: true, trim: true, index: true }, // e.g. "Clothing", "Footwear"
    subCategory: { type: String, required: true, trim: true }, // e.g. "Sneakers", "Boots", "T-Shirts"

    // Shoe / apparel attributes. Optional so existing clothing products are
    // unaffected; populate them when the category is footwear.
    brand: { type: String, trim: true },
    color: { type: String, trim: true },
    gender: { type: String, enum: ['men', 'women', 'unisex', 'kids'], default: 'unisex' },

    sizes: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one size is required',
      },
    },

    // Per-size stock, e.g. { "S": 12, "M": 0, "L": 5 } or { "US 9": 3, "US 10": 0 }.
    // A size only counts as purchasable if stock[size] > 0. Falls back to
    // "unlimited" (not tracked) if omitted, so this is backward compatible
    // with products created before stock tracking existed.
    stock: {
      type: Map,
      of: Number,
      default: undefined,
    },

    bestseller: { type: Boolean, default: false },
    date: { type: Number, required: true },

    // Aggregated review data, denormalized onto the product for fast list-page
    // rendering (avoids a join/lookup on every product card). Updated whenever
    // a review is created/deleted — see review.controller.js.
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text', brand: 'text' });

// Total units available across all sizes, if stock is tracked.
productSchema.virtual('totalStock').get(function computeTotalStock() {
  if (!this.stock) return null;
  let total = 0;
  for (const qty of this.stock.values()) total += qty;
  return total;
});
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export default Product;
