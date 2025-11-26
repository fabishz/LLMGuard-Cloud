import { Router, type Router as ExpressRouter } from 'express';
import * as logsController from '../controllers/logsController.js';
import { authenticateJWT, verifyProjectOwnership } from '../middleware/auth.js';
import { validateParams, validateQuery } from '../middleware/validation.js';
import { queryLogsSchema, logIdSchema } from '../validators/logs.js';

const router: ExpressRouter = Router({ mergeParams: true });

// All logs routes require JWT authentication
router.use(authenticateJWT);

/**
 * GET /projects/:projectId/logs
 * Get logs for a project with search, filtering, sorting, and pagination
 * Query: { search?, model?, minRiskScore?, maxRiskScore?, startDate?, endDate?, sortBy?, sortOrder?, limit?, page? }
 * Response: { logs, total, page, limit, totalPages }
 * Requirements: 7.1, 7.2, 7.3
 */
router.get(
  '/',
  validateQuery(queryLogsSchema),
  verifyProjectOwnership,
  logsController.getLogs
);

/**
 * GET /projects/:projectId/logs/stats
 * Get statistics about logs for a project
 * Response: { statistics }
 * Requirements: 7.1
 */
router.get(
  '/stats',
  verifyProjectOwnership,
  logsController.getLogStatistics
);

/**
 * GET /projects/:projectId/logs/:logId
 * Get a single log entry by ID
 * Response: { log }
 * Requirements: 7.1
 */
router.get(
  '/:logId',
  validateParams(logIdSchema),
  verifyProjectOwnership,
  logsController.getLogById
);

export default router;
