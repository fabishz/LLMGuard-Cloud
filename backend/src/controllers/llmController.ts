import { Request, Response, NextFunction } from 'express';
import * as llmService from '../services/llmService.js';
import { logger } from '../utils/logger.js';

/**
 * Log an LLM request with risk scoring
 * POST /llm/request
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export async function logRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.projectId;
    if (!projectId) {
      throw new Error('Project ID not found in request');
    }

    const { prompt, response, model, latency, tokens, error } = req.body;

    const llmRequest = await llmService.logLLMRequest(projectId, {
      prompt,
      response,
      model,
      latency,
      tokens,
      error,
    });

    logger.info(
      {
        projectId,
        requestId: llmRequest.id,
        model,
        riskScore: llmRequest.riskScore,
      },
      'LLM request logged successfully'
    );

    res.status(201).json({
      request: llmRequest,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single LLM request by ID
 * GET /llm/requests/:requestId
 * Requirements: 3.1, 3.2
 */
export async function getRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.projectId;
    if (!projectId) {
      throw new Error('Project ID not found in request');
    }

    const { requestId } = req.params;

    const llmRequest = await llmService.getLLMRequest(projectId, requestId);

    logger.info(
      {
        projectId,
        requestId,
      },
      'LLM request retrieved successfully'
    );

    res.status(200).json({
      request: llmRequest,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List LLM requests for a project with filtering and pagination
 * GET /llm/requests
 * Requirements: 7.1, 7.2, 7.3
 */
export async function listRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.projectId;
    if (!projectId) {
      throw new Error('Project ID not found in request');
    }

    const {
      limit = 100,
      page = 1,
      model,
      minRiskScore,
      maxRiskScore,
      startDate,
      endDate,
    } = req.query;

    // Convert page to offset
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 100;
    const offset = (pageNum - 1) * limitNum;

    // Parse dates if provided
    const parsedStartDate = startDate ? new Date(startDate as string) : undefined;
    const parsedEndDate = endDate ? new Date(endDate as string) : undefined;

    const llmRequests = await llmService.getLLMRequests(projectId, {
      limit: limitNum,
      offset,
      model: model as string | undefined,
      minRiskScore: minRiskScore ? parseInt(minRiskScore as string, 10) : undefined,
      maxRiskScore: maxRiskScore ? parseInt(maxRiskScore as string, 10) : undefined,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
    });

    logger.info(
      {
        projectId,
        count: llmRequests.length,
        limit: limitNum,
        page: pageNum,
      },
      'LLM requests listed successfully'
    );

    res.status(200).json({
      requests: llmRequests,
      pagination: {
        limit: limitNum,
        page: pageNum,
        count: llmRequests.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get statistics for LLM requests in a project
 * GET /llm/stats
 * Requirements: 6.1, 6.2, 6.3
 */
export async function getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.projectId;
    if (!projectId) {
      throw new Error('Project ID not found in request');
    }

    const { startDate, endDate } = req.query;

    const parsedStartDate = startDate ? new Date(startDate as string) : undefined;
    const parsedEndDate = endDate ? new Date(endDate as string) : undefined;

    const stats = await llmService.getLLMRequestStats(projectId, parsedStartDate, parsedEndDate);

    logger.info(
      {
        projectId,
        totalRequests: stats.totalRequests,
        errorRate: stats.errorRate,
      },
      'LLM request statistics retrieved successfully'
    );

    res.status(200).json({
      stats,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get recent LLM requests for a project (used for incident analysis)
 * GET /llm/recent
 * Requirements: 3.1, 3.2
 */
export async function getRecent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.projectId;
    if (!projectId) {
      throw new Error('Project ID not found in request');
    }

    const { limit = 20 } = req.query;
    const limitNum = parseInt(limit as string, 10) || 20;

    const requests = await llmService.getRecentLLMRequests(projectId, limitNum);

    logger.info(
      {
        projectId,
        count: requests.length,
      },
      'Recent LLM requests retrieved successfully'
    );

    res.status(200).json({
      requests,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get high-risk LLM requests for a project
 * GET /llm/high-risk
 * Requirements: 3.3
 */
export async function getHighRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.projectId;
    if (!projectId) {
      throw new Error('Project ID not found in request');
    }

    const { riskThreshold = 80, limit = 50 } = req.query;
    const thresholdNum = parseInt(riskThreshold as string, 10) || 80;
    const limitNum = parseInt(limit as string, 10) || 50;

    const requests = await llmService.getHighRiskLLMRequests(projectId, thresholdNum, limitNum);

    logger.info(
      {
        projectId,
        riskThreshold: thresholdNum,
        count: requests.length,
      },
      'High-risk LLM requests retrieved successfully'
    );

    res.status(200).json({
      requests,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get LLM requests with errors for a project
 * GET /llm/errors
 * Requirements: 3.4
 */
export async function getErrors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.projectId;
    if (!projectId) {
      throw new Error('Project ID not found in request');
    }

    const { limit = 50 } = req.query;
    const limitNum = parseInt(limit as string, 10) || 50;

    const requests = await llmService.getErroredLLMRequests(projectId, limitNum);

    logger.info(
      {
        projectId,
        count: requests.length,
      },
      'Errored LLM requests retrieved successfully'
    );

    res.status(200).json({
      requests,
    });
  } catch (error) {
    next(error);
  }
}
