import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader, JWTPayload } from '../utils/jwt.js';
import { AuthenticationError, AuthorizationError, InvalidApiKeyError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import prisma from '../config/database.js';
import bcrypt from 'bcrypt';

/**
 * Extend Express Request to include authenticated user and project info
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      projectId?: string;
      apiKey?: string;
    }
  }
}

/**
 * JWT Authentication Middleware
 * Verifies JWT access token from Authorization header
 * Attaches user information to request object
 *
 * Usage: app.use(authenticateJWT)
 * Or: router.get('/protected', authenticateJWT, handler)
 *
 * Requirements: 1.2, 10.2
 */
export const authenticateJWT = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      logger.debug({ requestId: req.requestId }, 'Missing authorization token');
      throw new AuthenticationError('Missing authorization token');
    }

    const payload = verifyAccessToken(token);
    req.user = payload;

    logger.debug({ requestId: req.requestId, userId: payload.userId }, 'JWT authentication successful');
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return next(error);
    }
    next(new AuthenticationError('Invalid or expired token'));
  }
};

/**
 * API Key Authentication Middleware
 * Validates API key from X-API-Key header or query parameter
 * Verifies key against project and attaches project info to request
 *
 * Usage: router.post('/llm/request', authenticateApiKey, handler)
 *
 * Requirements: 2.4, 10.2
 */
export const authenticateApiKey = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    // Get API key from header or query parameter
    const apiKey = req.headers['x-api-key'] as string | undefined || req.query['api_key'] as string | undefined;

    if (!apiKey) {
      logger.debug({ requestId: req.requestId }, 'Missing API key');
      throw new InvalidApiKeyError();
    }

    // Find project with matching API key hash
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        userId: true,
        apiKeyHash: true,
      },
    });

    let validProject = null;
    for (const project of projects) {
      const isValid = await bcrypt.compare(apiKey, project.apiKeyHash);
      if (isValid) {
        validProject = project;
        break;
      }
    }

    if (!validProject) {
      logger.warn({ requestId: req.requestId }, 'Invalid API key provided');
      throw new InvalidApiKeyError();
    }

    // Attach project info to request
    req.projectId = validProject.id;
    req.apiKey = apiKey;

    logger.debug(
      { requestId: req.requestId, projectId: validProject.id },
      'API key authentication successful'
    );
    next();
  } catch (error) {
    if (error instanceof InvalidApiKeyError) {
      return next(error);
    }
    logger.error({ requestId: req.requestId, error }, 'Error validating API key');
    next(new InvalidApiKeyError());
  }
};

/**
 * Permission Checking Middleware
 * Verifies user has required role (admin or user)
 * Must be used after authenticateJWT middleware
 *
 * Usage: router.delete('/admin/users', authenticateJWT, requireRole('admin'), handler)
 *
 * Requirements: 1.2, 10.2
 */
export const requireRole = (requiredRole: 'admin' | 'user') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      logger.warn({ requestId: req.requestId }, 'User not authenticated for role check');
      return next(new AuthenticationError('User not authenticated'));
    }

    if (requiredRole === 'admin' && req.user.role !== 'admin') {
      logger.warn(
        { requestId: req.requestId, userId: req.user.userId, requiredRole },
        'User lacks required admin role'
      );
      return next(new AuthorizationError('Admin access required'));
    }

    logger.debug(
      { requestId: req.requestId, userId: req.user.userId, role: req.user.role },
      `User authorized for ${requiredRole} role`
    );
    next();
  };
};

/**
 * Project Ownership Verification Middleware
 * Verifies authenticated user owns the project being accessed
 * Must be used after authenticateJWT middleware
 *
 * Usage: router.get('/projects/:projectId', authenticateJWT, verifyProjectOwnership, handler)
 *
 * Requirements: 1.2, 10.2
 */
export const verifyProjectOwnership = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      logger.warn({ requestId: req.requestId }, 'User not authenticated for project ownership check');
      return next(new AuthenticationError('User not authenticated'));
    }

    const projectId = req.params.projectId || req.projectId;

    if (!projectId) {
      logger.warn({ requestId: req.requestId }, 'Project ID not provided');
      return next(new AuthorizationError('Project ID required'));
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project) {
      logger.warn({ requestId: req.requestId, projectId }, 'Project not found');
      return next(new AuthorizationError('Project not found'));
    }

    if (project.userId !== req.user.userId) {
      logger.warn(
        { requestId: req.requestId, userId: req.user.userId, projectId, ownerId: project.userId },
        'User does not own project'
      );
      return next(new AuthorizationError('You do not have access to this project'));
    }

    logger.debug(
      { requestId: req.requestId, userId: req.user.userId, projectId },
      'Project ownership verified'
    );
    next();
  } catch (error) {
    logger.error({ requestId: req.requestId, error }, 'Error verifying project ownership');
    next(new AuthorizationError('Failed to verify project ownership'));
  }
};

/**
 * Optional JWT Authentication Middleware
 * Attempts to authenticate user but doesn't fail if token is missing
 * Useful for endpoints that work with or without authentication
 *
 * Usage: router.get('/public-data', optionalAuthenticateJWT, handler)
 *
 * Requirements: 10.2
 */
export const optionalAuthenticateJWT = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const payload = verifyAccessToken(token);
      req.user = payload;
      logger.debug({ requestId: req.requestId, userId: payload.userId }, 'Optional JWT authentication successful');
    } else {
      logger.debug({ requestId: req.requestId }, 'No token provided for optional authentication');
    }

    next();
  } catch (error) {
    // Log but don't fail - this is optional authentication
    logger.debug({ requestId: req.requestId, error }, 'Optional JWT authentication failed, continuing without user');
    next();
  }
};
