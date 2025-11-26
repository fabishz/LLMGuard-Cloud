import { Router, type Router as ExpressRouter, json } from 'express';
import * as webhookController from '../controllers/webhookController.js';

const router: ExpressRouter = Router();

/**
 * Middleware to capture raw request body for webhook signature validation
 * Uses Express's built-in json middleware with verify callback to capture raw body
 */
const captureRawBodyJson = json({
  verify: (req: any, _res: any, buf: Buffer) => {
    req.rawBody = buf.toString('utf8');
  },
});

/**
 * POST /webhooks/datadog
 * Receive and process Datadog webhook alerts
 * 
 * Datadog sends alerts when monitoring conditions are triggered.
 * This endpoint validates the webhook signature and creates incidents
 * based on the alert metadata.
 * 
 * Headers:
 * - X-Datadog-Signature: HMAC-SHA256 signature of the request body
 * 
 * Body:
 * {
 *   "alert": {
 *     "id": "alert_id",
 *     "title": "Alert Title",
 *     "status": "alert",
 *     "last_updated": "2024-01-01T00:00:00Z",
 *     "org": { "name": "org_name" },
 *     "snapshot": { ... }
 *   }
 * }
 * 
 * Response: { success: true, incidentId: "incident_id" }
 * Requirements: 4.2
 */
router.post(
  '/datadog',
  captureRawBodyJson,
  webhookController.handleDatadogWebhook
);

/**
 * POST /webhooks/stripe
 * Receive and process Stripe webhook events
 * 
 * Stripe sends events for subscription changes, payments, and other billing events.
 * This endpoint validates the webhook signature and processes the event.
 * 
 * Headers:
 * - Stripe-Signature: Signature of the request body
 * 
 * Body: Stripe event object
 * {
 *   "id": "evt_...",
 *   "type": "customer.subscription.updated",
 *   "data": { ... }
 * }
 * 
 * Response: { received: true }
 * Requirements: 9.2
 */
router.post(
  '/stripe',
  captureRawBodyJson,
  webhookController.handleStripeWebhook
);

export default router;
