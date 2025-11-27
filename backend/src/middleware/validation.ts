import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors.js';

/**
 * Formats Zod validation errors into a readable object
 * @param error - Zod validation error
 * @returns Formatted error details
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(err.message);
  });

  return formatted;
}

/**
 * Validates request body against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = formatZodErrors(error);
        throw new ValidationError('Request body validation failed', details);
      }
      throw error;
    }
  };
};

/**
 * Validates request query parameters against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = formatZodErrors(error);
        throw new ValidationError('Query parameters validation failed', details);
      }
      throw error;
    }
  };
};

/**
 * Validates request path parameters against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = formatZodErrors(error);
        throw new ValidationError('Path parameters validation failed', details);
      }
      throw error;
    }
  };
};

/**
 * Validates multiple parts of the request (body, query, params)
 * @param schemas - Object containing optional body, query, and params schemas
 * @returns Express middleware function
 */
export const validate = (schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        const validated = schemas.body.parse(req.body);
        req.body = validated;
      }

      if (schemas.query) {
        const validated = schemas.query.parse(req.query);
        req.query = validated as any;
      }

      if (schemas.params) {
        const validated = schemas.params.parse(req.params);
        req.params = validated as any;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = formatZodErrors(error);
        throw new ValidationError('Request validation failed', details);
      }
      throw error;
    }
  };
};
