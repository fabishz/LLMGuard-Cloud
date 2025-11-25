import prisma from '../config/database.js';
import { getRiskScore, RiskScoreInput } from '../utils/riskScoring.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * LLM request payload from client
 */
export interface LogLLMRequestInput {
  prompt: string;
  response: string;
  model: string;
  latency: number;
  tokens: number;
  error?: string;
}

/**
 * LLM request response
 */
export interface LLMRequestResponse {
  id: string;
  projectId: string;
  prompt: string;
  response: string;
  model: string;
  latency: number;
  tokens: number;
  riskScore: number;
  error?: string;
  createdAt: Date;
}

/**
 * LLM request with metadata for queries
 */
export interface LLMRequestWithMetadata extends LLMRequestResponse {
  metadata?: Record<string, any>;
}

/**
 * Validate LLM request input
 * @param input - LLM request input to validate
 * @throws ValidationError if input is invalid
 */
function validateLLMRequestInput(input: LogLLMRequestInput): void {
  // Validate prompt
  if (!input.prompt || typeof input.prompt !== 'string') {
    throw new ValidationError('Prompt is required and must be a string', { field: 'prompt' });
  }

  if (input.prompt.trim().length === 0) {
    throw new ValidationError('Prompt cannot be empty', { field: 'prompt' });
  }

  // Validate response
  if (!input.response || typeof input.response !== 'string') {
    throw new ValidationError('Response is required and must be a string', { field: 'response' });
  }

  if (input.response.trim().length === 0) {
    throw new ValidationError('Response cannot be empty', { field: 'response' });
  }

  // Validate model
  if (!input.model || typeof input.model !== 'string') {
    throw new ValidationError('Model is required and must be a string', { field: 'model' });
  }

  if (input.model.trim().length === 0) {
    throw new ValidationError('Model cannot be empty', { field: 'model' });
  }

  // Validate latency
  if (typeof input.latency !== 'number' || input.latency < 0) {
    throw new ValidationError('Latency must be a non-negative number', { field: 'latency' });
  }

  // Validate tokens
  if (typeof input.tokens !== 'number' || input.tokens < 0) {
    throw new ValidationError('Tokens must be a non-negative number', { field: 'tokens' });
  }

  // Validate error (optional)
  if (input.error !== undefined && typeof input.error !== 'string') {
    throw new ValidationError('Error must be a string', { field: 'error' });
  }
}

/**
 * Log an LLM request with risk scoring
 * 
 * This function:
 * 1. Validates the input
 * 2. Computes risk score based on prompt/response analysis
 * 3. Stores the request in the database
 * 4. Tracks latency and token count
 * 5. Logs any errors
 * 
 * @param projectId - Project ID the request belongs to
 * @param input - LLM request input with prompt, response, model, latency, tokens
 * @returns Stored LLM request with computed risk score
 * @throws ValidationError if input is invalid
 * @throws NotFoundError if project not found
 * @throws Error if storage fails
 */
export async function logLLMRequest(projectId: string, input: LogLLMRequestInput): Promise<LLMRequestResponse> {
  // Validate input
  validateLLMRequestInput(input);

  try {
    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      logger.warn({ projectId }, 'Project not found for LLM request logging');
      throw new NotFoundError('Project');
    }

    // Compute risk score
    const riskScoreInput: RiskScoreInput = {
      prompt: input.prompt,
      response: input.response,
      model: input.model,
      tokens: input.tokens,
      hasError: !!input.error,
    };

    const riskScore = getRiskScore(riskScoreInput);

    logger.debug(
      {
        projectId,
        model: input.model,
        latency: input.latency,
        tokens: input.tokens,
        riskScore,
      },
      'Computing risk score for LLM request'
    );

    // Store LLM request in database
    const llmRequest = await prisma.lLMRequest.create({
      data: {
        projectId,
        prompt: input.prompt,
        response: input.response,
        model: input.model,
        latency: input.latency,
        tokens: input.tokens,
        riskScore,
        error: input.error || null,
      },
    });

    logger.info(
      {
        requestId: llmRequest.id,
        projectId,
        model: input.model,
        riskScore,
        latency: input.latency,
      },
      'LLM request logged successfully'
    );

    return {
      id: llmRequest.id,
      projectId: llmRequest.projectId,
      prompt: llmRequest.prompt,
      response: llmRequest.response,
      model: llmRequest.model,
      latency: llmRequest.latency,
      tokens: llmRequest.tokens,
      riskScore: llmRequest.riskScore,
      error: llmRequest.error || undefined,
      createdAt: llmRequest.createdAt,
    };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }

    logger.error(
      { error, projectId, model: input.model },
      'Failed to log LLM request'
    );

    throw error;
  }
}

/**
 * Get a single LLM request by ID
 * @param projectId - Project ID the request belongs to
 * @param requestId - LLM request ID to retrieve
 * @returns LLM request details
 * @throws NotFoundError if request not found
 * @throws Error if retrieval fails
 */
export async function getLLMRequest(projectId: string, requestId: string): Promise<LLMRequestResponse> {
  try {
    const llmRequest = await prisma.lLMRequest.findUnique({
      where: { id: requestId },
    });

    if (!llmRequest || llmRequest.projectId !== projectId) {
      logger.warn({ projectId, requestId }, 'LLM request not found');
      throw new NotFoundError('LLM request');
    }

    return {
      id: llmRequest.id,
      projectId: llmRequest.projectId,
      prompt: llmRequest.prompt,
      response: llmRequest.response,
      model: llmRequest.model,
      latency: llmRequest.latency,
      tokens: llmRequest.tokens,
      riskScore: llmRequest.riskScore,
      error: llmRequest.error || undefined,
      createdAt: llmRequest.createdAt,
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }

    logger.error({ error, projectId, requestId }, 'Failed to get LLM request');
    throw error;
  }
}

/**
 * Get LLM requests for a project with optional filtering
 * @param projectId - Project ID to retrieve requests for
 * @param options - Query options (limit, offset, model filter, risk score filter)
 * @returns Array of LLM requests
 * @throws Error if retrieval fails
 */
export interface GetLLMRequestsOptions {
  limit?: number;
  offset?: number;
  model?: string;
  minRiskScore?: number;
  maxRiskScore?: number;
  startDate?: Date;
  endDate?: Date;
}

export async function getLLMRequests(
  projectId: string,
  options: GetLLMRequestsOptions = {}
): Promise<LLMRequestResponse[]> {
  const {
    limit = 100,
    offset = 0,
    model,
    minRiskScore,
    maxRiskScore,
    startDate,
    endDate,
  } = options;

  try {
    // Build where clause
    const where: any = {
      projectId,
    };

    if (model) {
      where.model = model;
    }

    if (minRiskScore !== undefined || maxRiskScore !== undefined) {
      where.riskScore = {};
      if (minRiskScore !== undefined) {
        where.riskScore.gte = minRiskScore;
      }
      if (maxRiskScore !== undefined) {
        where.riskScore.lte = maxRiskScore;
      }
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const llmRequests = await prisma.lLMRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    logger.debug(
      { projectId, count: llmRequests.length, limit, offset },
      'LLM requests retrieved successfully'
    );

    return llmRequests.map((req: typeof llmRequests[0]) => ({
      id: req.id,
      projectId: req.projectId,
      prompt: req.prompt,
      response: req.response,
      model: req.model,
      latency: req.latency,
      tokens: req.tokens,
      riskScore: req.riskScore,
      error: req.error || undefined,
      createdAt: req.createdAt,
    }));
  } catch (error) {
    logger.error({ error, projectId }, 'Failed to get LLM requests');
    throw new Error('Failed to get LLM requests');
  }
}

/**
 * Get statistics for LLM requests in a project
 * @param projectId - Project ID to get statistics for
 * @param startDate - Start date for statistics (optional)
 * @param endDate - End date for statistics (optional)
 * @returns Statistics object with counts, averages, and aggregations
 * @throws Error if retrieval fails
 */
export interface LLMRequestStats {
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  averageLatency: number;
  averageRiskScore: number;
  totalTokens: number;
  modelBreakdown: Record<string, number>;
  highRiskCount: number;
}

export async function getLLMRequestStats(
  projectId: string,
  startDate?: Date,
  endDate?: Date
): Promise<LLMRequestStats> {
  try {
    // Build where clause
    const where: any = { projectId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    // Get all requests for aggregation
    const requests = await prisma.lLMRequest.findMany({
      where,
      select: {
        latency: true,
        tokens: true,
        riskScore: true,
        error: true,
        model: true,
      },
    });

    if (requests.length === 0) {
      return {
        totalRequests: 0,
        errorCount: 0,
        errorRate: 0,
        averageLatency: 0,
        averageRiskScore: 0,
        totalTokens: 0,
        modelBreakdown: {},
        highRiskCount: 0,
      };
    }

    // Calculate statistics
    const errorCount = requests.filter((r: typeof requests[0]) => r.error).length;
    const totalLatency = requests.reduce((sum: number, r: typeof requests[0]) => sum + r.latency, 0);
    const totalRiskScore = requests.reduce((sum: number, r: typeof requests[0]) => sum + r.riskScore, 0);
    const totalTokens = requests.reduce((sum: number, r: typeof requests[0]) => sum + r.tokens, 0);
    const highRiskCount = requests.filter((r: typeof requests[0]) => r.riskScore > 80).length;

    // Build model breakdown
    const modelBreakdown: Record<string, number> = {};
    for (const req of requests) {
      modelBreakdown[req.model] = (modelBreakdown[req.model] || 0) + 1;
    }

    const stats: LLMRequestStats = {
      totalRequests: requests.length,
      errorCount,
      errorRate: errorCount / requests.length,
      averageLatency: totalLatency / requests.length,
      averageRiskScore: totalRiskScore / requests.length,
      totalTokens,
      modelBreakdown,
      highRiskCount,
    };

    logger.debug(
      { projectId, stats },
      'LLM request statistics calculated'
    );

    return stats;
  } catch (error) {
    logger.error({ error, projectId }, 'Failed to get LLM request statistics');
    throw new Error('Failed to get LLM request statistics');
  }
}

/**
 * Get recent LLM requests for a project (used for incident analysis)
 * @param projectId - Project ID to retrieve requests for
 * @param limit - Maximum number of requests to retrieve (default: 20)
 * @returns Array of recent LLM requests
 * @throws Error if retrieval fails
 */
export async function getRecentLLMRequests(projectId: string, limit: number = 20): Promise<LLMRequestResponse[]> {
  try {
    const requests = await prisma.lLMRequest.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    logger.debug({ projectId, count: requests.length }, 'Recent LLM requests retrieved');

    return requests.map((req: typeof requests[0]) => ({
      id: req.id,
      projectId: req.projectId,
      prompt: req.prompt,
      response: req.response,
      model: req.model,
      latency: req.latency,
      tokens: req.tokens,
      riskScore: req.riskScore,
      error: req.error || undefined,
      createdAt: req.createdAt,
    }));
  } catch (error) {
    logger.error({ error, projectId }, 'Failed to get recent LLM requests');
    throw new Error('Failed to get recent LLM requests');
  }
}

/**
 * Get LLM requests with high risk scores
 * @param projectId - Project ID to retrieve requests for
 * @param riskThreshold - Risk score threshold (default: 80)
 * @param limit - Maximum number of requests to retrieve (default: 50)
 * @returns Array of high-risk LLM requests
 * @throws Error if retrieval fails
 */
export async function getHighRiskLLMRequests(
  projectId: string,
  riskThreshold: number = 80,
  limit: number = 50
): Promise<LLMRequestResponse[]> {
  try {
    const requests = await prisma.lLMRequest.findMany({
      where: {
        projectId,
        riskScore: { gte: riskThreshold },
      },
      orderBy: { riskScore: 'desc' },
      take: limit,
    });

    logger.debug(
      { projectId, riskThreshold, count: requests.length },
      'High-risk LLM requests retrieved'
    );

    return requests.map((req: typeof requests[0]) => ({
      id: req.id,
      projectId: req.projectId,
      prompt: req.prompt,
      response: req.response,
      model: req.model,
      latency: req.latency,
      tokens: req.tokens,
      riskScore: req.riskScore,
      error: req.error || undefined,
      createdAt: req.createdAt,
    }));
  } catch (error) {
    logger.error({ error, projectId }, 'Failed to get high-risk LLM requests');
    throw new Error('Failed to get high-risk LLM requests');
  }
}

/**
 * Get LLM requests with errors
 * @param projectId - Project ID to retrieve requests for
 * @param limit - Maximum number of requests to retrieve (default: 50)
 * @returns Array of LLM requests with errors
 * @throws Error if retrieval fails
 */
export async function getErroredLLMRequests(projectId: string, limit: number = 50): Promise<LLMRequestResponse[]> {
  try {
    const requests = await prisma.lLMRequest.findMany({
      where: {
        projectId,
        error: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    logger.debug({ projectId, count: requests.length }, 'Errored LLM requests retrieved');

    return requests.map((req: typeof requests[0]) => ({
      id: req.id,
      projectId: req.projectId,
      prompt: req.prompt,
      response: req.response,
      model: req.model,
      latency: req.latency,
      tokens: req.tokens,
      riskScore: req.riskScore,
      error: req.error || undefined,
      createdAt: req.createdAt,
    }));
  } catch (error) {
    logger.error({ error, projectId }, 'Failed to get errored LLM requests');
    throw new Error('Failed to get errored LLM requests');
  }
}
