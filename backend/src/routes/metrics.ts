import { Router, type Router as ExpressRouter } from 'express';
import * as metricsController from '../controllers/metricsController.js';
import { authenticateJWT, verifyProjectOwnership } from '../middleware/auth.js';
import { validateParams } from '../middleware/validation.js';
import { projectIdSchema } from '../validators/metrics.js';

const router: ExpressRouter = Router();

// All metrics routes require JWT authentication
router.use(authenticateJWT);

/**
 * GET /metrics/:projectId
 * Get aggregated metrics for a project
 * Query params: startDate (optional), endDate (optional)
 * Response: { metrics }
 * Requirements: 6.1, 6.2, 6.3
 */
router.get(
  '/:projectId',
  validateParams(projectIdSchema),
  verifyProjectOwnership,
  metricsController.getProjectMetrics
);

/**
 * GET /metrics/:projectId/daily
 * Get daily metrics for a specific date
 * Query params: date (required, ISO 8601 format)
 * Response: { dailyMetrics }
 * Requirements: 6.1, 6.2
 */
router.get(
  '/:projectId/daily',
  validateParams(projectIdSchema),
  verifyProjectOwnership,
  metricsController.getDailyMetrics
);

/**
 * GET /metrics/:projectId/models
 * Get model usage breakdown for a project
 * Query params: startDate (optional), endDate (optional)
 * Response: { modelUsage }
 * Requirements: 6.1, 6.2
 */
router.get(
  '/:projectId/models',
  validateParams(projectIdSchema),
  verifyProjectOwnership,
  metricsController.getModelUsageBreakdown
);

/**
 * GET /metrics/:projectId/errors
 * Get error rate statistics for a project
 * Query params: startDate (optional), endDate (optional)
 * Response: { errorStats }
 * Requirements: 6.1, 6.2
 */
router.get(
  '/:projectId/errors',
  validateParams(projectIdSchema),
  verifyProjectOwnership,
  metricsController.getErrorRateStats
);

/**
 * GET /metrics/:projectId/tokens
 * Get token usage statistics for a project
 * Query params: startDate (optional), endDate (optional)
 * Response: { tokenStats }
 * Requirements: 6.1, 6.2
 */
router.get(
  '/:projectId/tokens',
  validateParams(projectIdSchema),
  verifyProjectOwnership,
  metricsController.getTokenUsageStats
);

/**
 * GET /metrics/:projectId/costs
 * Get cost estimation for a project
 * Query params: startDate (optional), endDate (optional)
 * Response: { costEstimate }
 * Requirements: 6.1, 6.2
 */
router.get(
  '/:projectId/costs',
  validateParams(projectIdSchema),
  verifyProjectOwnership,
  metricsController.getCostEstimate
);

export default router;
