import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

// Runs after an array of express-validator check(...) rules and turns any
// failures into a single, clean 400 response instead of leaking
// express-validator's internal error shape to clients.
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
  next(ApiError.badRequest('Validation failed', details));
};

export default validate;
