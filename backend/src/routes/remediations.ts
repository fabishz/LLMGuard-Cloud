import { Router, type Router as ExpressRouter } from 'express';
import * as remediationController from '../controllers/remediationController.js';
import { authenticateJWT, verifyProjectOwnership } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import { createRemediationActionSchema, remediationActionIdSchema } from '../validators/remediation.js';

const router: ExpressRouter = Router({ mergeParams: true });

// All remediation routes require JWT authentication and project ownership verification
router.use(authenticateJWT);
router.use(verifyProjectOwnership);

/**
 * POST /projects/:projectId/incidents/:incidentId/remediation
 * Create a remediation action for an incident
 * Body: { actionType, parameters }
 * Response: { action }
 * Requirements: 5.1, 5.2, 5.3
 */
router.post(
  '/',
  validateBody(createRemediationActionSchema),
  remediationController.createRemediationAction
);

/**
 * GET /projects/:projectId/incidents/:incidentId/remediation
 * Get all remediation actions for an incident
 * Query: { limit?, offset? }
 * Response: { actions, pagination }
 * Requirements: 5.4
 */
router.get('/', remediationController.getRemediationActions);

/**
 * GET /projects/:projectId/incidents/:incidentId/remediation/:actionId
 * Get a remediation action by ID
 * Response: { action }
 * Requirements: 5.4
 */
router.get(
  '/:actionId',
  validateParams(remediationActionIdSchema),
  remediationController.getRemediationAction
);

/**
 * POST /projects/:projectId/incidents/:incidentId/remediation/:actionId/apply
 * Apply a remediation action (mark as executed)
 * Response: { action }
 * Requirements: 5.2, 5.3
 */
router.post(
  '/:actionId/apply',
  validateParams(remediationActionIdSchema),
  remediationController.applyRemediationAction
);

/**
 * DELETE /projects/:projectId/incidents/:incidentId/remediation/:actionId
 * Delete a remediation action
 * Response: 204 No Content
 * Requirements: 5.2
 */
router.delete(
  '/:actionId',
  validateParams(remediationActionIdSchema),
  remediationController.deleteRemediationAction
);

export default router;
