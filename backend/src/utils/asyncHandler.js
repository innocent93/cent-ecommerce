// Wraps an async route handler so any rejected promise / thrown error is
// forwarded to Express's error pipeline (errorHandler.js) instead of
// crashing the process or being silently swallowed.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
