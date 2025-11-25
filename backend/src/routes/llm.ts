import { Router, type Router as ExpressRouter } from 'express';
import * as llmController from '../controllers/llmController.js';
import { authenticateApiKey } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.js';
import { logLLMRequestSchema, queryLLMRequestsSchema, requestIdSchema } from '../validators/llm.js';

const router: ExpressRouter = Router();

// All LLM routes require API key authentication
router.use(authenticateApiKey);

/**
 * POST /llm/request
 * Log an LLM request with risk scoring
 * Body: { prompt, response, model, latency, tokens, error? }
 * Response: { request }
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
router.post('/request', validateBody(logLLMRequestSchema), llmController.logRequest);

/**
 * GET /llm/requests/:requestId
 * Get a single LLM request by ID
 * Response: { request }
 * Requirements: 3.1, 3.2
 */
router.get('/requests/:requestId', validateParams(requestIdSchema), llmController.getRequest);

/**
 * GET /llm/requests
 * List LLM requests for a project with filtering and pagination
 * Query: { limit?, page?, model?, minRiskScore?, maxRiskScore?, startDate?, endDate?, sortBy?, sortOrder? }
 * Response: { requests, pagination }
 * Requirements: 7.1, 7.2, 7.3
 */
router.get('/requests', validateQuery(queryLLMRequestsSchema), llmController.listRequests);

/**
 * GET /llm/stats
 * Get statistics for LLM requests in a project
 * Query: { startDate?, endDate? }
 * Response: { stats }
 * Requirements: 6.1, 6.2, 6.3
 */
router.get('/stats', llmController.getStats);

/**
 * GET /llm/recent
 * Get recent LLM requests for a project (used for incident analysis)
 * Query: { limit? }
 * Response: { requests }
 * Requirements: 3.1, 3.2
 */
router.get('/recent', llmController.getRecent);

/**
 * GET /llm/high-risk
 * Get high-risk LLM requests for a project
 * Query: { riskThreshold?, limit? }
 * Response: { requests }
 * Requirements: 3.3
 */
router.get('/high-risk', llmController.getHighRisk);

/**
 * GET /llm/errors
 * Get LLM requests with errors for a project
 * Query: { limit? }
 * Response: { requests }
 * Requirements: 3.4
 */
router.get('/errors', llmController.getErrors);

export default router;
