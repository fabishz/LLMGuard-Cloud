import { Router, type Router as ExpressRouter } from 'express';
import * as incidentController from '../controllers/incidentController.js';
import { authenticateJWT, verifyProjectOwnership } from '../middleware/auth.js';
import { validateParams, validateQuery } from '../middleware/validation.js';
import {
  incidentWithProjectIdSchema,
  listIncidentsSchema,
} from '../validators/incident.js';

const router: ExpressRouter = Router({ mergeParams: true });

// All incident routes require JWT authentication
router.use(authenticateJWT);

/**
 * GET /projects/:projectId/incidents
 * List all incidents for a project with optional filtering
 * Query: { status?, limit?, page? }
 * Response: { incidents, total, page, limit }
 * Requirements: 4.5
 */
router.get(
  '/',
  validateQuery(listIncidentsSchema),
  verifyProjectOwnership,
  incidentController.listIncidents
);

/**
 * GET /projects/:projectId/incidents/:incidentId
 * Get a single incident by ID
 * Response: { incident }
 * Requirements: 4.5
 */
router.get(
  '/:incidentId',
  validateParams(incidentWithProjectIdSchema),
  verifyProjectOwnership,
  incidentController.getIncident
);

/**
 * POST /projects/:projectId/incidents/:incidentId/resolve
 * Resolve an incident
 * Response: { incident, message }
 * Requirements: 4.6
 */
router.post(
  '/:incidentId/resolve',
  validateParams(incidentWithProjectIdSchema),
  verifyProjectOwnership,
  incidentController.resolveIncident
);

export default router;
