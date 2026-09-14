import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

// Memory storage: files are streamed straight to Cloudinary and never
// touch the container's local filesystem. This is what makes the API
// stateless and safe to run as multiple replicas / in Docker without a
// shared volume for uploads.
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(ApiError.badRequest('Only JPEG, PNG, WEBP or AVIF images are allowed'));
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 4,
  },
});

export default upload;
