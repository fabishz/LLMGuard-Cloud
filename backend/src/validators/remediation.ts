import { z } from 'zod';

/**
 * Zod schema for creating a remediation action
 * Requirements: 5.1, 5.2
 */
export const createRemediationActionSchema = z.object({
  actionType: z.enum([
    'switch_model',
    'increase_safety_threshold',
    'disable_endpoint',
    'reset_settings',
    'change_system_prompt',
    'rate_limit_user',
  ]),
  parameters: z.record(z.any()).optional(),
});

export type CreateRemediationActionInput = z.infer<typeof createRemediationActionSchema>;

/**
 * Zod schema for remediation action ID parameter
 */
export const remediationActionIdSchema = z.object({
  actionId: z.string().uuid('Invalid action ID format'),
});

export type RemediationActionIdParam = z.infer<typeof remediationActionIdSchema>;

/**
 * Zod schema for querying remediation actions
 * Requirements: 5.4
 */
export const queryRemediationActionsSchema = z.object({
  limit: z.coerce.number().min(1, 'Limit must be at least 1').max(1000, 'Limit must be at most 1000').default(50),
  offset: z.coerce.number().min(0, 'Offset must be at least 0').default(0),
});

export type QueryRemediationActionsInput = z.infer<typeof queryRemediationActionsSchema>;
