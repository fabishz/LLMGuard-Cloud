import { z } from 'zod';

/**
 * Zod schema for checkout request
 * Requirements: 9.1
 */
export const checkoutRequestSchema = z.object({
  plan: z.enum(['pro', 'enterprise'], {
    errorMap: () => ({ message: 'Plan must be either "pro" or "enterprise"' }),
  }),
  successUrl: z.string().url('Success URL must be a valid URL'),
  cancelUrl: z.string().url('Cancel URL must be a valid URL'),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

/**
 * Zod schema for billing portal request
 * Requirements: 9.3
 */
export const billingPortalRequestSchema = z.object({
  returnUrl: z.string().url('Return URL must be a valid URL'),
});

export type BillingPortalRequest = z.infer<typeof billingPortalRequestSchema>;

/**
 * Zod schema for invoices query parameters
 * Requirements: 9.4
 */
export const invoicesQuerySchema = z.object({
  limit: z.coerce
    .number()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be at most 100')
    .default(10)
    .optional(),
});

export type InvoicesQuery = z.infer<typeof invoicesQuerySchema>;
