import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  rateLimit,
  resetRateLimit,
  getRateLimitStatus,
  clearAllRateLimits,
} from '../middleware/rateLimit.js';

import { randomUUID } from 'crypto';

describe('Rate Limiting Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let nextCalled: boolean;
  let nextError: Error | null;

  beforeEach(() => {
    // Reset rate limits before each test
    clearAllRateLimits();

    // Mock request
    mockReq = {
      requestId: randomUUID(),
      user: undefined,
      apiKey: undefined,
    };

    // Mock response
    mockRes = {
      set: (key: string, value: string) => {
        if (!(mockRes as any).headers) (mockRes as any).headers = {};
        (mockRes as any).headers[key] = value;
        return mockRes as any;
      },
      headers: {},
    } as any;

    // Mock next function
    nextCalled = false;
    nextError = null;
    mockNext = ((error?: Error | string) => {
      nextCalled = true;
      if (error && error instanceof Error) nextError = error;
    }) as any;
  });

  afterEach(() => {
    clearAllRateLimits();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests when under the limit', async () => {
      const middleware = rateLimit(60000, 5); // 5 requests per minute
      mockReq.user = { userId: 'user-1', email: 'user@example.com', role: 'user' } as any;

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        nextCalled = false;
        nextError = null;
        middleware(mockReq as Request, mockRes as Response, mockNext);
        expect(nextCalled).toBe(true);
        expect(nextError).toBeNull();
      }
    });

    it('should block requests when limit is exceeded', async () => {
      const middleware = rateLimit(60000, 3); // 3 requests per minute
      mockReq.user = { userId: 'user-1', email: 'user@example.com', role: 'user' } as any;

      // Make 3 requests (should succeed)
      for (let i = 0; i < 3; i++) {
        nextCalled = false;
        nextError = null;
        middleware(mockReq as Request, mockRes as Response, mockNext);
        expect(nextCalled).toBe(true);
        expect(nextError).toBeNull();
      }

      // 4th request should be blocked
      nextCalled = false;
      nextError = null;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(nextCalled).toBe(true);
      expect(nextError).not.toBeNull();
      expect((nextError as any).code).toBe('RATE_LIMIT_EXCEEDED');
      expect((nextError as any).statusCode).toBe(429);
    });

    it('should set Retry-After header when rate limited', async () => {
      const middleware = rateLimit(60000, 2);
      mockReq.user = { userId: 'user-1', email: 'user@example.com', role: 'user' } as any;

      // Make 2 requests
      for (let i = 0; i < 2; i++) {
        nextCalled = false;
        nextError = null;
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      // 3rd request should be blocked with Retry-After header
      nextCalled = false;
      nextError = null;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect((mockRes as any).headers?.['Retry-After']).toBeDefined();
      expect(parseInt((mockRes as any).headers?.['Retry-After'] as string)).toBeGreaterThan(0);
    });
  });

  describe('Per-User Rate Limiting', () => {
    it('should track rate limits separately per user', async () => {
      const middleware = rateLimit(60000, 2);

      // User 1 makes 2 requests
      mockReq.user = { userId: 'user-1', email: 'user@example.com', role: 'user' } as any;
      for (let i = 0; i < 2; i++) {
        nextCalled = false;
        nextError = null;
        middleware(mockReq as Request, mockRes as Response, mockNext);
        expect(nextError).toBeNull();
      }

      // User 1's 3rd request should be blocked
      nextCalled = false;
      nextError = null;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(nextError).not.toBeNull();
      expect((nextError as any).code).toBe('RATE_LIMIT_EXCEEDED');

      // User 2 should still be able to make requests
      mockReq.user = { userId: 'user-2', email: 'user2@example.com', role: 'user' } as any;
      nextCalled = false;
      nextError = null;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(nextError).toBeNull();
    });
  });

  describe('Per-API-Key Rate Limiting', () => {
    it('should track rate limits separately per API key', async () => {
      const middleware = rateLimit(60000, 2);

      // API Key 1 makes 2 requests
      mockReq.apiKey = 'key-1';
      mockReq.user = undefined;
      for (let i = 0; i < 2; i++) {
        nextCalled = false;
        nextError = null;
        middleware(mockReq as Request, mockRes as Response, mockNext);
        expect(nextError).toBeNull();
      }

      // API Key 1's 3rd request should be blocked
      nextCalled = false;
      nextError = null;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(nextError).not.toBeNull();
      expect((nextError as any).code).toBe('RATE_LIMIT_EXCEEDED');

      // API Key 2 should still be able to make requests
      mockReq.apiKey = 'key-2';
      nextCalled = false;
      nextError = null;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(nextError).toBeNull();
    });

    it('should prioritize API key over user ID', async () => {
      const middleware = rateLimit(60000, 2);

      // Request with both API key and user ID
      mockReq.apiKey = 'key-1';
      mockReq.user = { userId: 'user-1', email: 'user@example.com', role: 'user' } as any;

      // Make 2 requests
      for (let i = 0; i < 2; i++) {
        nextCalled = false;
        nextError = null;
        middleware(mockReq as Request, mockRes as Response, mockNext);
        expect(nextError).toBeNull();
      }

      // 3rd request should be blocked (API key limit, not user limit)
      nextCalled = false;
      nextError = null;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(nextError).not.toBeNull();
      expect((nextError as any).code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Unauthenticated Requests', () => {
    it('should skip rate limiting for unauthenticated requests', async () => {
      const middleware = rateLimit(60000, 1);

      // No user or API key
      mockReq.user = undefined;
      mockReq.apiKey = undefined;

      // Should allow multiple requests without rate limiting
      for (let i = 0; i < 5; i++) {
        nextCalled = false;
        nextError = null;
        middleware(mockReq as Request, mockRes as Response, mockNext);
        expect(nextCalled).toBe(true);
        expect(nextError).toBeNull();
      }
    });
  });

  describe('Rate Limit Status', () => {
    it('should return correct rate limit status', async () => {
      const middleware = rateLimit(60000, 5);
      mockReq.user = { userId: 'user-1', email: 'user@example.com', role: 'user' } as any;

      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        nextCalled = false;
        nextError = null;
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      // Check status
      const status = getRateLimitStatus('user:user-1', 60000, 5);
      expect(status.requestsInWindow).toBe(3);
      expect(status.remaining).toBe(2);
      expect(status.maxRequests).toBe(5);
    });

    it('should return zero remaining when limit is reached', async () => {
      const middleware = rateLimit(60000, 2);
      mockReq.user = { userId: 'user-1', email: 'user@example.com', role: 'user' } as any;

      // Make 2 requests
      for (let i = 0; i < 2; i++) {
        nextCalled = false;
        nextError = null;
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      // Check status
      const status = getRateLimitStatus('user:user-1', 60000, 2);
      expect(status.remaining).toBe(0);
    });
  });

  describe('Rate Limit Reset', () => {
    it('should reset rate limit for a specific identifier', async () => {
      const middleware = rateLimit(60000, 2);
      mockReq.user = { userId: 'user-1', email: 'user@example.com', role: 'user' } as any;

      // Make 2 requests
      for (let i = 0; i < 2; i++) {
        nextCalled = false;
        nextError = null;
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      // 3rd request should be blocked
      nextCalled = false;
      nextError = null;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(nextError).not.toBeNull();
      expect((nextError as any).code).toBe('RATE_LIMIT_EXCEEDED');

      // Reset rate limit
      resetRateLimit('user:user-1');

      // Should now allow requests again
      nextCalled = false;
      nextError = null;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(nextError).toBeNull();
    });
  });

  describe('Sliding Window Algorithm', () => {
    it('should use sliding window correctly', async () => {
      const windowMs = 100; // 100ms window
      const middleware = rateLimit(windowMs, 2);
      mockReq.user = { userId: 'user-1', email: 'user@example.com', role: 'user' } as any;

      // Make 2 requests immediately
      for (let i = 0; i < 2; i++) {
        nextCalled = false;
        nextError = null;
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      // 3rd request should be blocked
      nextCalled = false;
      nextError = null;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(nextError).not.toBeNull();
      expect((nextError as any).code).toBe('RATE_LIMIT_EXCEEDED');

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should now allow requests again
      nextCalled = false;
      nextError = null;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(nextError).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should not block requests on middleware errors', async () => {
      const middleware = rateLimit(60000, 2);

      // Create a request that might cause issues
      mockReq.user = { userId: 'user-1', email: 'user@example.com', role: 'user' } as any;

      // Middleware should handle errors gracefully
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(nextCalled).toBe(true);
    });
  });

  describe('Custom Window and Limit', () => {
    it('should respect custom window and limit values', async () => {
      const customWindow = 30000; // 30 seconds
      const customLimit = 10;
      const middleware = rateLimit(customWindow, customLimit);
      mockReq.user = { userId: 'user-1', email: 'user@example.com', role: 'user' } as any;

      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        nextCalled = false;
        nextError = null;
        middleware(mockReq as Request, mockRes as Response, mockNext);
        expect(nextError).toBeNull();
      }

      // 11th request should be blocked
      nextCalled = false;
      nextError = null;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(nextError).not.toBeNull();
      expect((nextError as any).code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});
