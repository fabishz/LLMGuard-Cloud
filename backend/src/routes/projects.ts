import { Router, type Router as ExpressRouter } from 'express';
import * as projectController from '../controllers/projectController.js';
import * as remediationController from '../controllers/remediationController.js';
import { authenticateJWT, verifyProjectOwnership } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import { createProjectSchema, projectIdSchema, apiKeyIdSchema } from '../validators/project.js';

const router: ExpressRouter = Router();

// All project routes require JWT authentication
router.use(authenticateJWT);

/**
 * POST /projects
 * Create a new project with API key
 * Body: { name }
 * Response: { project, apiKey }
 * Requirements: 2.1
 */
router.post('/', validateBody(createProjectSchema), projectController.createProject);

/**
 * GET /projects
 * List all projects for authenticated user
 * Response: { projects }
 * Requirements: 2.2
 */
router.get('/', projectController.listProjects);

/**
 * GET /projects/:projectId
 * Get a single project by ID
 * Response: { project }
 * Requirements: 2.2
 */
router.get('/:projectId', validateParams(projectIdSchema), verifyProjectOwnership, projectController.getProject);

/**
 * DELETE /projects/:projectId
 * Delete a project
 * Response: { message }
 * Requirements: 2.1
 */
router.delete('/:projectId', validateParams(projectIdSchema), verifyProjectOwnership, projectController.deleteProject);

/**
 * POST /projects/:projectId/api-keys/create
 * Create a new API key for a project
 * Response: { apiKey, key }
 * Requirements: 2.1, 2.3
 */
router.post(
  '/:projectId/api-keys/create',
  validateParams(projectIdSchema),
  verifyProjectOwnership,
  projectController.createApiKey
);

/**
 * GET /projects/:projectId/api-keys
 * List all API keys for a project
 * Response: { apiKeys }
 * Requirements: 2.3
 */
router.get(
  '/:projectId/api-keys',
  validateParams(projectIdSchema),
  verifyProjectOwnership,
  projectController.listApiKeys
);

/**
 * POST /projects/:projectId/api-keys/:apiKeyId/rotate
 * Rotate an API key
 * Response: { apiKey, key }
 * Requirements: 2.3
 */
router.post(
  '/:projectId/api-keys/:apiKeyId/rotate',
  validateParams(apiKeyIdSchema),
  verifyProjectOwnership,
  projectController.rotateApiKey
);

/**
 * DELETE /projects/:projectId/api-keys/:apiKeyId
 * Delete an API key
 * Response: { message }
 * Requirements: 2.4
 */
router.delete(
  '/:projectId/api-keys/:apiKeyId',
  validateParams(apiKeyIdSchema),
  verifyProjectOwnership,
  projectController.deleteApiKey
);

/**
 * GET /projects/:projectId/remediation/constraints
 * Get active remediation constraints for a project
 * Response: { constraints }
 * Requirements: 5.3
 */
router.get(
  '/:projectId/remediation/constraints',
  validateParams(projectIdSchema),
  verifyProjectOwnership,
  remediationController.getActiveConstraints
);

export default router;
