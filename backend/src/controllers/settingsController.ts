import { Request, Response, NextFunction } from 'express';
import * as settingsService from '../services/settingsService.js';
import { logger } from '../utils/logger.js';
import { UpdateUserProfileInput, UpdateProjectSettingsInput } from '../validators/settings.js';
import { NotFoundError, AuthorizationError, ValidationError } from '../utils/errors.js';

/**
 * Get user profile settings
 * GET /settings/profile
 * Response: { profile }
 * Requirements: 8.1
 */
export async function getUserProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const profile = await settingsService.getUserProfile(userId);

    logger.info({ userId }, 'User profile retrieved successfully');

    res.status(200).json({
      profile,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
    next(error);
  }
}

/**
 * Update user profile settings
 * POST /settings/profile
 * Body: { name? }
 * Response: { profile }
 * Requirements: 8.1, 8.2
 */
export async function updateUserProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const request = req.body as UpdateUserProfileInput;

    const profile = await settingsService.updateUserProfile(userId, request);

    logger.info({ userId }, 'User profile updated successfully');

    res.status(200).json({
      profile,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
    if (error instanceof ValidationError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.details,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
    next(error);
  }
}

/**
 * Get project settings
 * GET /settings/project/:projectId
 * Response: { settings }
 * Requirements: 8.3
 */
export async function getProjectSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { projectId } = req.params;

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const settings = await settingsService.getProjectSettings(userId, projectId);

    logger.info({ userId, projectId }, 'Project settings retrieved successfully');

    res.status(200).json({
      settings,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
    if (error instanceof AuthorizationError) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
    next(error);
  }
}

/**
 * Update project settings
 * POST /settings/project/:projectId
 * Body: { preferredModel?, safetyThreshold?, rateLimit?, systemPrompt?, metadata? }
 * Response: { settings }
 * Requirements: 8.3, 8.4
 */
export async function updateProjectSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { projectId } = req.params;

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const request = req.body as UpdateProjectSettingsInput;

    const settings = await settingsService.updateProjectSettings(userId, projectId, request);

    logger.info({ userId, projectId }, 'Project settings updated successfully');

    res.status(200).json({
      settings,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
    if (error instanceof AuthorizationError) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
    if (error instanceof ValidationError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.details,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
    next(error);
  }
}
