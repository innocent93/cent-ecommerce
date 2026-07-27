import express from 'express';
import { handlePaystackWebhook } from '../controllers/webhook.controller.js';

const webhookRouter = express.Router();

// No auth middleware, no JSON body parser (raw body needed for signature
// verification — see webhook.controller.js), and deliberately excluded from
// the general API rate limiter in app.js since Paystack, not a browser,
// calls this.
webhookRouter.post('/paystack', express.raw({ type: 'application/json' }), handlePaystackWebhook);

export default webhookRouter;
