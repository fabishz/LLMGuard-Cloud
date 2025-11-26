import { Router, type Router as ExpressRouter } from 'express';
import * as settingsController from '../controllers/settingsController.js';
import { authenticateJWT, verifyProjectOwnership } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import { updateUserProfileSchema, updateProjectSettingsSchema, projectIdSchema } from '../validators/settings.js';

const router: ExpressRouter = Router();

// All settings routes require JWT authentication
router.use(authenticateJWT);

/**
 * GET /settings/profile
 * Get user profile settings
 * Response: { profile }
 * Requirements: 8.1
 */
router.get(
  '/profile',
  settingsController.getUserProfile
);

/**
 * POST /settings/profile
 * Update user profile settings
 * Body: { name? }
 * Response: { profile }
 * Requirements: 8.1, 8.2
 */
router.post(
  '/profile',
  validateBody(updateUserProfileSchema),
  settingsController.updateUserProfile
);

/**
 * GET /settings/project/:projectId
 * Get project settings
 * Response: { settings }
 * Requirements: 8.3
 */
router.get(
  '/project/:projectId',
  validateParams(projectIdSchema),
  verifyProjectOwnership,
  settingsController.getProjectSettings
);

/**
 * POST /settings/project/:projectId
 * Update project settings
 * Body: { preferredModel?, safetyThreshold?, rateLimit?, systemPrompt?, metadata? }
 * Response: { settings }
 * Requirements: 8.3, 8.4
 */
router.post(
  '/project/:projectId',
  validateParams(projectIdSchema),
  validateBody(updateProjectSettingsSchema),
  verifyProjectOwnership,
  settingsController.updateProjectSettings
);

export default router;
