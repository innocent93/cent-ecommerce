import config from '../config/env.js';
import logger from '../config/logger.js';
import emailLayout from '../templates/emailLayout.js';
import retryWithBackoff from '../utils/retry.js';

const sendViaResend = async ({ to, subject, html }) => {
  const payload = {
    from: `${config.email.fromName} <${config.email.fromEmail}>`,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  };
  if (config.email.replyTo) payload.reply_to = config.email.replyTo;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.email.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await response.text();
    let parsed;
    try { parsed = body ? JSON.parse(body) : {}; } catch { parsed = { raw: body }; }
    if (!response.ok) {
      const error = new Error(parsed?.message || `Resend request failed with HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return parsed;
  } finally { clearTimeout(timeout); }
};

// Email failures are logged and never break signup, checkout, or other business requests.
const send = async ({ to, subject, html }) => {
  if (!config.email.enabled) {
    logger.info({ to, subject }, 'Email disabled: RESEND_API_KEY/EMAIL_FROM_ADDRESS not configured');
    return { sent: false, disabled: true };
  }
  try {
    const result = await retryWithBackoff(() => sendViaResend({ to, subject, html }));
    logger.info({ to, subject, provider: 'resend', resendId: result?.id || null }, 'Email sent');
    return { sent: true, id: result?.id || null };
  } catch (err) {
    logger.error({ err: { message: err.message, status: err.status, cause: err.cause }, to, subject, provider: 'resend' }, 'Failed to send email via Resend');
    return { sent: false, error: err.message, status: err.status || 502 };
  }
};

const money = (amount, currency) => `${currency} ${Number(amount).toLocaleString()}`;

export const sendWelcomeEmail = (user) =>
  send({
    to: user.email,
    subject: `Welcome to ${config.email.fromName}, ${user.name}!`,
    html: emailLayout({
      title: 'Welcome',
      preheader: `Welcome to ${config.email.fromName}`,
      bodyHtml: `<p>Hi ${user.name},</p><p>Your account has been created. Start browsing and we'll get your order to you fast.</p>`,
      ctaText: 'Start Shopping',
      ctaUrl: config.frontendUrl,
    }),
  });

export const sendPasswordResetEmail = (user, resetUrl) =>
  send({
    to: user.email,
    subject: 'Reset your password',
    html: emailLayout({
      title: 'Reset your password',
      preheader: 'Reset your password',
      bodyHtml: `<p>Hi ${user.name},</p><p>We received a request to reset your password. This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
      ctaText: 'Reset Password',
      ctaUrl: resetUrl,
    }),
  });

export const sendEmailVerificationEmail = (user, verifyUrl) =>
  send({
    to: user.email,
    subject: 'Verify your email address',
    html: emailLayout({
      title: 'Verify your email',
      preheader: 'Verify your email address',
      bodyHtml: `<p>Hi ${user.name},</p><p>Please confirm this is your email address to finish setting up your account.</p>`,
      ctaText: 'Verify Email',
      ctaUrl: verifyUrl,
    }),
  });

export const sendOrderConfirmationEmail = (user, order) =>
  send({
    to: user.email,
    subject: `Order confirmed — ${order.orderNumber}`,
    html: emailLayout({
      title: 'Order Confirmed',
      preheader: `Your order ${order.orderNumber} has been placed`,
      bodyHtml: `
        <p>Hi ${user.name},</p>
        <p>Thanks for your order! Here's a summary:</p>
        <table width="100%" cellpadding="6" style="border-collapse:collapse;margin-top:12px;">
          ${order.items
            .map(
              (item) =>
                `<tr><td style="border-bottom:1px solid #eee;">${item.name} (${item.size}) x${item.quantity}</td><td style="border-bottom:1px solid #eee;text-align:right;">${money(item.price * item.quantity, order.currency)}</td></tr>`
            )
            .join('')}
          <tr><td style="padding-top:10px;"><b>Total</b></td><td style="text-align:right;padding-top:10px;"><b>${money(order.total, order.currency)}</b></td></tr>
        </table>
        <p style="margin-top:16px;">Payment method: ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paystack'}</p>
      `,
      ctaText: 'View Order',
      ctaUrl: `${config.frontendUrl}/order`,
    }),
  });

export const sendPaymentConfirmationEmail = (user, order) =>
  send({
    to: user.email,
    subject: `Payment received — ${order.orderNumber}`,
    html: emailLayout({
      title: 'Payment Confirmed',
      preheader: `We've received your payment for ${order.orderNumber}`,
      bodyHtml: `<p>Hi ${user.name},</p><p>We've received your payment of <b>${money(order.total, order.currency)}</b> for order ${order.orderNumber}. We're getting it ready now.</p>`,
      ctaText: 'View Order',
      ctaUrl: `${config.frontendUrl}/order`,
    }),
  });

const STATUS_COPY = {
  confirmed: 'Your order has been confirmed and is being prepared.',
  processing: 'Your order is being processed.',
  shipped: 'Your order is on its way!',
  out_for_delivery: 'Your order is out for delivery — it should arrive today.',
  delivered: 'Your order has been delivered. We hope you love it!',
  cancelled: 'Your order has been cancelled.',
  returned: 'Your return has been received.',
};

export const sendShippingUpdateEmail = (user, order) =>
  send({
    to: user.email,
    subject: `Order update — ${order.orderNumber} is ${order.status.replace(/_/g, ' ')}`,
    html: emailLayout({
      title: 'Order Update',
      preheader: STATUS_COPY[order.status] || 'Your order status has changed',
      bodyHtml: `
        <p>Hi ${user.name},</p>
        <p>${STATUS_COPY[order.status] || `Your order status is now: ${order.status}`}</p>
        ${order.trackingNumber ? `<p>Tracking number: <b>${order.trackingNumber}</b>${order.carrier ? ` (${order.carrier})` : ''}</p>` : ''}
      `,
      ctaText: 'Track Order',
      ctaUrl: order.trackingNumber
        ? `${config.frontendUrl}/track/${order.trackingNumber}`
        : `${config.frontendUrl}/order`,
    }),
  });

export const sendRefundEmail = (user, order, refundAmount) =>
  send({
    to: user.email,
    subject: `Refund processed — ${order.orderNumber}`,
    html: emailLayout({
      title: 'Refund Processed',
      preheader: `Your refund for ${order.orderNumber} has been processed`,
      bodyHtml: `<p>Hi ${user.name},</p><p>We've processed a refund of <b>${money(refundAmount, order.currency)}</b> for order ${order.orderNumber}. It should reflect in your account within 5-10 business days, depending on your bank.</p>`,
    }),
  });

export const sendAdminNewOrderNotification = (order) => {
  const to = config.email.adminNotifyEmail || config.admin.email;
  return send({
    to,
    subject: `New order: ${order.orderNumber} (${money(order.total, order.currency)})`,
    html: emailLayout({
      title: 'New Order',
      preheader: `New order ${order.orderNumber}`,
      bodyHtml: `<p>New order placed: <b>${order.orderNumber}</b></p><p>Total: ${money(order.total, order.currency)}</p><p>Payment: ${order.paymentMethod}</p>`,
      ctaText: 'View in Admin',
      ctaUrl: `${config.frontendUrl.replace(/:\d+$/, ':5174')}/orders`,
    }),
  });
};

export default {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  sendOrderConfirmationEmail,
  sendPaymentConfirmationEmail,
  sendShippingUpdateEmail,
  sendRefundEmail,
  sendAdminNewOrderNotification,
};
