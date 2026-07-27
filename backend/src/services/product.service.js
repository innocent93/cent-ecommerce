import { cloudinary } from '../db/cloudinary.js';
import Product from '../models/Product.model.js';
import { ApiError } from '../utils/ApiError.js';
import { withConvertedPrice } from '../utils/currency.js';

// Streams a memory-buffered upload (from multer.memoryStorage()) straight to
// Cloudinary without touching disk.
const uploadBufferToCloudinary = (file) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'image', folder: 'ecommerce/products' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(file.buffer);
  });

// Parses the optional per-size stock payload, e.g. '{"S":10,"M":0,"L":5}'
// or '{"US 9":3,"US 10":0}' for shoes. Returns undefined (unlimited/untracked
// stock) if not provided.
const parseStock = (raw) => {
  if (raw === undefined || raw === null || raw === '') return undefined;
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    throw ApiError.badRequest('stock must be valid JSON, e.g. {"S":10,"M":5}');
  }
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw ApiError.badRequest('stock must be a JSON object mapping size -> quantity');
  }
  for (const [size, qty] of Object.entries(parsed)) {
    if (typeof qty !== 'number' || qty < 0 || !Number.isFinite(qty)) {
      throw ApiError.badRequest(`Invalid stock quantity for size "${size}"`);
    }
  }
  return parsed;
};

export const createProduct = async (body, files) => {
  const { name, description, price, category, subCategory, sizes, bestseller, brand, color, gender, stock, sku } = body;

  const images = ['image1', 'image2', 'image3', 'image4']
    .map((key) => files[key]?.[0])
    .filter(Boolean);

  if (images.length === 0) {
    throw ApiError.badRequest('At least one product image is required');
  }

  let parsedSizes;
  try {
    parsedSizes = JSON.parse(sizes);
  } catch {
    throw ApiError.badRequest('Sizes must be valid JSON, e.g. ["S","M","L"]');
  }

  const parsedStock = parseStock(stock);
  if (parsedStock) {
    const missing = parsedSizes.filter((s) => !(s in parsedStock));
    if (missing.length > 0) {
      throw ApiError.badRequest(`stock is missing quantities for size(s): ${missing.join(', ')}`);
    }
  }

  const imageUrls = await Promise.all(images.map(uploadBufferToCloudinary));

  return Product.create({
    sku: sku || undefined,
    name,
    description,
    category,
    price: Number(price),
    subCategory,
    brand,
    color,
    gender: gender || undefined,
    bestseller: bestseller === 'true' || bestseller === true,
    sizes: parsedSizes,
    stock: parsedStock,
    image: imageUrls,
    date: Date.now(),
  });
};

export const listProducts = async (query) => {
  const { page, limit, category, subCategory, bestseller, brand, gender, search, currency } = query;

  const filter = {};
  if (category) filter.category = category;
  if (subCategory) filter.subCategory = subCategory;
  if (brand) filter.brand = brand;
  if (gender) filter.gender = gender;
  if (bestseller !== undefined) filter.bestseller = bestseller === 'true';
  if (search) filter.$text = { $search: search };

  const applyCurrency = (products) => (currency ? products.map((p) => withConvertedPrice(p, currency)) : products);

  if (!page && !limit) {
    const products = await Product.find(filter).sort({ createdAt: -1 });
    return { products: applyCurrency(products) };
  }

  const pageNum = page || 1;
  const limitNum = limit || 20;
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Product.countDocuments(filter),
  ]);

  return {
    products: applyCurrency(products),
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  };
};

export const removeProduct = async (id) => {
  const product = await Product.findByIdAndDelete(id);
  if (!product) throw ApiError.notFound('Product not found');
  return product;
};

// PATCH /api/product/:id — partial update. Every field is optional so the
// admin can change just a price or just the stock without resending
// everything. New images (image1..4, any subset) replace the corresponding
// slot; omitted image slots keep whatever was already stored.
export const updateProduct = async (productId, body, files = {}) => {
  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound('Product not found');

  const { name, description, price, category, subCategory, sizes, bestseller, brand, color, gender, stock, sku } = body;

  if (name !== undefined) product.name = name;
  if (description !== undefined) product.description = description;
  if (price !== undefined) product.price = Number(price);
  if (category !== undefined) product.category = category;
  if (subCategory !== undefined) product.subCategory = subCategory;
  if (brand !== undefined) product.brand = brand;
  if (color !== undefined) product.color = color;
  if (gender !== undefined) product.gender = gender;
  if (sku !== undefined) product.sku = sku || undefined;
  if (bestseller !== undefined) product.bestseller = bestseller === 'true' || bestseller === true;

  if (sizes !== undefined) {
    try {
      product.sizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
    } catch {
      throw ApiError.badRequest('Sizes must be valid JSON, e.g. ["S","M","L"]');
    }
  }

  if (stock !== undefined) {
    product.stock = parseStock(stock);
  }

  // Replace only the image slots that were actually re-uploaded; existing
  // images stay in place otherwise, in slot order (image1..image4).
  const existingImages = [...product.image];
  let imagesChanged = false;
  for (let i = 0; i < 4; i += 1) {
    const file = files[`image${i + 1}`]?.[0];
    if (file) {
      existingImages[i] = await uploadBufferToCloudinary(file);
      imagesChanged = true;
    }
  }
  if (imagesChanged) {
    product.image = existingImages.filter(Boolean);
  }

  await product.save();
  return product;
};

export const getProductById = async (productId, currency) => {
  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound('Product not found');
  return currency ? withConvertedPrice(product, currency) : product;
};

export default { createProduct, listProducts, removeProduct, updateProduct, getProductById };
