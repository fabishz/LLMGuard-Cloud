import { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

/**
 * Global error handling middleware
 * Catches all errors and returns standardized error responses
 */
export const errorHandler = (err: Error | AppError, req: Request, res: Response) => {
  const requestId = req.requestId || 'unknown';

  // Handle custom AppError
  if (err instanceof AppError) {
    logger.warn(
      {
        requestId,
        code: err.code,
        statusCode: err.statusCode,
        message: err.message,
      },
      `⚠️  ${err.code}`
    );

    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle generic errors
  logger.error(
    {
      requestId,
      error: err.message,
      stack: err.stack,
    },
    '❌ Unexpected error'
  );

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    },
  });
};
