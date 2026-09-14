import * as paystackService from '../services/paystack.service.js';
import * as orderService from '../services/order.service.js';
import PaymentEvent from '../models/PaymentEvent.model.js';
import asyncHandler from '../utils/asyncHandler.js';

// POST /api/webhooks/paystack
// IMPORTANT: this route is mounted with express.raw() (see app.js) instead
// of express.json(), because HMAC signature verification must run against
// the exact raw request bytes Paystack sent — re-serializing a parsed JSON
// body can produce different bytes and silently break verification.
export const handlePaystackWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  const isValid = paystackService.verifyWebhookSignature(req.body, signature);

  if (!isValid) {
    req.log.warn('Rejected Paystack webhook: invalid signature');
    // Still logged to the audit trail (with signatureValid: false) — a
    // stream of invalid-signature attempts is itself worth being able to
    // query later.
    await PaymentEvent.create({
      eventType: 'invalid_signature',
      signatureValid: false,
      rawPayload: req.body?.toString('utf8')?.slice(0, 2000),
    }).catch((err) => req.log.error({ err }, 'Failed to record invalid webhook signature'));
    return res.status(401).json({ success: false, message: 'Invalid signature' });
  }

  // Body is a raw Buffer here (see express.raw() above) — parse it now that
  // it's verified.
  const event = JSON.parse(req.body.toString('utf8'));
  let orders = [];

  switch (event.event) {
    case 'charge.success': {
      orders = await orderService.markOrderPaid(event.data.reference, req.log);
      break;
    }
    case 'charge.failed': {
      orders = await orderService.markOrderPaymentFailed(event.data.reference, req.log);
      break;
    }
    default:
      req.log.info({ event: event.event }, 'Unhandled Paystack webhook event');
  }

  // Audit trail — independent of what order.service.js did with the event,
  // so this record survives even if order processing itself had a bug. One
  // event, potentially several orders (a multi-seller checkout) — record
  // against the first for a stable audit key, all order IDs are still
  // discoverable via their shared paymentReference.
  await PaymentEvent.create({
    eventType: event.event,
    reference: event.data?.reference,
    order: orders[0]?._id,
    signatureValid: true,
    rawPayload: event,
  }).catch((err) => req.log.error({ err }, 'Failed to record payment event'));

  // Always 200 quickly so Paystack doesn't retry unnecessarily once we've
  // successfully received and processed the event.
  res.status(200).json({ received: true });
});

export default { handlePaystackWebhook };
