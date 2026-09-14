import config from '../config/env.js';
import logger from '../config/logger.js';
import retryWithBackoff from '../utils/retry.js';

// Provider-agnostic SMS sender, following the exact same pattern as
// email.service.js: a no-op-and-log when unconfigured (never blocks the
// request that triggered it), swap in a real provider by implementing
// `sendViaProvider` below.
//
// THIS IS INTENTIONALLY NOT WIRED TO A LIVE PROVIDER YET — that requires a
// funded account and API credentials only the business owner can obtain
// (Termii and Africa's Talking are the standard choices for Nigeria/Africa;
// Twilio works globally but is pricier for local NG routes). Once you have
// credentials, fill in `sendViaProvider` (a single fetch() call for either
// provider's REST API — Termii's is a good default) and set SMS_API_KEY /
// SMS_SENDER_ID in .env. Every call site below (order confirmation, OTP,
// shipping, delivery, refund) is already wired and will start actually
// sending the moment this function works.
const isConfigured = () => Boolean(config.sms.apiKey);

const sendViaProvider = async ({ to, message }) => {
  // Example Termii implementation (uncomment and adjust once you have a key):
  //
  // const res = await fetch('https://api.ng.termii.com/api/sms/send', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     to,
  //     from: config.sms.senderId,
  //     sms: message,
  //     type: 'plain',
  //     api_key: config.sms.apiKey,
  //     channel: 'generic',
  //   }),
  // });
  // if (!res.ok) throw new Error(`SMS provider responded ${res.status}`);
  // return res.json();
  throw new Error('No SMS provider implemented yet — see sms.service.js');
};

const send = async ({ to, message }) => {
  if (!to) return { sent: false, reason: 'no_phone_number' };
  if (!isConfigured()) {
    logger.info({ to, message }, 'SMS not sent (SMS_API_KEY not configured) — would have sent');
    return { sent: false };
  }
  try {
    await retryWithBackoff(() => sendViaProvider({ to, message }));
    logger.info({ to }, 'SMS sent');
    return { sent: true };
  } catch (err) {
    logger.error({ err, to }, 'Failed to send SMS');
    return { sent: false, error: err.message };
  }
};

export const sendOtpSms = (phone, otp) =>
  send({ to: phone, message: `Your ${config.email.fromName} verification code is ${otp}. It expires in 10 minutes.` });

export const sendOrderConfirmationSms = (phone, order) =>
  send({ to: phone, message: `Order ${order.orderNumber} confirmed! Total: ${order.currency} ${order.total}. We'll text you when it ships.` });

export const sendShippingSms = (phone, order) =>
  send({
    to: phone,
    message: `Your order ${order.orderNumber} has shipped${order.trackingNumber ? ` — tracking #${order.trackingNumber}` : ''}.`,
  });

export const sendDeliverySms = (phone, order) =>
  send({ to: phone, message: `Your order ${order.orderNumber} has been delivered. Enjoy!` });

export const sendRefundSms = (phone, order, amount) =>
  send({ to: phone, message: `A refund of ${order.currency} ${amount} for order ${order.orderNumber} has been processed.` });

export default { sendOtpSms, sendOrderConfirmationSms, sendShippingSms, sendDeliverySms, sendRefundSms };
