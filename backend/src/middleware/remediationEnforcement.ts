import { Request, Response, NextFunction } from 'express';
import * as remediationService from '../services/remediationService.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware to enforce active remediation constraints on LLM requests
 * Checks for model switching, safety thresholds, endpoint disabling, and rate limiting
 * Requirements: 5.3
 */
export async function enforceRemediationConstraints(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projectId = req.projectId;
    if (!projectId) {
      return next();
    }

    // Extract request data for constraint checking
    const requestData = {
      model: req.body?.model,
      userId: req.userId,
      endpoint: req.path,
      riskScore: req.body?.riskScore,
    };

    // Check for constraint violations
    const violation = await remediationService.checkRemediationConstraints(projectId, requestData);

    if (violation.violated) {
      logger.warn(
        {
          projectId,
          actionType: violation.actionType,
          reason: violation.reason,
          details: violation.details,
        },
        'Remediation constraint violation detected'
      );

      // Store violation details in request for controller to handle
      req.remediationViolation = violation;
    }

    // Store remediation constraints in request for use in controllers
    const constraints = await remediationService.getActiveRemediationConstraints(projectId);
    req.remediationConstraints = constraints;

    next();
  } catch (error) {
    logger.error({ error, projectId: req.projectId }, 'Error enforcing remediation constraints');
    // Continue without blocking on error
    next();
  }
}

/**
 * Middleware to enforce rate limiting for remediated users
 * Requirements: 5.3
 */
export async function enforceRemediationRateLimit(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projectId = req.projectId;
    const userId = req.userId;

    if (!projectId || !userId) {
      return next();
    }

    // Check if user has rate limiting remediation
    const constraints = await remediationService.getActiveRemediationConstraints(projectId);
    const rateLimitConstraint = constraints.find((c) => c.actionType === 'rate_limit_user');

    if (rateLimitConstraint) {
      // Store rate limit in request for rate limiting middleware to use
      req.remediationRateLimit = rateLimitConstraint.parameters.requestsPerMinute;

      logger.debug(
        {
          projectId,
          userId,
          rateLimit: rateLimitConstraint.parameters.requestsPerMinute,
        },
        'Remediation rate limit applied'
      );
    }

    next();
  } catch (error) {
    logger.error({ error, projectId: req.projectId }, 'Error enforcing remediation rate limit');
    // Continue without blocking on error
    next();
  }
}
