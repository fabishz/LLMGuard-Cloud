import { Request, Response, NextFunction } from 'express';
import * as logsService from '../services/logsService.js';
import { logger } from '../utils/logger.js';
import { QueryLogsInput } from '../validators/logs.js';

/**
 * Get logs for a project with search, filtering, sorting, and pagination
 * GET /logs/:projectId
 * Query params: { search?, model?, minRiskScore?, maxRiskScore?, startDate?, endDate?, sortBy?, sortOrder?, limit?, page? }
 * Response: { logs, total, page, limit, totalPages }
 * Requirements: 7.1, 7.2, 7.3
 */
export async function getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;
    const query = req.query as unknown as QueryLogsInput;

    // Parse date strings to Date objects if provided
    const parsedQuery = {
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    // Validate dates if provided
    if (parsedQuery.startDate && isNaN(parsedQuery.startDate.getTime())) {
      res.status(400).json({
        error: {
          code: 'INVALID_DATE_FORMAT',
          message: 'Invalid startDate format. Use ISO 8601 format.',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    if (parsedQuery.endDate && isNaN(parsedQuery.endDate.getTime())) {
      res.status(400).json({
        error: {
          code: 'INVALID_DATE_FORMAT',
          message: 'Invalid endDate format. Use ISO 8601 format.',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const result = await logsService.queryLogs(projectId, parsedQuery);

    logger.info(
      {
        projectId,
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
      'Logs retrieved successfully'
    );

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single log entry by ID
 * GET /logs/:projectId/:logId
 * Response: { log }
 * Requirements: 7.1
 */
export async function getLogById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, logId } = req.params;

    const log = await logsService.getLogById(projectId, logId);

    logger.info({ projectId, logId }, 'Log entry retrieved successfully');

    res.status(200).json({
      log,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Log entry not found') {
      res.status(404).json({
        error: {
          code: 'LOG_NOT_FOUND',
          message: 'Log entry not found',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
    next(error);
  }
}

/**
 * Get statistics about logs for a project
 * GET /logs/:projectId/stats
 * Response: { statistics }
 * Requirements: 7.1
 */
export async function getLogStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;

    const statistics = await logsService.getLogStatistics(projectId);

    logger.info({ projectId }, 'Log statistics retrieved successfully');

    res.status(200).json({
      statistics,
    });
  } catch (error) {
    next(error);
  }
}
