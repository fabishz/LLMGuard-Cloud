import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Validation middleware factory
 * Creates middleware that validates request body against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error: any) {
      logger.warn(
        {
          path: req.path,
          method: req.method,
          errors: error.errors,
        },
        'Request validation failed'
      );

      const details: Record<string, any> = {};
      if (error.errors && Array.isArray(error.errors)) {
        error.errors.forEach((err: any) => {
          const path = err.path.join('.');
          details[path] = err.message;
        });
      }

      next(new ValidationError('Invalid request body', details));
    }
  };
}

/**
 * Validation middleware factory for query parameters
 * Creates middleware that validates request query against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated as any;
      next();
    } catch (error: any) {
      logger.warn(
        {
          path: req.path,
          method: req.method,
          errors: error.errors,
        },
        'Query validation failed'
      );

      const details: Record<string, any> = {};
      if (error.errors && Array.isArray(error.errors)) {
        error.errors.forEach((err: any) => {
          const path = err.path.join('.');
          details[path] = err.message;
        });
      }

      next(new ValidationError('Invalid query parameters', details));
    }
  };
}

/**
 * Validation middleware factory for URL parameters
 * Creates middleware that validates request params against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated as any;
      next();
    } catch (error: any) {
      logger.warn(
        {
          path: req.path,
          method: req.method,
          errors: error.errors,
        },
        'Params validation failed'
      );

      const details: Record<string, any> = {};
      if (error.errors && Array.isArray(error.errors)) {
        error.errors.forEach((err: any) => {
          const path = err.path.join('.');
          details[path] = err.message;
        });
      }

      next(new ValidationError('Invalid URL parameters', details));
    }
  };
}
