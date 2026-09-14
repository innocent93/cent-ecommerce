import crypto from 'crypto';
import config from '../config/env.js';
import logger from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

const isConfigured = () => Boolean(config.paystack.secretKey);

const request = async (path, options = {}) => {
  if (!isConfigured()) {
    throw ApiError.badRequest('Card/bank payments are not configured on this store yet');
  }
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.paystack.secretKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok || data.status === false) {
    logger.warn({ path, response: data }, 'Paystack API error');
    throw ApiError.badRequest(data.message || 'Payment provider error');
  }
  return data.data;
};

// Paystack expects amounts in the smallest currency unit (kobo for NGN,
// cents for GHS/ZAR/USD, etc.) — i.e. amount * 100 for every currency
// Paystack supports (none of their supported currencies are zero-decimal).
export const initializeTransaction = async ({ email, amountMajorUnits, currency, reference, metadata }) => {
  const data = await request('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email,
      amount: Math.round(amountMajorUnits * 100),
      currency,
      reference,
      callback_url: `${config.frontendUrl}/order/confirmation?reference=${reference}`,
      metadata,
    }),
  });
  // { authorization_url, access_code, reference }
  return data;
};

export const verifyTransaction = async (reference) => {
  const data = await request(`/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' });
  // { status: 'success'|'failed'|..., amount, currency, reference, ... }
  return data;
};

// Full or partial refund of a previously successful transaction. Amount is
// optional (omit for a full refund) and, like initializeTransaction, must be
// in the smallest currency unit.
export const refundTransaction = async ({ reference, amountMajorUnits, reason }) => {
  const data = await request('/refund', {
    method: 'POST',
    body: JSON.stringify({
      transaction: reference,
      ...(amountMajorUnits !== undefined && { amount: Math.round(amountMajorUnits * 100) }),
      ...(reason && { customer_note: reason, merchant_note: reason }),
    }),
  });
  return data; // { id, status, amount, ... }
};

// Verifies the `x-paystack-signature` header on incoming webhooks using
// HMAC-SHA512 of the raw request body against the secret key, per Paystack's
// documented scheme. This is the only safe way to trust a webhook — never
// act on a webhook payload without verifying this signature, since the
// endpoint is public and otherwise anyone could fake a "payment successful"
// event.
export const verifyWebhookSignature = (rawBody, signatureHeader) => {
  if (!config.paystack.secretKey || !signatureHeader) return false;
  const expected = crypto
    .createHmac('sha512', config.paystack.secretKey)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
};

export const isPaystackConfigured = isConfigured;

// --- Marketplace payouts (Option B) --------------------------------------
// Registers a seller's bank account with Paystack as a "transfer
// recipient" — a one-time step before you can ever pay them. Returns a
// recipient_code, which you store on the Seller document and reuse for
// every future payout to them (no need to re-register each time).
export const createTransferRecipient = async ({ accountNumber, bankCode, accountName }) => {
  const data = await request('/transferrecipient', {
    method: 'POST',
    body: JSON.stringify({
      type: 'nuban',
      name: accountName,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'NGN',
    }),
  });
  return data; // { recipient_code, ... }
};

// Moves real money from your Paystack balance to a seller's bank account.
// `reference` should be unique per payout attempt (used for idempotency on
// Paystack's side too — retrying the same reference won't double-pay).
export const initiateTransfer = async ({ amountMajorUnits, recipientCode, reference, reason }) => {
  const data = await request('/transfer', {
    method: 'POST',
    body: JSON.stringify({
      source: 'balance',
      amount: Math.round(amountMajorUnits * 100),
      recipient: recipientCode,
      reference,
      reason,
    }),
  });
  return data; // { transfer_code, status, ... }
};

export default {
  initializeTransaction,
  verifyTransaction,
  refundTransaction,
  verifyWebhookSignature,
  isPaystackConfigured,
  createTransferRecipient,
  initiateTransfer,
};
