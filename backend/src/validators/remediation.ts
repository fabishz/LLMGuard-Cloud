import { z } from 'zod';

/**
 * Zod schema for remediation action types
 */
const remediationActionTypeSchema = z.enum([
  'switch_model',
  'increase_safety_threshold',
  'disable_endpoint',
  'reset_settings',
  'change_system_prompt',
  'rate_limit_user',
]);

/**
 * Zod schema for creating a remediation action
 */
export const createRemediationActionSchema = z.object({
  actionType: remediationActionTypeSchema,
  parameters: z.record(z.any()).refine(
    (params) => Object.keys(params).length > 0,
    'Parameters object must not be empty'
  ),
});

export type CreateRemediationActionInput = z.infer<typeof createRemediationActionSchema>;

/**
 * Zod schema for remediation action ID with incident and project ID parameters
 */
export const remediationActionWithIdsSchema = z.object({
  projectId: z.string().min(1, 'Invalid project ID format'),
  incidentId: z.string().min(1, 'Invalid incident ID format'),
  actionId: z.string().min(1, 'Invalid action ID format'),
});

export type RemediationActionWithIdsParam = z.infer<typeof remediationActionWithIdsSchema>;

/**
 * Zod schema for incident ID with project ID parameter
 */
export const incidentWithProjectIdSchema = z.object({
  projectId: z.string().min(1, 'Invalid project ID format'),
  incidentId: z.string().min(1, 'Invalid incident ID format'),
});

export type IncidentWithProjectIdParam = z.infer<typeof incidentWithProjectIdSchema>;

/**
 * Zod schema for listing remediation actions with optional filters
 */
export const listRemediationActionsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  page: z.coerce.number().int().min(1).default(1),
});

export type ListRemediationActionsInput = z.infer<typeof listRemediationActionsSchema>;

/**
 * Zod schema for applying a remediation action
 */
export const applyRemediationActionSchema = z.object({
  // Empty body - just needs to be a valid request
});

export type ApplyRemediationActionInput = z.infer<typeof applyRemediationActionSchema>;
