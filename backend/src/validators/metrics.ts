import { z } from 'zod';

/**
 * Zod schema for metrics query parameters
 */
export const metricsQuerySchema = z.object({
  projectId: z.string().uuid('Invalid project ID format'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type MetricsQueryInput = z.infer<typeof metricsQuerySchema>;

/**
 * Zod schema for project ID parameter
 */
export const projectIdSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
});

export type ProjectIdParam = z.infer<typeof projectIdSchema>;
