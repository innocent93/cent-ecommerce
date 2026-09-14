import mongoose from 'mongoose';
import config from '../config/env.js';
import logger from '../config/logger.js';

mongoose.set('strictQuery', true);

let isConnected = false;

export const connectDB = async () => {
  mongoose.connection.on('connected', () => {
    isConnected = true;
    logger.info('MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB disconnected');
  });

  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });
};

export const disconnectDB = async () => {
  await mongoose.connection.close();
};

export const isDBConnected = () => isConnected && mongoose.connection.readyState === 1;

export default connectDB;
