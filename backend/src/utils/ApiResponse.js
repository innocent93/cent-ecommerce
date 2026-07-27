// Kept intentionally simple and backward compatible: the existing React
// storefront/admin (and any Flutter client built against this API) expect
// top-level fields like `success`, `token`, `products`, `product`, `cartData`
// rather than a nested `data` envelope. `extra` lets each controller keep
// those exact field names while still going through one shared helper.
export const sendSuccess = (res, { statusCode = 200, message = 'Success', ...extra } = {}) => {
  return res.status(statusCode).json({ success: true, message, ...extra });
};

export default sendSuccess;
