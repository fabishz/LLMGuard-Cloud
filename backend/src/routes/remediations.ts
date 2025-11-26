import { Router, type Router as ExpressRouter } from 'express';
import * as remediationController from '../controllers/remediationController.js';
import { authenticateJWT, verifyProjectOwnership } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.js';
import {
  createRemediationActionSchema,
  remediationActionWithIdsSchema,
  incidentWithProjectIdSchema,
  listRemediationActionsSchema,
  applyRemediationActionSchema,
} from '../validators/remediation.js';

const router: ExpressRouter = Router({ mergeParams: true });

// All remediation routes require JWT authentication
router.use(authenticateJWT);

/**
 * POST /projects/:projectId/incidents/:incidentId/remediations
 * Create a remediation action for an incident
 * Body: { actionType, parameters }
 * Response: { action, message }
 * Requirements: 5.1, 5.2
 */
router.post(
  '/',
  validateParams(incidentWithProjectIdSchema),
  validateBody(createRemediationActionSchema),
  verifyProjectOwnership,
  remediationController.createRemediationAction
);

/**
 * GET /projects/:projectId/incidents/:incidentId/remediations
 * List all remediation actions for an incident
 * Query: { limit?, page? }
 * Response: { actions, total, page, limit }
 * Requirements: 5.4
 */
router.get(
  '/',
  validateParams(incidentWithProjectIdSchema),
  validateQuery(listRemediationActionsSchema),
  verifyProjectOwnership,
  remediationController.listRemediationActions
);

/**
 * GET /projects/:projectId/incidents/:incidentId/remediations/:actionId
 * Get a single remediation action by ID
 * Response: { action }
 * Requirements: 5.4
 */
router.get(
  '/:actionId',
  validateParams(remediationActionWithIdsSchema),
  verifyProjectOwnership,
  remediationController.getRemediationAction
);

/**
 * POST /projects/:projectId/incidents/:incidentId/remediations/:actionId/apply
 * Apply a remediation action (mark as executed)
 * Response: { action, message }
 * Requirements: 5.2, 5.4
 */
router.post(
  '/:actionId/apply',
  validateParams(remediationActionWithIdsSchema),
  validateBody(applyRemediationActionSchema),
  verifyProjectOwnership,
  remediationController.applyRemediationAction
);

/**
 * DELETE /projects/:projectId/incidents/:incidentId/remediations/:actionId
 * Delete a remediation action
 * Response: { message }
 * Requirements: 5.4
 */
router.delete(
  '/:actionId',
  validateParams(remediationActionWithIdsSchema),
  verifyProjectOwnership,
  remediationController.deleteRemediationAction
);

export default router;
