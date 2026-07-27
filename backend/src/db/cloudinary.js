import { v2 as cloudinary } from 'cloudinary';
import config from '../config/env.js';
import logger from '../config/logger.js';

const connectCloudinary = () => {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
  logger.info('Cloudinary configured');
};

export { cloudinary };
export default connectCloudinary;
