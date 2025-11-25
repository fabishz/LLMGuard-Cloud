import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService.js';
import { logger } from '../utils/logger.js';

/**
 * Register a new user
 * POST /auth/register
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, name } = req.body;

    const result = await authService.register({
      email,
      password,
      name,
    });

    logger.info({ userId: result.user.id, email: result.user.email }, 'User registration successful');

    res.status(201).json({
      user: result.user,
      tokens: result.tokens,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Login user with email and password
 * POST /auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    const result = await authService.login({
      email,
      password,
    });

    logger.info({ userId: result.user.id, email: result.user.email }, 'User login successful');

    res.status(200).json({
      user: result.user,
      tokens: result.tokens,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh access token using refresh token
 * POST /auth/refresh-token
 */
export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;

    const result = await authService.refreshToken({
      refreshToken,
    });

    logger.info({ userId: result.user.id }, 'Token refresh successful');

    res.status(200).json({
      user: result.user,
      tokens: result.tokens,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Logout user
 * POST /auth/logout
 */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract user ID from JWT token if available
    const userId = (req as any).user?.userId;

    if (userId) {
      await authService.logout(userId);
      logger.info({ userId }, 'User logout successful');
    }

    res.status(200).json({
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
}
