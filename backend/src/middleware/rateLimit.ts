import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { RATE_LIMIT } from '../config/constants.js';

/**
 * In-memory store for rate limit tracking
 * Key: userId or apiKey
 * Value: Array of request timestamps
 */
const rateLimitStore = new Map<string, number[]>();

/**
 * Clean up old entries from the rate limit store periodically
 * Runs every 5 minutes to prevent memory leaks
 */
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  const windowMs = RATE_LIMIT.WINDOW_MS;

  for (const [key, timestamps] of rateLimitStore.entries()) {
    // Remove timestamps outside the current window
    const validTimestamps = timestamps.filter((ts) => now - ts < windowMs);

    if (validTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else if (validTimestamps.length < timestamps.length) {
      rateLimitStore.set(key, validTimestamps);
    }
  }
}, 5 * 60 * 1000); // 5 minutes

// Ensure cleanup interval is cleared on process exit
process.on('exit', () => clearInterval(cleanupInterval));

/**
 * Get the identifier for rate limiting (user ID or API key)
 * Prioritizes API key if available, falls back to user ID
 */
const getRateLimitIdentifier = (req: Request): string | null => {
  // API key takes priority (for API-based requests)
  if (req.apiKey) {
    return `api_key:${req.apiKey}`;
  }

  // Fall back to user ID (for authenticated requests)
  if (req.user?.userId) {
    return `user:${req.user.userId}`;
  }

  // No identifier available
  return null;
};

/**
 * Check if a request should be rate limited
 * Uses sliding window algorithm
 */
const isRateLimited = (identifier: string, windowMs: number, maxRequests: number): boolean => {
  const now = Date.now();
  const timestamps = rateLimitStore.get(identifier) || [];

  // Remove timestamps outside the current window
  const validTimestamps = timestamps.filter((ts) => now - ts < windowMs);

  // Check if limit exceeded
  if (validTimestamps.length >= maxRequests) {
    return true;
  }

  // Add current request timestamp
  validTimestamps.push(now);
  rateLimitStore.set(identifier, validTimestamps);

  return false;
};

/**
 * Calculate retry-after value in seconds
 * Returns the time until the oldest request in the window expires
 */
const getRetryAfter = (identifier: string, windowMs: number): number => {
  const timestamps = rateLimitStore.get(identifier) || [];
  if (timestamps.length === 0) return 0;

  const oldestTimestamp = Math.min(...timestamps);
  const now = Date.now();
  const retryAfterMs = Math.max(0, windowMs - (now - oldestTimestamp));

  return Math.ceil(retryAfterMs / 1000); // Convert to seconds
};

/**
 * Rate limiting middleware using sliding window algorithm
 * Supports per-user and per-API-key rate limits
 *
 * Usage:
 * - Apply globally: app.use(rateLimit())
 * - Apply to specific routes: router.post('/endpoint', rateLimit(), handler)
 *
 * Configuration:
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 900000 = 15 minutes)
 * - RATE_LIMIT_MAX_REQUESTS: Max requests per window (default: 100)
 *
 * Requirements: 10.1
 */
export const rateLimit = (
  windowMs: number = RATE_LIMIT.WINDOW_MS,
  maxRequests: number = RATE_LIMIT.MAX_REQUESTS
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get the identifier for rate limiting
      const identifier = getRateLimitIdentifier(req);

      // If no identifier, skip rate limiting (unauthenticated requests)
      if (!identifier) {
        logger.debug({ requestId: req.requestId }, 'No rate limit identifier, skipping rate limiting');
        return next();
      }

      // Check if rate limited
      if (isRateLimited(identifier, windowMs, maxRequests)) {
        const retryAfter = getRetryAfter(identifier, windowMs);

        logger.warn(
          {
            requestId: req.requestId,
            identifier,
            windowMs,
            maxRequests,
            retryAfter,
          },
          '⚠️  Rate limit exceeded'
        );

        // Set retry-after header
        res.set('Retry-After', retryAfter.toString());

        // Return rate limit error
        const error = new RateLimitError(retryAfter);
        return next(error);
      }

      logger.debug(
        {
          requestId: req.requestId,
          identifier,
        },
        'Rate limit check passed'
      );

      next();
    } catch (error) {
      logger.error(
        {
          requestId: req.requestId,
          error,
        },
        'Error in rate limiting middleware'
      );

      // Don't block requests on rate limiter errors
      next();
    }
  };
};

/**
 * Reset rate limit for a specific identifier
 * Useful for testing or manual intervention
 */
export const resetRateLimit = (identifier: string): void => {
  rateLimitStore.delete(identifier);
  logger.info({ identifier }, 'Rate limit reset');
};

/**
 * Get current rate limit status for an identifier
 * Returns the number of requests in the current window
 */
export const getRateLimitStatus = (
  identifier: string,
  windowMs: number = RATE_LIMIT.WINDOW_MS,
  maxRequests: number = RATE_LIMIT.MAX_REQUESTS
) => {
  const now = Date.now();
  const timestamps = rateLimitStore.get(identifier) || [];

  // Filter timestamps within the current window
  const validTimestamps = timestamps.filter((ts) => now - ts < windowMs);

  return {
    identifier,
    requestsInWindow: validTimestamps.length,
    windowMs,
    maxRequests,
    remaining: Math.max(0, maxRequests - validTimestamps.length),
  };
};

/**
 * Clear all rate limit data
 * Useful for testing or resetting the system
 */
export const clearAllRateLimits = (): void => {
  rateLimitStore.clear();
  logger.info('All rate limits cleared');
};
