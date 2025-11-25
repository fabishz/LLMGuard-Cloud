import { Router, type Router as ExpressRouter } from 'express';
import * as authController from '../controllers/authController.js';
import { validateBody } from '../middleware/validation.js';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/auth.js';

const router: ExpressRouter = Router();

/**
 * POST /auth/register
 * Register a new user
 * Body: { email, password, name? }
 * Response: { user, tokens }
 */
router.post('/register', validateBody(registerSchema), authController.register);

/**
 * POST /auth/login
 * Login user with email and password
 * Body: { email, password }
 * Response: { user, tokens }
 */
router.post('/login', validateBody(loginSchema), authController.login);

/**
 * POST /auth/refresh-token
 * Refresh access token using refresh token
 * Body: { refreshToken }
 * Response: { user, tokens }
 */
router.post('/refresh-token', validateBody(refreshTokenSchema), authController.refreshToken);

/**
 * POST /auth/logout
 * Logout user (invalidate session)
 * Response: { message }
 */
router.post('/logout', authController.logout);

export default router;
