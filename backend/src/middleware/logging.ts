import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';

// Extend Express Request to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Request logging middleware
 * Logs incoming requests and outgoing responses with timing information
 * Attaches a unique request ID to each request for tracing
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Generate unique request ID for request tracing
  const requestId = randomUUID();
  req.requestId = requestId;

  // Record start time for duration calculation
  const startTime = Date.now();

  // Log incoming request with context
  logger.info(
    {
      requestId,
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
    `→ Incoming ${req.method} ${req.path}`
  );

  // Capture the original res.json and res.send methods to intercept responses
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  // Override res.json to log response with timing
  res.json = function (data: any) {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel as 'info' | 'warn'](
      {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: duration,
      },
      `← Response ${res.statusCode} ${req.method} ${req.path} (${duration}ms)`
    );

    return originalJson(data);
  };

  // Override res.send to log response with timing
  res.send = function (data: any) {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel as 'info' | 'warn'](
      {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: duration,
      },
      `← Response ${res.statusCode} ${req.method} ${req.path} (${duration}ms)`
    );

    return originalSend(data);
  };

  next();
};
