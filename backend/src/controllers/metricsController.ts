import { Request, Response, NextFunction } from 'express';
import * as metricsService from '../services/metricsService.js';
import { logger } from '../utils/logger.js';

/**
 * Get metrics for a project
 * GET /metrics/:projectId
 * Query params: startDate (optional), endDate (optional)
 * Response: { metrics }
 * Requirements: 6.1, 6.2, 6.3
 */
export async function getProjectMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    // Parse optional date parameters
    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate && typeof startDate === 'string') {
      start = new Date(startDate);
      if (isNaN(start.getTime())) {
        res.status(400).json({
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Invalid startDate format. Use ISO 8601 format.',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    }

    if (endDate && typeof endDate === 'string') {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        res.status(400).json({
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Invalid endDate format. Use ISO 8601 format.',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    }

    const metrics = await metricsService.getProjectMetrics(projectId, start, end);

    logger.info({ projectId, startDate: start, endDate: end }, 'Project metrics retrieved successfully');

    res.status(200).json({
      metrics,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get daily metrics for a specific date
 * GET /metrics/:projectId/daily
 * Query params: date (required, ISO 8601 format)
 * Response: { dailyMetrics }
 * Requirements: 6.1, 6.2
 */
export async function getDailyMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      res.status(400).json({
        error: {
          code: 'MISSING_DATE_PARAMETER',
          message: 'date query parameter is required in ISO 8601 format',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      res.status(400).json({
        error: {
          code: 'INVALID_DATE_FORMAT',
          message: 'Invalid date format. Use ISO 8601 format.',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const dailyMetrics = await metricsService.getDailyMetrics(projectId, parsedDate);

    logger.info({ projectId, date }, 'Daily metrics retrieved successfully');

    res.status(200).json({
      dailyMetrics,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get model usage breakdown for a project
 * GET /metrics/:projectId/models
 * Query params: startDate (optional), endDate (optional)
 * Response: { modelUsage }
 * Requirements: 6.1, 6.2
 */
export async function getModelUsageBreakdown(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate && typeof startDate === 'string') {
      start = new Date(startDate);
      if (isNaN(start.getTime())) {
        res.status(400).json({
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Invalid startDate format. Use ISO 8601 format.',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    }

    if (endDate && typeof endDate === 'string') {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        res.status(400).json({
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Invalid endDate format. Use ISO 8601 format.',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    }

    const modelUsage = await metricsService.getModelUsageBreakdown(projectId, start, end);

    logger.info({ projectId }, 'Model usage breakdown retrieved successfully');

    res.status(200).json({
      modelUsage,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get error rate statistics for a project
 * GET /metrics/:projectId/errors
 * Query params: startDate (optional), endDate (optional)
 * Response: { errorStats }
 * Requirements: 6.1, 6.2
 */
export async function getErrorRateStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate && typeof startDate === 'string') {
      start = new Date(startDate);
      if (isNaN(start.getTime())) {
        res.status(400).json({
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Invalid startDate format. Use ISO 8601 format.',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    }

    if (endDate && typeof endDate === 'string') {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        res.status(400).json({
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Invalid endDate format. Use ISO 8601 format.',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    }

    const errorStats = await metricsService.getErrorRateStats(projectId, start, end);

    logger.info({ projectId }, 'Error rate statistics retrieved successfully');

    res.status(200).json({
      errorStats,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get token usage statistics for a project
 * GET /metrics/:projectId/tokens
 * Query params: startDate (optional), endDate (optional)
 * Response: { tokenStats }
 * Requirements: 6.1, 6.2
 */
export async function getTokenUsageStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate && typeof startDate === 'string') {
      start = new Date(startDate);
      if (isNaN(start.getTime())) {
        res.status(400).json({
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Invalid startDate format. Use ISO 8601 format.',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    }

    if (endDate && typeof endDate === 'string') {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        res.status(400).json({
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Invalid endDate format. Use ISO 8601 format.',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    }

    const tokenStats = await metricsService.getTokenUsageStats(projectId, start, end);

    logger.info({ projectId }, 'Token usage statistics retrieved successfully');

    res.status(200).json({
      tokenStats,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get cost estimation for a project
 * GET /metrics/:projectId/costs
 * Query params: startDate (optional), endDate (optional)
 * Response: { costEstimate }
 * Requirements: 6.1, 6.2
 */
export async function getCostEstimate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate && typeof startDate === 'string') {
      start = new Date(startDate);
      if (isNaN(start.getTime())) {
        res.status(400).json({
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Invalid startDate format. Use ISO 8601 format.',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    }

    if (endDate && typeof endDate === 'string') {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        res.status(400).json({
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Invalid endDate format. Use ISO 8601 format.',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    }

    const costEstimate = await metricsService.getCostEstimate(projectId, start, end);

    logger.info({ projectId }, 'Cost estimate retrieved successfully');

    res.status(200).json({
      costEstimate,
    });
  } catch (error) {
    next(error);
  }
}
