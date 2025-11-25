import { Request, Response, NextFunction } from 'express';
import * as projectService from '../services/projectService.js';
import { logger } from '../utils/logger.js';

/**
 * Create a new project
 * POST /projects
 * Requirements: 2.1
 */
export async function createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { name } = req.body;

    const project = await projectService.createProject(userId, { name });

    logger.info({ userId, projectId: project.id }, 'Project created successfully');

    res.status(201).json({
      project: {
        id: project.id,
        userId: project.userId,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      apiKey: project.apiKey,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List all projects for authenticated user
 * GET /projects
 * Requirements: 2.2
 */
export async function listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const projects = await projectService.listProjects(userId);

    logger.info({ userId, projectCount: projects.length }, 'Projects listed successfully');

    res.status(200).json({
      projects,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single project by ID
 * GET /projects/:projectId
 * Requirements: 2.2
 */
export async function getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { projectId } = req.params;

    const project = await projectService.getProject(userId, projectId);

    logger.info({ userId, projectId }, 'Project retrieved successfully');

    res.status(200).json({
      project,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a project
 * DELETE /projects/:projectId
 * Requirements: 2.1
 */
export async function deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { projectId } = req.params;

    await projectService.deleteProject(userId, projectId);

    logger.info({ userId, projectId }, 'Project deleted successfully');

    res.status(200).json({
      message: 'Project deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new API key for a project
 * POST /projects/:projectId/api-keys/create
 * Requirements: 2.1, 2.3
 */
export async function createApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { projectId } = req.params;

    const apiKey = await projectService.createApiKey(userId, projectId);

    logger.info({ userId, projectId, apiKeyId: apiKey.id }, 'API key created successfully');

    res.status(201).json({
      apiKey: {
        id: apiKey.id,
        projectId: apiKey.projectId,
        createdAt: apiKey.createdAt,
        rotatedAt: apiKey.rotatedAt,
      },
      key: apiKey.apiKey,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Rotate an API key
 * POST /projects/:projectId/api-keys/:apiKeyId/rotate
 * Requirements: 2.3
 */
export async function rotateApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { projectId, apiKeyId } = req.params;

    const apiKey = await projectService.rotateApiKey(userId, projectId, apiKeyId);

    logger.info({ userId, projectId, apiKeyId }, 'API key rotated successfully');

    res.status(200).json({
      apiKey: {
        id: apiKey.id,
        projectId: apiKey.projectId,
        createdAt: apiKey.createdAt,
        rotatedAt: apiKey.rotatedAt,
      },
      key: apiKey.apiKey,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete an API key
 * DELETE /projects/:projectId/api-keys/:apiKeyId
 * Requirements: 2.4
 */
export async function deleteApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { projectId, apiKeyId } = req.params;

    await projectService.deleteApiKey(userId, projectId, apiKeyId);

    logger.info({ userId, projectId, apiKeyId }, 'API key deleted successfully');

    res.status(200).json({
      message: 'API key deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List all API keys for a project
 * GET /projects/:projectId/api-keys
 * Requirements: 2.3
 */
export async function listApiKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { projectId } = req.params;

    const apiKeys = await projectService.listApiKeys(userId, projectId);

    logger.info({ userId, projectId, keyCount: apiKeys.length }, 'API keys listed successfully');

    res.status(200).json({
      apiKeys,
    });
  } catch (error) {
    next(error);
  }
}
