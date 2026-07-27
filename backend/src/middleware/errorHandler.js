import { ApiError } from '../utils/ApiError.js';
import config from '../config/env.js';

export const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// Normalizes well-known error types (Mongoose validation/cast errors, JWT
// errors, multer errors, duplicate-key errors, etc.) into a consistent
// { success:false, message } shape with the correct HTTP status, and never
// leaks stack traces or internal details in production.
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err.name === 'ValidationError' && err.errors) {
    // Mongoose schema validation error
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for field "${err.path}"`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `An account with this ${field} already exists`;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expired, please login again';
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    message = err.message;
  }

  const isServerError = statusCode >= 500;

  req.log?.error({ err, statusCode }, 'Request error');
  if (!req.log) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  const payload = { success: false, message };
  if (details) payload.details = details;
  // Never leak stack traces to clients, especially in production.
  if (!config.isProduction && isServerError) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

export default errorHandler;
