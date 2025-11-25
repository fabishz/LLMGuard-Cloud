import { z } from 'zod';

/**
 * Zod schema for creating a project
 */
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255, 'Project name must be less than 255 characters'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/**
 * Zod schema for project ID parameter
 */
export const projectIdSchema = z.object({
  projectId: z.string().uuid('Invalid project ID format'),
});

export type ProjectIdParam = z.infer<typeof projectIdSchema>;

/**
 * Zod schema for API key ID parameter
 */
export const apiKeyIdSchema = z.object({
  projectId: z.string().uuid('Invalid project ID format'),
  apiKeyId: z.string().uuid('Invalid API key ID format'),
});

export type ApiKeyIdParam = z.infer<typeof apiKeyIdSchema>;
