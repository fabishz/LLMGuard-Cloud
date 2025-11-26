import Stripe from 'stripe';
import env from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Stripe checkout session data
 */
export interface CheckoutSessionData {
  sessionId: string;
  url: string;
}

/**
 * Stripe billing portal session data
 */
export interface BillingPortalSessionData {
  url: string;
}

/**
 * Stripe subscription event data
 */
export interface SubscriptionEventData {
  customerId: string;
  subscriptionId: string;
  status: string;
  plan: string;
  currentPeriodEnd: Date;
}

/**
 * Initialize Stripe client
 */
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

/**
 * Create a Stripe checkout session for a billing plan
 * 
 * @param customerId - Stripe customer ID
 * @param plan - Billing plan ('pro' or 'enterprise')
 * @param successUrl - URL to redirect to on successful checkout
 * @param cancelUrl - URL to redirect to on cancelled checkout
 * @returns Checkout session data with session ID and URL
 */
export async function createCheckoutSession(
  customerId: string,
  plan: 'pro' | 'enterprise',
  successUrl: string,
  cancelUrl: string
): Promise<CheckoutSessionData> {
  try {
    logger.debug({ customerId, plan }, 'Creating Stripe checkout session');

    // Define price IDs for each plan (these should be configured in Stripe dashboard)
    const priceIds: Record<string, string> = {
      pro: process.env.STRIPE_PRICE_ID_PRO || 'price_pro_placeholder',
      enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || 'price_enterprise_placeholder',
    };

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceIds[plan],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: 'required',
    });

    if (!session.id || !session.url) {
      throw new Error('Failed to create checkout session: missing session ID or URL');
    }

    logger.info(
      { customerId, plan, sessionId: session.id },
      'Checkout session created successfully'
    );

    return {
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    logger.error(
      { error, customerId, plan },
      'Error creating Stripe checkout session'
    );
    throw error;
  }
}

/**
 * Create a Stripe billing portal session for a customer
 * Allows customers to manage their subscription and billing information
 * 
 * @param customerId - Stripe customer ID
 * @param returnUrl - URL to redirect to when customer exits the portal
 * @returns Billing portal session URL
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<BillingPortalSessionData> {
  try {
    logger.debug({ customerId }, 'Creating Stripe billing portal session');

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    if (!session.url) {
      throw new Error('Failed to create billing portal session: missing URL');
    }

    logger.info(
      { customerId, sessionId: session.id },
      'Billing portal session created successfully'
    );

    return {
      url: session.url,
    };
  } catch (error) {
    logger.error(
      { error, customerId },
      'Error creating Stripe billing portal session'
    );
    throw error;
  }
}

/**
 * Create a Stripe customer
 * 
 * @param email - Customer email
 * @param name - Customer name (optional)
 * @returns Stripe customer ID
 */
export async function createCustomer(
  email: string,
  name?: string
): Promise<string> {
  try {
    logger.debug({ email }, 'Creating Stripe customer');

    const customer = await stripe.customers.create({
      email,
      name,
    });

    logger.info({ customerId: customer.id, email }, 'Stripe customer created');

    return customer.id;
  } catch (error) {
    logger.error({ error, email }, 'Error creating Stripe customer');
    throw error;
  }
}

/**
 * Retrieve a Stripe customer
 * 
 * @param customerId - Stripe customer ID
 * @returns Stripe customer object
 */
export async function getCustomer(customerId: string): Promise<Stripe.Customer> {
  try {
    logger.debug({ customerId }, 'Retrieving Stripe customer');

    const customer = await stripe.customers.retrieve(customerId);

    return customer as Stripe.Customer;
  } catch (error) {
    logger.error({ error, customerId }, 'Error retrieving Stripe customer');
    throw error;
  }
}

/**
 * Retrieve subscription details
 * 
 * @param subscriptionId - Stripe subscription ID
 * @returns Stripe subscription object
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  try {
    logger.debug({ subscriptionId }, 'Retrieving Stripe subscription');

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    return subscription;
  } catch (error) {
    logger.error({ error, subscriptionId }, 'Error retrieving Stripe subscription');
    throw error;
  }
}

/**
 * Update a subscription (for plan changes)
 * 
 * @param subscriptionId - Stripe subscription ID
 * @param priceId - New price ID for the plan
 * @returns Updated subscription object
 */
export async function updateSubscription(
  subscriptionId: string,
  priceId: string
): Promise<Stripe.Subscription> {
  try {
    logger.debug({ subscriptionId, priceId }, 'Updating Stripe subscription');

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: (await stripe.subscriptions.retrieve(subscriptionId)).items.data[0].id,
          price: priceId,
        },
      ],
    });

    logger.info({ subscriptionId }, 'Subscription updated successfully');

    return subscription;
  } catch (error) {
    logger.error(
      { error, subscriptionId, priceId },
      'Error updating Stripe subscription'
    );
    throw error;
  }
}

/**
 * Cancel a subscription
 * 
 * @param subscriptionId - Stripe subscription ID
 * @returns Cancelled subscription object
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  try {
    logger.debug({ subscriptionId }, 'Cancelling Stripe subscription');

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    logger.info({ subscriptionId }, 'Subscription cancelled successfully');

    return subscription;
  } catch (error) {
    logger.error({ error, subscriptionId }, 'Error cancelling Stripe subscription');
    throw error;
  }
}

/**
 * List invoices for a customer
 * 
 * @param customerId - Stripe customer ID
 * @param limit - Maximum number of invoices to return (default: 10)
 * @returns Array of invoice objects
 */
export async function listInvoices(
  customerId: string,
  limit: number = 10
): Promise<Stripe.Invoice[]> {
  try {
    logger.debug({ customerId, limit }, 'Listing Stripe invoices');

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data;
  } catch (error) {
    logger.error({ error, customerId }, 'Error listing Stripe invoices');
    throw error;
  }
}

/**
 * Retrieve an invoice
 * 
 * @param invoiceId - Stripe invoice ID
 * @returns Invoice object
 */
export async function getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
  try {
    logger.debug({ invoiceId }, 'Retrieving Stripe invoice');

    const invoice = await stripe.invoices.retrieve(invoiceId);

    return invoice;
  } catch (error) {
    logger.error({ error, invoiceId }, 'Error retrieving Stripe invoice');
    throw error;
  }
}

/**
 * Construct a Stripe event from webhook payload and signature
 * This validates the webhook signature and returns the event
 * 
 * @param body - Raw request body as string
 * @param signature - Stripe-Signature header value
 * @returns Stripe event object
 */
export function constructWebhookEvent(
  body: string,
  signature: string
): Stripe.Event {
  try {
    logger.debug('Constructing Stripe webhook event');

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );

    logger.debug({ eventType: event.type }, 'Stripe webhook event constructed');

    return event;
  } catch (error) {
    logger.error({ error }, 'Error constructing Stripe webhook event');
    throw error;
  }
}

/**
 * Extract subscription event data from a Stripe event
 * 
 * @param event - Stripe event object
 * @returns Subscription event data
 */
export function extractSubscriptionEventData(
  event: Stripe.Event
): SubscriptionEventData | null {
  try {
    const subscription = event.data.object as Stripe.Subscription;

    if (!subscription.customer || !subscription.id) {
      logger.warn('Invalid subscription data in webhook event');
      return null;
    }

    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

    // Extract plan name from metadata or items
    let plan = 'free';
    if (subscription.items.data.length > 0) {
      const priceId = subscription.items.data[0].price.id;
      if (priceId.includes('pro')) {
        plan = 'pro';
      } else if (priceId.includes('enterprise')) {
        plan = 'enterprise';
      }
    }

    return {
      customerId,
      subscriptionId: subscription.id,
      status: subscription.status,
      plan,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    };
  } catch (error) {
    logger.error({ error }, 'Error extracting subscription event data');
    return null;
  }
}

export default stripe;
