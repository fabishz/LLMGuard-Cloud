import { Request, Response, NextFunction } from 'express';
import * as billingService from '../services/billingService.js';
import { logger } from '../utils/logger.js';
import { CheckoutRequest, BillingPortalRequest, InvoicesQuery } from '../validators/billing.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

/**
 * Create a checkout session for plan upgrade
 * POST /billing/checkout
 * Body: { plan, successUrl, cancelUrl }
 * Response: { url }
 * Requirements: 9.1
 */
export async function createCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const request = req.body as CheckoutRequest;

    const checkoutData = await billingService.createCheckoutSession(
      userId,
      request.plan,
      request.successUrl,
      request.cancelUrl
    );

    logger.info({ userId, plan: request.plan }, 'Checkout session created successfully');

    res.status(200).json({
      url: checkoutData.url,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
    if (error instanceof ValidationError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.details,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
    next(error);
  }
}

/**
 * Create a billing portal session
 * POST /billing/portal
 * Body: { returnUrl }
 * Response: { url }
 * Requirements: 9.3
 */
export async function createBillingPortal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const request = req.body as BillingPortalRequest;

    const portalData = await billingService.createBillingPortalSession(userId, request.returnUrl);

    logger.info({ userId }, 'Billing portal session created successfully');

    res.status(200).json({
      url: portalData.url,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
    if (error instanceof ValidationError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.details,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
    next(error);
  }
}

/**
 * Get invoice history
 * GET /billing/invoices
 * Query: { limit? }
 * Response: { invoices }
 * Requirements: 9.4
 */
export async function getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const query = req.query as InvoicesQuery;
    const limit = query.limit || 10;

    const invoices = await billingService.getInvoices(userId, limit);

    logger.info({ userId, invoiceCount: invoices.length }, 'Invoices retrieved successfully');

    res.status(200).json({
      invoices,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
    next(error);
  }
}
