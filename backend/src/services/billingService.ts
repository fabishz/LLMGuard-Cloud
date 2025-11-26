import prisma from '../config/database.js';
import * as stripeIntegration from '../integrations/stripe.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Billing plan type
 */
export type BillingPlan = 'free' | 'pro' | 'enterprise';

/**
 * Plan configuration with limits and pricing
 */
interface PlanConfig {
  monthlyLimit: number;
  priceId: string;
}

/**
 * Billing information response
 */
export interface BillingInfo {
  id: string;
  userId: string;
  plan: BillingPlan;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  usage: number;
  monthlyLimit: number;
  nextBillingDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Invoice information response
 */
export interface InvoiceInfo {
  id: string;
  amount: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: string;
  date: Date;
  dueDate?: Date;
  pdfUrl?: string;
}

/**
 * Plan upgrade/downgrade request
 */
export interface ChangePlanRequest {
  plan: BillingPlan;
}

/**
 * Plan configuration mapping
 */
const PLAN_CONFIG: Record<BillingPlan, PlanConfig> = {
  free: {
    monthlyLimit: 10000,
    priceId: process.env.STRIPE_PRICE_ID_FREE || 'price_free_placeholder',
  },
  pro: {
    monthlyLimit: 1000000,
    priceId: process.env.STRIPE_PRICE_ID_PRO || 'price_pro_placeholder',
  },
  enterprise: {
    monthlyLimit: Number.MAX_SAFE_INTEGER,
    priceId: process.env.STRIPE_PRICE_ID_ENTERPRISE || 'price_enterprise_placeholder',
  },
};

/**
 * Get billing information for a user
 * @param userId - User ID to retrieve billing for
 * @returns Billing information
 * @throws NotFoundError if billing record not found
 */
export async function getBillingInfo(userId: string): Promise<BillingInfo> {
  try {
    const billing = await prisma.billing.findUnique({
      where: { userId },
    });

    if (!billing) {
      logger.warn({ userId }, 'Billing record not found');
      throw new NotFoundError('Billing');
    }

    logger.info({ userId }, 'Billing information retrieved successfully');

    return {
      id: billing.id,
      userId: billing.userId,
      plan: billing.plan as BillingPlan,
      stripeCustomerId: billing.stripeCustomerId || undefined,
      stripeSubscriptionId: billing.stripeSubscriptionId || undefined,
      usage: billing.usage,
      monthlyLimit: billing.monthlyLimit,
      nextBillingDate: billing.nextBillingDate || undefined,
      createdAt: billing.createdAt,
      updatedAt: billing.updatedAt,
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, userId }, 'Failed to get billing information');
    throw new Error('Failed to get billing information');
  }
}

/**
 * Create a checkout session for plan upgrade
 * @param userId - User ID initiating checkout
 * @param plan - Target billing plan
 * @param successUrl - URL to redirect to on successful checkout
 * @param cancelUrl - URL to redirect to on cancelled checkout
 * @returns Checkout session URL
 * @throws NotFoundError if user or billing not found
 * @throws ValidationError if plan is invalid
 */
export async function createCheckoutSession(
  userId: string,
  plan: BillingPlan,
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string }> {
  // Validate plan
  if (!PLAN_CONFIG[plan]) {
    logger.warn({ userId, plan }, 'Invalid billing plan');
    throw new ValidationError('Invalid billing plan', { field: 'plan' });
  }

  try {
    // Get user and billing information
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      logger.warn({ userId }, 'User not found for checkout');
      throw new NotFoundError('User');
    }

    const billing = await prisma.billing.findUnique({
      where: { userId },
    });

    if (!billing) {
      logger.warn({ userId }, 'Billing record not found for checkout');
      throw new NotFoundError('Billing');
    }

    // Create or retrieve Stripe customer
    let customerId = billing.stripeCustomerId;
    if (!customerId) {
      customerId = await stripeIntegration.createCustomer(user.email, user.name || undefined);
      // Update billing with Stripe customer ID
      await prisma.billing.update({
        where: { userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const checkoutData = await stripeIntegration.createCheckoutSession(
      customerId,
      plan as 'pro' | 'enterprise',
      successUrl,
      cancelUrl
    );

    logger.info(
      { userId, plan, sessionId: checkoutData.sessionId },
      'Checkout session created successfully'
    );

    return {
      url: checkoutData.url,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    logger.error({ error, userId, plan }, 'Failed to create checkout session');
    throw new Error('Failed to create checkout session');
  }
}

/**
 * Create a billing portal session for a user
 * @param userId - User ID requesting portal access
 * @param returnUrl - URL to redirect to when exiting the portal
 * @returns Billing portal session URL
 * @throws NotFoundError if user or billing not found
 */
export async function createBillingPortalSession(
  userId: string,
  returnUrl: string
): Promise<{ url: string }> {
  try {
    const billing = await prisma.billing.findUnique({
      where: { userId },
    });

    if (!billing) {
      logger.warn({ userId }, 'Billing record not found for portal');
      throw new NotFoundError('Billing');
    }

    if (!billing.stripeCustomerId) {
      logger.warn({ userId }, 'No Stripe customer ID for portal access');
      throw new ValidationError('No active Stripe subscription', { field: 'stripeCustomerId' });
    }

    // Create billing portal session
    const portalData = await stripeIntegration.createBillingPortalSession(
      billing.stripeCustomerId,
      returnUrl
    );

    logger.info({ userId }, 'Billing portal session created successfully');

    return {
      url: portalData.url,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    logger.error({ error, userId }, 'Failed to create billing portal session');
    throw new Error('Failed to create billing portal session');
  }
}

/**
 * Get invoice history for a user
 * @param userId - User ID to retrieve invoices for
 * @param limit - Maximum number of invoices to return (default: 10)
 * @returns Array of invoice information
 * @throws NotFoundError if billing not found
 */
export async function getInvoices(userId: string, limit: number = 10): Promise<InvoiceInfo[]> {
  try {
    const billing = await prisma.billing.findUnique({
      where: { userId },
    });

    if (!billing) {
      logger.warn({ userId }, 'Billing record not found for invoices');
      throw new NotFoundError('Billing');
    }

    if (!billing.stripeCustomerId) {
      logger.info({ userId }, 'No Stripe customer ID, returning empty invoices');
      return [];
    }

    // Retrieve invoices from Stripe
    const stripeInvoices = await stripeIntegration.listInvoices(
      billing.stripeCustomerId,
      limit
    );

    const invoices: InvoiceInfo[] = stripeInvoices.map((invoice) => ({
      id: invoice.id,
      amount: invoice.amount_due / 100, // Convert from cents
      amountPaid: invoice.amount_paid / 100,
      amountDue: invoice.amount_due / 100,
      currency: invoice.currency.toUpperCase(),
      status: invoice.status || 'unknown',
      date: new Date(invoice.created * 1000),
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : undefined,
      pdfUrl: invoice.invoice_pdf || undefined,
    }));

    logger.info({ userId, invoiceCount: invoices.length }, 'Invoices retrieved successfully');

    return invoices;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, userId }, 'Failed to get invoices');
    throw new Error('Failed to get invoices');
  }
}

/**
 * Change user's billing plan (upgrade or downgrade)
 * @param userId - User ID changing plan
 * @param request - Change plan request with new plan
 * @returns Updated billing information
 * @throws NotFoundError if user or billing not found
 * @throws ValidationError if plan is invalid or no active subscription
 */
export async function changePlan(
  userId: string,
  request: ChangePlanRequest
): Promise<BillingInfo> {
  const { plan } = request;

  // Validate plan
  if (!PLAN_CONFIG[plan]) {
    logger.warn({ userId, plan }, 'Invalid billing plan for change');
    throw new ValidationError('Invalid billing plan', { field: 'plan' });
  }

  try {
    const billing = await prisma.billing.findUnique({
      where: { userId },
    });

    if (!billing) {
      logger.warn({ userId }, 'Billing record not found for plan change');
      throw new NotFoundError('Billing');
    }

    // If changing from free plan, require Stripe subscription
    if (billing.plan === 'free' && plan !== 'free') {
      if (!billing.stripeSubscriptionId) {
        logger.warn({ userId }, 'No active Stripe subscription for plan upgrade');
        throw new ValidationError('No active Stripe subscription', { field: 'stripeSubscriptionId' });
      }
    }

    // Update plan in database
    const newPlanConfig = PLAN_CONFIG[plan];
    const updatedBilling = await prisma.billing.update({
      where: { userId },
      data: {
        plan,
        monthlyLimit: newPlanConfig.monthlyLimit,
      },
    });

    // If upgrading/downgrading from paid plan, update Stripe subscription
    if (billing.stripeSubscriptionId && plan !== 'free') {
      const newPriceId = newPlanConfig.priceId;
      await stripeIntegration.updateSubscription(billing.stripeSubscriptionId, newPriceId);
    }

    logger.info(
      { userId, oldPlan: billing.plan, newPlan: plan },
      'Billing plan changed successfully'
    );

    return {
      id: updatedBilling.id,
      userId: updatedBilling.userId,
      plan: updatedBilling.plan as BillingPlan,
      stripeCustomerId: updatedBilling.stripeCustomerId || undefined,
      stripeSubscriptionId: updatedBilling.stripeSubscriptionId || undefined,
      usage: updatedBilling.usage,
      monthlyLimit: updatedBilling.monthlyLimit,
      nextBillingDate: updatedBilling.nextBillingDate || undefined,
      createdAt: updatedBilling.createdAt,
      updatedAt: updatedBilling.updatedAt,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    logger.error({ error, userId, plan }, 'Failed to change billing plan');
    throw new Error('Failed to change billing plan');
  }
}

/**
 * Update billing information from Stripe webhook
 * Called when subscription events occur (created, updated, deleted)
 * @param userId - User ID to update
 * @param stripeCustomerId - Stripe customer ID
 * @param stripeSubscriptionId - Stripe subscription ID
 * @param plan - New billing plan
 * @param nextBillingDate - Next billing date
 * @returns Updated billing information
 * @throws NotFoundError if billing not found
 */
export async function updateBillingFromWebhook(
  userId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  plan: BillingPlan,
  nextBillingDate: Date
): Promise<BillingInfo> {
  try {
    const billing = await prisma.billing.findUnique({
      where: { userId },
    });

    if (!billing) {
      logger.warn({ userId }, 'Billing record not found for webhook update');
      throw new NotFoundError('Billing');
    }

    const newPlanConfig = PLAN_CONFIG[plan];
    const updatedBilling = await prisma.billing.update({
      where: { userId },
      data: {
        stripeCustomerId,
        stripeSubscriptionId,
        plan,
        monthlyLimit: newPlanConfig.monthlyLimit,
        nextBillingDate,
      },
    });

    logger.info(
      { userId, plan, stripeSubscriptionId },
      'Billing updated from Stripe webhook'
    );

    return {
      id: updatedBilling.id,
      userId: updatedBilling.userId,
      plan: updatedBilling.plan as BillingPlan,
      stripeCustomerId: updatedBilling.stripeCustomerId || undefined,
      stripeSubscriptionId: updatedBilling.stripeSubscriptionId || undefined,
      usage: updatedBilling.usage,
      monthlyLimit: updatedBilling.monthlyLimit,
      nextBillingDate: updatedBilling.nextBillingDate || undefined,
      createdAt: updatedBilling.createdAt,
      updatedAt: updatedBilling.updatedAt,
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, userId }, 'Failed to update billing from webhook');
    throw new Error('Failed to update billing from webhook');
  }
}

/**
 * Track usage for a user's project
 * Increments the usage counter and checks against monthly limit
 * @param userId - User ID to track usage for
 * @param requestCount - Number of requests to add to usage
 * @returns Updated billing information with usage
 * @throws NotFoundError if billing not found
 */
export async function trackUsage(userId: string, requestCount: number = 1): Promise<BillingInfo> {
  try {
    const billing = await prisma.billing.findUnique({
      where: { userId },
    });

    if (!billing) {
      logger.warn({ userId }, 'Billing record not found for usage tracking');
      throw new NotFoundError('Billing');
    }

    const newUsage = billing.usage + requestCount;

    // Check if usage exceeds monthly limit
    if (newUsage > billing.monthlyLimit) {
      logger.warn(
        { userId, usage: newUsage, limit: billing.monthlyLimit },
        'Usage exceeds monthly limit'
      );
    }

    const updatedBilling = await prisma.billing.update({
      where: { userId },
      data: {
        usage: newUsage,
      },
    });

    logger.debug(
      { userId, usage: newUsage, limit: billing.monthlyLimit },
      'Usage tracked successfully'
    );

    return {
      id: updatedBilling.id,
      userId: updatedBilling.userId,
      plan: updatedBilling.plan as BillingPlan,
      stripeCustomerId: updatedBilling.stripeCustomerId || undefined,
      stripeSubscriptionId: updatedBilling.stripeSubscriptionId || undefined,
      usage: updatedBilling.usage,
      monthlyLimit: updatedBilling.monthlyLimit,
      nextBillingDate: updatedBilling.nextBillingDate || undefined,
      createdAt: updatedBilling.createdAt,
      updatedAt: updatedBilling.updatedAt,
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, userId }, 'Failed to track usage');
    throw new Error('Failed to track usage');
  }
}

/**
 * Check if user has exceeded their monthly usage limit
 * @param userId - User ID to check
 * @returns True if usage exceeds limit, false otherwise
 * @throws NotFoundError if billing not found
 */
export async function isUsageLimitExceeded(userId: string): Promise<boolean> {
  try {
    const billing = await prisma.billing.findUnique({
      where: { userId },
    });

    if (!billing) {
      logger.warn({ userId }, 'Billing record not found for limit check');
      throw new NotFoundError('Billing');
    }

    const exceeded = billing.usage >= billing.monthlyLimit;

    if (exceeded) {
      logger.warn(
        { userId, usage: billing.usage, limit: billing.monthlyLimit },
        'Usage limit exceeded'
      );
    }

    return exceeded;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, userId }, 'Failed to check usage limit');
    throw new Error('Failed to check usage limit');
  }
}

/**
 * Reset monthly usage counter (typically called at start of billing period)
 * @param userId - User ID to reset usage for
 * @returns Updated billing information with reset usage
 * @throws NotFoundError if billing not found
 */
export async function resetMonthlyUsage(userId: string): Promise<BillingInfo> {
  try {
    const billing = await prisma.billing.findUnique({
      where: { userId },
    });

    if (!billing) {
      logger.warn({ userId }, 'Billing record not found for usage reset');
      throw new NotFoundError('Billing');
    }

    const updatedBilling = await prisma.billing.update({
      where: { userId },
      data: {
        usage: 0,
      },
    });

    logger.info({ userId }, 'Monthly usage reset successfully');

    return {
      id: updatedBilling.id,
      userId: updatedBilling.userId,
      plan: updatedBilling.plan as BillingPlan,
      stripeCustomerId: updatedBilling.stripeCustomerId || undefined,
      stripeSubscriptionId: updatedBilling.stripeSubscriptionId || undefined,
      usage: updatedBilling.usage,
      monthlyLimit: updatedBilling.monthlyLimit,
      nextBillingDate: updatedBilling.nextBillingDate || undefined,
      createdAt: updatedBilling.createdAt,
      updatedAt: updatedBilling.updatedAt,
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, userId }, 'Failed to reset monthly usage');
    throw new Error('Failed to reset monthly usage');
  }
}

/**
 * Get plan configuration
 * @param plan - Billing plan to get config for
 * @returns Plan configuration with limits and pricing
 */
export function getPlanConfig(plan: BillingPlan): PlanConfig {
  return PLAN_CONFIG[plan];
}
