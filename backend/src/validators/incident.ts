import { z } from 'zod';

/**
 * Zod schema for incident ID parameter
 */
export const incidentIdSchema = z.object({
  incidentId: z.string().min(1, 'Invalid incident ID format'),
});

export type IncidentIdParam = z.infer<typeof incidentIdSchema>;

/**
 * Zod schema for incident ID with project ID parameter
 */
export const incidentWithProjectIdSchema = z.object({
  projectId: z.string().min(1, 'Invalid project ID format'),
  incidentId: z.string().min(1, 'Invalid incident ID format'),
});

export type IncidentWithProjectIdParam = z.infer<typeof incidentWithProjectIdSchema>;

/**
 * Zod schema for listing incidents with optional filters
 */
export const listIncidentsSchema = z.object({
  status: z.enum(['open', 'resolved']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  page: z.coerce.number().int().min(1).default(1),
});

export type ListIncidentsInput = z.infer<typeof listIncidentsSchema>;

/**
 * Zod schema for resolving an incident
 */
export const resolveIncidentSchema = z.object({
  // Empty body - just needs to be a valid request
});

export type ResolveIncidentInput = z.infer<typeof resolveIncidentSchema>;
