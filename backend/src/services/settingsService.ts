import prisma from '../config/database.js';
import { NotFoundError, AuthorizationError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * User profile response
 */
export interface UserProfileResponse {
  id: string;
  email: string;
  name?: string;
  role: string;
  createdAt: Date;
}

/**
 * User profile update request
 */
export interface UpdateUserProfileRequest {
  name?: string;
}

/**
 * Project settings response
 */
export interface ProjectSettingsResponse {
  id: string;
  projectId: string;
  preferredModel: string;
  safetyThreshold: number;
  rateLimit: number;
  systemPrompt?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Project settings update request
 */
export interface UpdateProjectSettingsRequest {
  preferredModel?: string;
  safetyThreshold?: number;
  rateLimit?: number;
  systemPrompt?: string;
  metadata?: Record<string, any>;
}

/**
 * Get user profile settings
 * @param userId - User ID to retrieve profile for
 * @returns User profile information
 * @throws NotFoundError if user not found
 */
export async function getUserProfile(userId: string): Promise<UserProfileResponse> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      logger.warn({ userId }, 'User not found');
      throw new NotFoundError('User');
    }

    logger.info({ userId }, 'User profile retrieved successfully');

    return {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role,
      createdAt: user.createdAt,
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, userId }, 'Failed to get user profile');
    throw new Error('Failed to get user profile');
  }
}

/**
 * Update user profile settings
 * @param userId - User ID to update
 * @param request - Update request with optional name
 * @returns Updated user profile
 * @throws NotFoundError if user not found
 * @throws ValidationError if input is invalid
 */
export async function updateUserProfile(
  userId: string,
  request: UpdateUserProfileRequest
): Promise<UserProfileResponse> {
  const { name } = request;

  // Validate name if provided
  if (name !== undefined) {
    if (typeof name !== 'string') {
      logger.warn({ userId }, 'Invalid name type');
      throw new ValidationError('Name must be a string', { field: 'name' });
    }

    if (name.length > 255) {
      logger.warn({ userId, nameLength: name.length }, 'Name too long');
      throw new ValidationError('Name must be less than 255 characters', { field: 'name' });
    }
  }

  try {
    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name !== undefined ? name : undefined,
      },
    });

    // Update user settings
    await prisma.userSettings.update({
      where: { userId },
      data: {
        name: user.name,
      },
    });

    logger.info({ userId }, 'User profile updated successfully');

    return {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role,
      createdAt: user.createdAt,
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('An operation failed because it depends on one or more records that were required but not found')) {
      logger.warn({ userId }, 'User not found for update');
      throw new NotFoundError('User');
    }
    logger.error({ error, userId }, 'Failed to update user profile');
    throw new Error('Failed to update user profile');
  }
}

/**
 * Get project settings
 * @param userId - User ID requesting the settings
 * @param projectId - Project ID to retrieve settings for
 * @returns Project settings
 * @throws NotFoundError if project or settings not found
 * @throws AuthorizationError if user doesn't own the project
 */
export async function getProjectSettings(userId: string, projectId: string): Promise<ProjectSettingsResponse> {
  try {
    // Verify project exists and user owns it
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      logger.warn({ userId, projectId }, 'Project not found');
      throw new NotFoundError('Project');
    }

    if (project.userId !== userId) {
      logger.warn({ userId, projectId, ownerId: project.userId }, 'Unauthorized project settings access');
      throw new AuthorizationError('You do not have access to this project');
    }

    // Get project settings
    const settings = await prisma.projectSettings.findUnique({
      where: { projectId },
    });

    if (!settings) {
      logger.warn({ userId, projectId }, 'Project settings not found');
      throw new NotFoundError('Project settings');
    }

    logger.info({ userId, projectId }, 'Project settings retrieved successfully');

    return {
      id: settings.id,
      projectId: settings.projectId,
      preferredModel: settings.preferredModel,
      safetyThreshold: settings.safetyThreshold,
      rateLimit: settings.rateLimit,
      systemPrompt: settings.systemPrompt || undefined,
      metadata: settings.metadata as Record<string, any>,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    logger.error({ error, userId, projectId }, 'Failed to get project settings');
    throw new Error('Failed to get project settings');
  }
}

/**
 * Update project settings
 * @param userId - User ID updating the settings
 * @param projectId - Project ID to update settings for
 * @param request - Update request with optional settings fields
 * @returns Updated project settings
 * @throws NotFoundError if project or settings not found
 * @throws AuthorizationError if user doesn't own the project
 * @throws ValidationError if input is invalid
 */
export async function updateProjectSettings(
  userId: string,
  projectId: string,
  request: UpdateProjectSettingsRequest
): Promise<ProjectSettingsResponse> {
  const { preferredModel, safetyThreshold, rateLimit, systemPrompt, metadata } = request;

  // Validate inputs
  if (preferredModel !== undefined) {
    if (typeof preferredModel !== 'string' || preferredModel.trim().length === 0) {
      logger.warn({ userId, projectId }, 'Invalid preferred model');
      throw new ValidationError('Preferred model must be a non-empty string', { field: 'preferredModel' });
    }
  }

  if (safetyThreshold !== undefined) {
    if (typeof safetyThreshold !== 'number' || safetyThreshold < 0 || safetyThreshold > 100) {
      logger.warn({ userId, projectId, safetyThreshold }, 'Invalid safety threshold');
      throw new ValidationError('Safety threshold must be a number between 0 and 100', { field: 'safetyThreshold' });
    }
  }

  if (rateLimit !== undefined) {
    if (typeof rateLimit !== 'number' || rateLimit < 1) {
      logger.warn({ userId, projectId, rateLimit }, 'Invalid rate limit');
      throw new ValidationError('Rate limit must be a positive number', { field: 'rateLimit' });
    }
  }

  if (systemPrompt !== undefined) {
    if (typeof systemPrompt !== 'string') {
      logger.warn({ userId, projectId }, 'Invalid system prompt type');
      throw new ValidationError('System prompt must be a string', { field: 'systemPrompt' });
    }

    if (systemPrompt.length > 5000) {
      logger.warn({ userId, projectId, promptLength: systemPrompt.length }, 'System prompt too long');
      throw new ValidationError('System prompt must be less than 5000 characters', { field: 'systemPrompt' });
    }
  }

  if (metadata !== undefined) {
    if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
      logger.warn({ userId, projectId }, 'Invalid metadata type');
      throw new ValidationError('Metadata must be an object', { field: 'metadata' });
    }
  }

  try {
    // Verify project exists and user owns it
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      logger.warn({ userId, projectId }, 'Project not found for settings update');
      throw new NotFoundError('Project');
    }

    if (project.userId !== userId) {
      logger.warn({ userId, projectId, ownerId: project.userId }, 'Unauthorized project settings update');
      throw new AuthorizationError('You do not have access to this project');
    }

    // Verify settings exist
    const existingSettings = await prisma.projectSettings.findUnique({
      where: { projectId },
    });

    if (!existingSettings) {
      logger.warn({ userId, projectId }, 'Project settings not found for update');
      throw new NotFoundError('Project settings');
    }

    // Build update data
    const updateData: any = {};
    if (preferredModel !== undefined) updateData.preferredModel = preferredModel.trim();
    if (safetyThreshold !== undefined) updateData.safetyThreshold = safetyThreshold;
    if (rateLimit !== undefined) updateData.rateLimit = rateLimit;
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt || null;
    if (metadata !== undefined) updateData.metadata = metadata;

    // Update project settings
    const settings = await prisma.projectSettings.update({
      where: { projectId },
      data: updateData,
    });

    logger.info({ userId, projectId }, 'Project settings updated successfully');

    return {
      id: settings.id,
      projectId: settings.projectId,
      preferredModel: settings.preferredModel,
      safetyThreshold: settings.safetyThreshold,
      rateLimit: settings.rateLimit,
      systemPrompt: settings.systemPrompt || undefined,
      metadata: settings.metadata as Record<string, any>,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError || error instanceof ValidationError) {
      throw error;
    }
    logger.error({ error, userId, projectId }, 'Failed to update project settings');
    throw new Error('Failed to update project settings');
  }
}
