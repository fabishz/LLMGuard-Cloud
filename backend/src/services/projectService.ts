import prisma from '../config/database.js';
import { generateApiKey, hashApiKey, verifyApiKey } from '../utils/crypto.js';
import { NotFoundError, AuthorizationError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Create project request payload
 */
export interface CreateProjectRequest {
  name: string;
}

/**
 * Project response with metadata
 */
export interface ProjectResponse {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Project with API key (returned only on creation)
 */
export interface ProjectWithApiKey extends ProjectResponse {
  apiKey: string;
}

/**
 * API key response
 */
export interface ApiKeyResponse {
  id: string;
  projectId: string;
  createdAt: Date;
  rotatedAt?: Date;
}

/**
 * API key with unhashed value (returned only on creation/rotation)
 */
export interface ApiKeyWithValue extends ApiKeyResponse {
  apiKey: string;
}

/**
 * Create a new project with API key
 * @param userId - User ID creating the project
 * @param request - Create project request with name
 * @returns Project with unhashed API key (key returned only once)
 * @throws ValidationError if input is invalid
 * @throws Error if project creation fails
 */
export async function createProject(userId: string, request: CreateProjectRequest): Promise<ProjectWithApiKey> {
  const { name } = request;

  // Validate project name
  if (!name || name.trim().length === 0) {
    logger.warn({ userId }, 'Invalid project name');
    throw new ValidationError('Project name is required', { field: 'name' });
  }

  if (name.length > 255) {
    logger.warn({ userId, nameLength: name.length }, 'Project name too long');
    throw new ValidationError('Project name must be less than 255 characters', { field: 'name' });
  }

  try {
    // Generate API key
    const apiKey = generateApiKey();
    const apiKeyHash = await hashApiKey(apiKey);

    // Create project with API key
    const project = await prisma.project.create({
      data: {
        userId,
        name: name.trim(),
        apiKeyHash,
      },
    });

    // Create project settings with defaults
    await prisma.projectSettings.create({
      data: {
        projectId: project.id,
        preferredModel: 'gpt-4',
        safetyThreshold: 80,
        rateLimit: 100,
      },
    });

    logger.info({ userId, projectId: project.id, projectName: project.name }, 'Project created successfully');

    return {
      id: project.id,
      userId: project.userId,
      name: project.name,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      apiKey,
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    logger.error({ error, userId }, 'Failed to create project');
    throw new Error('Failed to create project');
  }
}

/**
 * Get a single project by ID
 * @param userId - User ID requesting the project
 * @param projectId - Project ID to retrieve
 * @returns Project details
 * @throws NotFoundError if project not found
 * @throws AuthorizationError if user doesn't own the project
 */
export async function getProject(userId: string, projectId: string): Promise<ProjectResponse> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      logger.warn({ userId, projectId }, 'Project not found');
      throw new NotFoundError('Project');
    }

    // Check authorization
    if (project.userId !== userId) {
      logger.warn({ userId, projectId, ownerId: project.userId }, 'Unauthorized project access');
      throw new AuthorizationError('You do not have access to this project');
    }

    return {
      id: project.id,
      userId: project.userId,
      name: project.name,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    logger.error({ error, userId, projectId }, 'Failed to get project');
    throw new Error('Failed to get project');
  }
}

/**
 * List all projects for a user
 * @param userId - User ID to list projects for
 * @returns Array of projects
 */
export async function listProjects(userId: string): Promise<ProjectResponse[]> {
  try {
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    logger.info({ userId, projectCount: projects.length }, 'Projects listed successfully');

    return projects.map((project: typeof projects[0]) => ({
      id: project.id,
      userId: project.userId,
      name: project.name,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }));
  } catch (error) {
    logger.error({ error, userId }, 'Failed to list projects');
    throw new Error('Failed to list projects');
  }
}

/**
 * Delete a project
 * @param userId - User ID deleting the project
 * @param projectId - Project ID to delete
 * @throws NotFoundError if project not found
 * @throws AuthorizationError if user doesn't own the project
 */
export async function deleteProject(userId: string, projectId: string): Promise<void> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      logger.warn({ userId, projectId }, 'Project not found for deletion');
      throw new NotFoundError('Project');
    }

    // Check authorization
    if (project.userId !== userId) {
      logger.warn({ userId, projectId, ownerId: project.userId }, 'Unauthorized project deletion');
      throw new AuthorizationError('You do not have access to this project');
    }

    // Delete project (cascades to related records)
    await prisma.project.delete({
      where: { id: projectId },
    });

    logger.info({ userId, projectId }, 'Project deleted successfully');
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    logger.error({ error, userId, projectId }, 'Failed to delete project');
    throw new Error('Failed to delete project');
  }
}

/**
 * Create a new API key for a project
 * @param userId - User ID creating the API key
 * @param projectId - Project ID to create API key for
 * @returns API key with unhashed value (returned only once)
 * @throws NotFoundError if project not found
 * @throws AuthorizationError if user doesn't own the project
 */
export async function createApiKey(userId: string, projectId: string): Promise<ApiKeyWithValue> {
  try {
    // Verify project exists and user owns it
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      logger.warn({ userId, projectId }, 'Project not found for API key creation');
      throw new NotFoundError('Project');
    }

    if (project.userId !== userId) {
      logger.warn({ userId, projectId, ownerId: project.userId }, 'Unauthorized API key creation');
      throw new AuthorizationError('You do not have access to this project');
    }

    // Generate new API key
    const apiKey = generateApiKey();
    const apiKeyHash = await hashApiKey(apiKey);

    // Create API key record
    const apiKeyRecord = await prisma.apiKey.create({
      data: {
        projectId,
        keyHash: apiKeyHash,
      },
    });

    logger.info({ userId, projectId, apiKeyId: apiKeyRecord.id }, 'API key created successfully');

    return {
      id: apiKeyRecord.id,
      projectId: apiKeyRecord.projectId,
      createdAt: apiKeyRecord.createdAt,
      rotatedAt: apiKeyRecord.rotatedAt || undefined,
      apiKey,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    logger.error({ error, userId, projectId }, 'Failed to create API key');
    throw new Error('Failed to create API key');
  }
}

/**
 * Rotate (replace) an API key
 * @param userId - User ID rotating the API key
 * @param projectId - Project ID
 * @param apiKeyId - API key ID to rotate
 * @returns New API key with unhashed value (returned only once)
 * @throws NotFoundError if project or API key not found
 * @throws AuthorizationError if user doesn't own the project
 */
export async function rotateApiKey(userId: string, projectId: string, apiKeyId: string): Promise<ApiKeyWithValue> {
  try {
    // Verify project exists and user owns it
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      logger.warn({ userId, projectId }, 'Project not found for API key rotation');
      throw new NotFoundError('Project');
    }

    if (project.userId !== userId) {
      logger.warn({ userId, projectId, ownerId: project.userId }, 'Unauthorized API key rotation');
      throw new AuthorizationError('You do not have access to this project');
    }

    // Verify API key exists and belongs to project
    const existingApiKey = await prisma.apiKey.findUnique({
      where: { id: apiKeyId },
    });

    if (!existingApiKey || existingApiKey.projectId !== projectId) {
      logger.warn({ userId, projectId, apiKeyId }, 'API key not found or does not belong to project');
      throw new NotFoundError('API key');
    }

    // Generate new API key
    const newApiKey = generateApiKey();
    const newApiKeyHash = await hashApiKey(newApiKey);

    // Update API key with new hash and rotation timestamp
    const rotatedApiKey = await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: {
        keyHash: newApiKeyHash,
        rotatedAt: new Date(),
      },
    });

    logger.info({ userId, projectId, apiKeyId }, 'API key rotated successfully');

    return {
      id: rotatedApiKey.id,
      projectId: rotatedApiKey.projectId,
      createdAt: rotatedApiKey.createdAt,
      rotatedAt: rotatedApiKey.rotatedAt || undefined,
      apiKey: newApiKey,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    logger.error({ error, userId, projectId, apiKeyId }, 'Failed to rotate API key');
    throw new Error('Failed to rotate API key');
  }
}

/**
 * Delete an API key
 * @param userId - User ID deleting the API key
 * @param projectId - Project ID
 * @param apiKeyId - API key ID to delete
 * @throws NotFoundError if project or API key not found
 * @throws AuthorizationError if user doesn't own the project
 */
export async function deleteApiKey(userId: string, projectId: string, apiKeyId: string): Promise<void> {
  try {
    // Verify project exists and user owns it
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      logger.warn({ userId, projectId }, 'Project not found for API key deletion');
      throw new NotFoundError('Project');
    }

    if (project.userId !== userId) {
      logger.warn({ userId, projectId, ownerId: project.userId }, 'Unauthorized API key deletion');
      throw new AuthorizationError('You do not have access to this project');
    }

    // Verify API key exists and belongs to project
    const existingApiKey = await prisma.apiKey.findUnique({
      where: { id: apiKeyId },
    });

    if (!existingApiKey || existingApiKey.projectId !== projectId) {
      logger.warn({ userId, projectId, apiKeyId }, 'API key not found or does not belong to project');
      throw new NotFoundError('API key');
    }

    // Delete API key
    await prisma.apiKey.delete({
      where: { id: apiKeyId },
    });

    logger.info({ userId, projectId, apiKeyId }, 'API key deleted successfully');
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    logger.error({ error, userId, projectId, apiKeyId }, 'Failed to delete API key');
    throw new Error('Failed to delete API key');
  }
}

/**
 * Validate an API key and return the project it belongs to
 * @param apiKey - Plain text API key to validate
 * @returns Project ID if valid
 * @throws Error if API key is invalid
 */
export async function validateApiKey(apiKey: string): Promise<string> {
  try {
    // Find all API keys (we need to check each one since they're hashed)
    const apiKeys = await prisma.apiKey.findMany({
      include: { project: true },
    });

    for (const keyRecord of apiKeys) {
      const isValid = await verifyApiKey(apiKey, keyRecord.keyHash);
      if (isValid) {
        logger.debug({ projectId: keyRecord.projectId }, 'API key validated successfully');
        return keyRecord.projectId;
      }
    }

    logger.warn('Invalid API key provided');
    throw new Error('Invalid API key');
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid API key') {
      throw error;
    }
    logger.error({ error }, 'Failed to validate API key');
    throw new Error('Failed to validate API key');
  }
}

/**
 * Get API key by ID (without unhashed value)
 * @param userId - User ID requesting the API key
 * @param projectId - Project ID
 * @param apiKeyId - API key ID to retrieve
 * @returns API key details
 * @throws NotFoundError if project or API key not found
 * @throws AuthorizationError if user doesn't own the project
 */
export async function getApiKey(userId: string, projectId: string, apiKeyId: string): Promise<ApiKeyResponse> {
  try {
    // Verify project exists and user owns it
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      logger.warn({ userId, projectId }, 'Project not found for API key retrieval');
      throw new NotFoundError('Project');
    }

    if (project.userId !== userId) {
      logger.warn({ userId, projectId, ownerId: project.userId }, 'Unauthorized API key retrieval');
      throw new AuthorizationError('You do not have access to this project');
    }

    // Get API key
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: apiKeyId },
    });

    if (!apiKey || apiKey.projectId !== projectId) {
      logger.warn({ userId, projectId, apiKeyId }, 'API key not found or does not belong to project');
      throw new NotFoundError('API key');
    }

    return {
      id: apiKey.id,
      projectId: apiKey.projectId,
      createdAt: apiKey.createdAt,
      rotatedAt: apiKey.rotatedAt || undefined,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    logger.error({ error, userId, projectId, apiKeyId }, 'Failed to get API key');
    throw new Error('Failed to get API key');
  }
}

/**
 * List all API keys for a project
 * @param userId - User ID requesting the API keys
 * @param projectId - Project ID to list API keys for
 * @returns Array of API keys (without unhashed values)
 * @throws NotFoundError if project not found
 * @throws AuthorizationError if user doesn't own the project
 */
export async function listApiKeys(userId: string, projectId: string): Promise<ApiKeyResponse[]> {
  try {
    // Verify project exists and user owns it
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      logger.warn({ userId, projectId }, 'Project not found for API key listing');
      throw new NotFoundError('Project');
    }

    if (project.userId !== userId) {
      logger.warn({ userId, projectId, ownerId: project.userId }, 'Unauthorized API key listing');
      throw new AuthorizationError('You do not have access to this project');
    }

    // Get all API keys for project
    const apiKeys = await prisma.apiKey.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    logger.info({ userId, projectId, keyCount: apiKeys.length }, 'API keys listed successfully');

    return apiKeys.map((key: typeof apiKeys[0]) => ({
      id: key.id,
      projectId: key.projectId,
      createdAt: key.createdAt,
      rotatedAt: key.rotatedAt || undefined,
    }));
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    logger.error({ error, userId, projectId }, 'Failed to list API keys');
    throw new Error('Failed to list API keys');
  }
}
