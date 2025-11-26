import { Router, type Router as ExpressRouter } from 'express';
import * as billingController from '../controllers/billingController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validation.js';
import { checkoutRequestSchema, billingPortalRequestSchema, invoicesQuerySchema } from '../validators/billing.js';

const router: ExpressRouter = Router();

// All billing routes require JWT authentication
router.use(authenticateJWT);

/**
 * POST /billing/checkout
 * Create a checkout session for plan upgrade
 * Body: { plan, successUrl, cancelUrl }
 * Response: { url }
 * Requirements: 9.1
 */
router.post(
  '/checkout',
  validateBody(checkoutRequestSchema),
  billingController.createCheckout
);

/**
 * POST /billing/portal
 * Create a billing portal session
 * Body: { returnUrl }
 * Response: { url }
 * Requirements: 9.3
 */
router.post(
  '/portal',
  validateBody(billingPortalRequestSchema),
  billingController.createBillingPortal
);

/**
 * GET /billing/invoices
 * Get invoice history
 * Query: { limit? }
 * Response: { invoices }
 * Requirements: 9.4
 */
router.get(
  '/invoices',
  validateQuery(invoicesQuerySchema),
  billingController.getInvoices
);

export default router;
