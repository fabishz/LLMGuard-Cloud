import { z } from 'zod';

/**
 * Zod schema for updating user profile
 * Requirements: 8.1, 8.2
 */
export const updateUserProfileSchema = z.object({
  name: z.string().max(255, 'Name must be less than 255 characters').optional(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

/**
 * Zod schema for updating project settings
 * Requirements: 8.3, 8.4
 */
export const updateProjectSettingsSchema = z.object({
  preferredModel: z.string().min(1, 'Preferred model must be a non-empty string').optional(),
  safetyThreshold: z.coerce
    .number()
    .min(0, 'Safety threshold must be at least 0')
    .max(100, 'Safety threshold must be at most 100')
    .optional(),
  rateLimit: z.coerce
    .number()
    .min(1, 'Rate limit must be a positive number')
    .optional(),
  systemPrompt: z.string().max(5000, 'System prompt must be less than 5000 characters').optional(),
  metadata: z.record(z.any()).optional(),
});

export type UpdateProjectSettingsInput = z.infer<typeof updateProjectSettingsSchema>;

/**
 * Zod schema for project ID parameter
 */
export const projectIdSchema = z.object({
  projectId: z.string().cuid('Invalid project ID format'),
});

export type ProjectIdParam = z.infer<typeof projectIdSchema>;
