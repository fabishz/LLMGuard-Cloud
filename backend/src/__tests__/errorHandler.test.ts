import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../middleware/errorHandler.js';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InvalidApiKeyError,
  InvalidCredentialsError,
  ExpiredTokenError,
  InvalidTokenError,
} from '../utils/errors.js';

// Mock the logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Error Handler Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonSpy: any;
  let statusSpy: any;

  beforeEach(() => {
    // Setup request mock
    req = {
      requestId: 'test-request-123',
    };

    // Setup response mock
    jsonSpy = vi.fn().mockReturnValue(undefined);
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });

    res = {
      status: statusSpy,
      json: jsonSpy,
    };

    next = vi.fn();
  });

  describe('AppError handling', () => {
    it('should handle AppError with custom code and status', () => {
      const error = new AppError('CUSTOM_ERROR', 'Custom error message', 400, { field: 'value' });

      errorHandler(error, req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'CUSTOM_ERROR',
          message: 'Custom error message',
          details: { field: 'value' },
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle AppError with default status 500', () => {
      const error = new AppError('SERVER_ERROR', 'Server error occurred');

      errorHandler(error, req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'SERVER_ERROR',
          message: 'Server error occurred',
          details: undefined,
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('ValidationError handling', () => {
    it('should handle ValidationError with 400 status', () => {
      const error = new ValidationError('Invalid input', { field: 'email', reason: 'invalid format' });

      errorHandler(error, req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: { field: 'email', reason: 'invalid format' },
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('AuthenticationError handling', () => {
    it('should handle AuthenticationError with 401 status', () => {
      const error = new AuthenticationError('Invalid credentials');

      errorHandler(error, req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
          details: undefined,
          timestamp: expect.any(String),
        },
      });
    });

    it('should use default message for AuthenticationError', () => {
      const error = new AuthenticationError();

      errorHandler(error, req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication failed',
          details: undefined,
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('AuthorizationError handling', () => {
    it('should handle AuthorizationError with 403 status', () => {
      const error = new AuthorizationError('Admin access required');

      errorHandler(error, req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
          details: undefined,
          timestamp: expect.any(String),
        },
      });
    });

    it('should use default message for AuthorizationError', () => {
      const error = new AuthorizationError();

      errorHandler(error, req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
          details: undefined,
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('NotFoundError handling', () => {
    it('should handle NotFoundError with 404 status', () => {
      const error = new NotFoundError('Project');

      errorHandler(error, req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Project not found',
          details: undefined,
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('ConflictError handling', () => {
    it('should handle ConflictError with 409 status', () => {
      const error = new ConflictError('Email already exists');

      errorHandler(error, req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(409);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'CONFLICT',
          message: 'Email already exists',
          details: undefined,
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('RateLimitError handling', () => {
    it('should handle RateLimitError with 429 status', () => {
      const error = new RateLimitError(60);

      errorHandler(error, req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(429);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          details: { retryAfter: 60 },
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle RateLimitError without retryAfter', () => {
      const error = new RateLimitError();

      errorHandler(error, req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(429);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          details: undefined,
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('InvalidApiKeyError handling', () => {
    it('should handle InvalidApiKeyError with 403 status', () => {
      const error = new InvalidApiKeyError();

      errorHandler(error, req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid or expired API key',
          details: undefined,
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('InvalidCredentialsError handling', () => {
    it('should handle InvalidCredentialsError with 401 status', () => {
      const error = new InvalidCredentialsError();

      errorHandler(error, req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          details: undefined,
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('ExpiredTokenError handling', () => {
    it('should handle ExpiredTokenError with 401 status', () => {
      const error = new ExpiredTokenError();

      errorHandler(error, req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'EXPIRED_TOKEN',
          message: 'Token has expired',
          details: undefined,
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('InvalidTokenError handling', () => {
    it('should handle InvalidTokenError with 401 status', () => {
      const error = new InvalidTokenError();

      errorHandler(error, req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token',
          details: undefined,
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('Generic Error handling', () => {
    it('should handle generic Error with 500 status', () => {
      const error = new Error('Unexpected error occurred');

      errorHandler(error, req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle generic Error without message', () => {
      const error = new Error();

      errorHandler(error, req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('Request ID tracking', () => {
    it('should use request ID from request object', () => {
      const customRequestId = 'custom-request-id-456';
      req.requestId = customRequestId;
      const error = new ValidationError('Test error');

      errorHandler(error, req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalled();
    });

    it('should handle missing request ID gracefully', () => {
      req.requestId = undefined;
      const error = new ValidationError('Test error');

      errorHandler(error, req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalled();
    });
  });

  describe('Error response format', () => {
    it('should include timestamp in ISO format', () => {
      const error = new ValidationError('Test error');
      const beforeTime = new Date();

      errorHandler(error, req as Request, res as Response, next);

      const callArgs = jsonSpy.mock.calls[0][0];
      const timestamp = new Date(callArgs.error.timestamp);
      const afterTime = new Date();

      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should include all required error fields', () => {
      const error = new ValidationError('Test error', { field: 'email' });

      errorHandler(error, req as Request, res as Response, next);

      const callArgs = jsonSpy.mock.calls[0][0];
      expect(callArgs.error).toHaveProperty('code');
      expect(callArgs.error).toHaveProperty('message');
      expect(callArgs.error).toHaveProperty('timestamp');
      expect(callArgs.error).toHaveProperty('details');
    });

    it('should not include details when not provided', () => {
      const error = new ValidationError('Test error');

      errorHandler(error, req as Request, res as Response, next);

      const callArgs = jsonSpy.mock.calls[0][0];
      expect(callArgs.error.details).toBeUndefined();
    });
  });
});
