/**
 * Safe, repeatable demo catalog seed for staging/local development.
 * It only upserts products by SKU and never deletes existing production data.
 * Run with: npm run seed --prefix backend
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import { connectDB, disconnectDB } from '../db/mongoose.js';

const image = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=85`;

const products = [
  { sku: 'US-SNK-001', name: 'Courtline Everyday Sneakers', description: 'Clean low-profile sneakers designed for daily movement and easy styling.', price: 48500, category: 'Footwear', subCategory: 'Sneakers', brand: 'UrbanStep Studio', color: 'Cloud white', gender: 'unisex', sizes: ['EU 39','EU 40','EU 41','EU 42','EU 43','EU 44'], stock: { 'EU 39': 8, 'EU 40': 12, 'EU 41': 15, 'EU 42': 10, 'EU 43': 7, 'EU 44': 5 }, bestseller: true, image: [image('photo-1542291026-7eec264c27ff')] },
  { sku: 'US-JKT-002', name: 'Structured Utility Jacket', description: 'A versatile lightweight jacket with a structured cut and practical pockets.', price: 62500, category: 'Clothing', subCategory: 'Jackets', brand: 'UrbanStep Studio', color: 'Stone', gender: 'unisex', sizes: ['S','M','L','XL'], stock: { S: 5, M: 9, L: 8, XL: 4 }, bestseller: true, image: [image('photo-1551488831-00ddcb6c6bd3')] },
  { sku: 'US-BAG-003', name: 'Everyday Carry Tote', description: 'A roomy, durable tote for workdays, weekends, and everything between.', price: 29500, category: 'Accessories', subCategory: 'Bags', brand: 'UrbanStep Studio', color: 'Ink', gender: 'unisex', sizes: ['One size'], stock: { 'One size': 20 }, bestseller: false, image: [image('photo-1553062407-98eeb64c6a62')] },
  { sku: 'US-TEE-004', name: 'Essential Heavyweight Tee', description: 'A premium heavyweight cotton tee with a relaxed everyday silhouette.', price: 18500, category: 'Clothing', subCategory: 'T-Shirts', brand: 'UrbanStep Studio', color: 'Black', gender: 'unisex', sizes: ['S','M','L','XL'], stock: { S: 12, M: 18, L: 15, XL: 9 }, bestseller: true, image: [image('photo-1521572163474-6864f9cf17ab')] },
  { sku: 'US-SND-005', name: 'Minimal Leather Slides', description: 'Minimal slides with a considered shape for relaxed days and warm weather.', price: 24000, category: 'Footwear', subCategory: 'Slides', brand: 'UrbanStep Studio', color: 'Tan', gender: 'unisex', sizes: ['EU 39','EU 40','EU 41','EU 42','EU 43'], stock: { 'EU 39': 7, 'EU 40': 8, 'EU 41': 10, 'EU 42': 8, 'EU 43': 4 }, bestseller: false, image: [image('photo-1603487742131-4160ec999306')] },
  { sku: 'US-DNM-006', name: 'Relaxed Straight Denim', description: 'A relaxed straight-leg denim with an easy fit and timeless finish.', price: 42000, category: 'Clothing', subCategory: 'Trousers', brand: 'UrbanStep Studio', color: 'Indigo', gender: 'unisex', sizes: ['28','30','32','34','36'], stock: { '28': 6, '30': 10, '32': 14, '34': 9, '36': 4 }, bestseller: false, image: [image('photo-1542272604-787c3835535d')] },
];

try {
  await connectDB();
  for (const item of products) {
    await Product.updateOne({ sku: item.sku }, { $set: { ...item, date: Date.now() } }, { upsert: true, runValidators: true });
  }
  console.log(`Seeded ${products.length} UrbanStep catalog products.`);
} finally {
  await disconnectDB();
}
