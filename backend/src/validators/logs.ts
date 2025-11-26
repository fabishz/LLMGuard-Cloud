import { z } from 'zod';

/**
 * Zod schema for querying logs
 * Requirements: 7.1, 7.2, 7.3
 */
export const queryLogsSchema = z.object({
  search: z.string().optional(),
  model: z.string().optional(),
  minRiskScore: z.coerce
    .number()
    .min(0, 'Min risk score must be at least 0')
    .max(100, 'Min risk score must be at most 100')
    .optional(),
  maxRiskScore: z.coerce
    .number()
    .min(0, 'Max risk score must be at least 0')
    .max(100, 'Max risk score must be at most 100')
    .optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['timestamp', 'latency', 'riskScore']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce
    .number()
    .min(1, 'Limit must be at least 1')
    .max(1000, 'Limit must be at most 1000')
    .default(100),
  page: z.coerce.number().min(1, 'Page must be at least 1').default(1),
});

export type QueryLogsInput = z.infer<typeof queryLogsSchema>;

/**
 * Zod schema for searching logs
 */
export const searchLogsSchema = z.object({
  search: z.string().min(1, 'Search term is required').max(1000, 'Search term must be less than 1000 characters'),
  limit: z.coerce
    .number()
    .min(1, 'Limit must be at least 1')
    .max(1000, 'Limit must be at most 1000')
    .default(100),
});

export type SearchLogsInput = z.infer<typeof searchLogsSchema>;

/**
 * Zod schema for filtering logs by model
 */
export const filterByModelSchema = z.object({
  model: z.string().min(1, 'Model is required').max(255, 'Model must be less than 255 characters'),
  limit: z.coerce
    .number()
    .min(1, 'Limit must be at least 1')
    .max(1000, 'Limit must be at most 1000')
    .default(100),
});

export type FilterByModelInput = z.infer<typeof filterByModelSchema>;

/**
 * Zod schema for filtering logs by risk score
 */
export const filterByRiskScoreSchema = z.object({
  minScore: z.coerce
    .number()
    .min(0, 'Min score must be at least 0')
    .max(100, 'Min score must be at most 100')
    .default(0),
  maxScore: z.coerce
    .number()
    .min(0, 'Max score must be at least 0')
    .max(100, 'Max score must be at most 100')
    .default(100),
  limit: z.coerce
    .number()
    .min(1, 'Limit must be at least 1')
    .max(1000, 'Limit must be at most 1000')
    .default(100),
});

export type FilterByRiskScoreInput = z.infer<typeof filterByRiskScoreSchema>;

/**
 * Zod schema for filtering logs by date range
 */
export const filterByDateRangeSchema = z.object({
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  limit: z.coerce
    .number()
    .min(1, 'Limit must be at least 1')
    .max(1000, 'Limit must be at most 1000')
    .default(100),
});

export type FilterByDateRangeInput = z.infer<typeof filterByDateRangeSchema>;

/**
 * Zod schema for sorting logs
 */
export const sortLogsSchema = z.object({
  sortBy: z.enum(['timestamp', 'latency', 'riskScore']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce
    .number()
    .min(1, 'Limit must be at least 1')
    .max(1000, 'Limit must be at most 1000')
    .default(100),
});

export type SortLogsInput = z.infer<typeof sortLogsSchema>;

/**
 * Zod schema for log ID parameter
 */
export const logIdSchema = z.object({
  logId: z.string().cuid('Invalid log ID format'),
});

export type LogIdParam = z.infer<typeof logIdSchema>;
