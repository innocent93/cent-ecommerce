const CURRENCY_SYMBOLS = { NGN: "\u20a6", USD: "$", EUR: "\u20ac", GBP: "\u00a3" };

export const money = (amount, currency = "NGN") => {
  const symbol = CURRENCY_SYMBOLS[currency] || currency + " ";
  const value = Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${value}`;
};

export const shortDate = (value) => {
  if (!value) return "\u2014";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const dateTime = (value) => {
  if (!value) return "\u2014";
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Order/tracking status -> ledger tone. Kept in one place so a status's
// color always means the same thing everywhere it appears in the app.
export const statusTone = (status) => {
  switch (status) {
    case "delivered":
      return "moss";
    case "cancelled":
    case "returned":
    case "failed":
    case "rejected":
      return "brick";
    case "approved":
    case "success":
      return "moss";
    case "pending":
    case "requested":
      return "ochre";
    default:
      return "ink";
  }
};

export const statusLabel = (status) =>
  (status || "").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
