import { z } from 'zod';

/**
 * Zod schema for logging an LLM request
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export const logLLMRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(50000, 'Prompt must be less than 50000 characters'),
  response: z.string().min(1, 'Response is required').max(100000, 'Response must be less than 100000 characters'),
  model: z.string().min(1, 'Model is required').max(255, 'Model must be less than 255 characters'),
  latency: z.number().min(0, 'Latency must be non-negative').max(600000, 'Latency must be less than 600000ms'),
  tokens: z.number().min(0, 'Tokens must be non-negative').max(1000000, 'Tokens must be less than 1000000'),
  error: z.string().optional(),
});

export type LogLLMRequestInput = z.infer<typeof logLLMRequestSchema>;

/**
 * Zod schema for querying LLM requests
 * Requirements: 7.1, 7.2, 7.3
 */
export const queryLLMRequestsSchema = z.object({
  limit: z.coerce.number().min(1, 'Limit must be at least 1').max(1000, 'Limit must be at most 1000').default(100),
  page: z.coerce.number().min(1, 'Page must be at least 1').default(1),
  model: z.string().optional(),
  minRiskScore: z.coerce.number().min(0, 'Min risk score must be at least 0').max(100, 'Min risk score must be at most 100').optional(),
  maxRiskScore: z.coerce.number().min(0, 'Max risk score must be at least 0').max(100, 'Max risk score must be at most 100').optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['timestamp', 'latency', 'riskScore']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type QueryLLMRequestsInput = z.infer<typeof queryLLMRequestsSchema>;

/**
 * Zod schema for request ID parameter
 */
export const requestIdSchema = z.object({
  requestId: z.string().uuid('Invalid request ID format'),
});

export type RequestIdParam = z.infer<typeof requestIdSchema>;
