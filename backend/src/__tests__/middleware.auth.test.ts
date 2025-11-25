import { describe, it, expect, vi, beforeAll } from 'vitest';
import { Request, Response } from 'express';
import {
  authenticateJWT,
  authenticateApiKey,
  requireRole,
  verifyProjectOwnership,
  optionalAuthenticateJWT,
} from '../middleware/auth.js';
import { generateAccessToken } from '../utils/jwt.js';
import { AuthenticationError, AuthorizationError, InvalidApiKeyError } from '../utils/errors.js';

// Mock prisma and bcrypt to avoid database and native module issues
vi.mock('../config/database.js', () => ({
  default: {
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(async (data: string, hash: string) => hash === `hashed_${data}`),
  },
}));

describe('Authentication Middleware', () => {
  const testUserId = 'test-user-123';
  const testUserEmail = 'test@example.com';
  const testProjectId = 'test-project-123';
  const validApiKey = 'test-api-key-valid';

  let validAccessToken: string;

  beforeAll(() => {
    // Generate valid access token
    validAccessToken = generateAccessToken({
      userId: testUserId,
      email: testUserEmail,
      role: 'user',
    });
  });

  describe('authenticateJWT', () => {
    it('should authenticate user with valid JWT token', () => {
      const req = {
        headers: {
          authorization: `Bearer ${validAccessToken}`,
        },
        requestId: 'test-request-1',
      } as unknown as Request;

      const res = {} as Response;
      let capturedError: any;
      const next = vi.fn((err?: any) => {
        capturedError = err;
      });

      authenticateJWT(req, res, next);
      expect(capturedError).toBeUndefined();
      expect(req.user).toBeDefined();
      expect(req.user?.userId).toBe(testUserId);
      expect(req.user?.email).toBe(testUserEmail);
    });

    it('should fail with missing authorization header', () => {
      const req = {
        headers: {},
        requestId: 'test-request-2',
      } as unknown as Request;

      const res = {} as Response;
      let capturedError: any;
      const next = vi.fn((err?: any) => {
        capturedError = err;
      });

      authenticateJWT(req, res, next);
      expect(capturedError?.code).toBe('UNAUTHORIZED');
    });

    it('should fail with invalid token format', () => {
      const req = {
        headers: {
          authorization: 'InvalidFormat token',
        },
        requestId: 'test-request-3',
      } as unknown as Request;

      const res = {} as Response;
      let capturedError: any;
      const next = vi.fn((err?: any) => {
        capturedError = err;
      });

      authenticateJWT(req, res, next);
      expect(capturedError?.code).toBe('UNAUTHORIZED');
    });

    it('should fail with malformed JWT token', () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid.token.here',
        },
        requestId: 'test-request-4',
      } as unknown as Request;

      const res = {} as Response;
      let capturedError: any;
      const next = vi.fn((err?: any) => {
        capturedError = err;
      });

      authenticateJWT(req, res, next);
      expect(capturedError?.code).toBe('UNAUTHORIZED');
    });
  });

  describe('authenticateApiKey', () => {
    it('should authenticate with valid API key in header', async () => {
      const prisma = (await import('../config/database.js')).default;
      vi.mocked(prisma.project.findMany).mockResolvedValueOnce([
        {
          id: testProjectId,
          userId: testUserId,
          apiKeyHash: `hashed_${validApiKey}`,
        },
      ] as any);

      const req = {
        headers: {
          'x-api-key': validApiKey,
        },
        query: {},
        requestId: 'test-request-5',
      } as unknown as Request;

      const res = {} as Response;
      let capturedError: any;
      const next = vi.fn((err?: any) => {
        capturedError = err;
      });

      await authenticateApiKey(req, res, next);
      expect(capturedError).toBeUndefined();
      expect(req.projectId).toBe(testProjectId);
      expect(req.apiKey).toBe(validApiKey);
    });

    it('should authenticate with valid API key in query parameter', async () => {
      const prisma = (await import('../config/database.js')).default;
      vi.mocked(prisma.project.findMany).mockResolvedValueOnce([
        {
          id: testProjectId,
          userId: testUserId,
          apiKeyHash: `hashed_${validApiKey}`,
        },
      ] as any);

      const req = {
        headers: {},
        query: {
          api_key: validApiKey,
        },
        requestId: 'test-request-6',
      } as unknown as Request;

      const res = {} as Response;
      let capturedError: any;
      const next = vi.fn((err?: any) => {
        capturedError = err;
      });

      await authenticateApiKey(req, res, next);
      expect(capturedError).toBeUndefined();
      expect(req.projectId).toBe(testProjectId);
    });

    it('should fail with missing API key', async () => {
      const req = {
        headers: {},
        query: {},
        requestId: 'test-request-7',
      } as unknown as Request;

      const res = {} as Response;
      let capturedError: any;
      const next = vi.fn((err?: any) => {
        capturedError = err;
      });

      await authenticateApiKey(req, res, next);
      expect(capturedError?.code).toBe('INVALID_API_KEY');
    });

    it('should fail with invalid API key', async () => {
      const prisma = (await import('../config/database.js')).default;
      vi.mocked(prisma.project.findMany).mockResolvedValueOnce([]);

      const req = {
        headers: {
          'x-api-key': 'invalid-api-key-12345',
        },
        query: {},
        requestId: 'test-request-8',
      } as unknown as Request;

      const res = {} as Response;
      let capturedError: any;
      const next = vi.fn((err?: any) => {
        capturedError = err;
      });

      await authenticateApiKey(req, res, next);
      expect(capturedError?.code).toBe('INVALID_API_KEY');
    });
  });

  describe('requireRole', () => {
    it('should allow user with admin role to access admin endpoint', () => {
      const req = {
        user: {
          userId: testUserId,
          email: testUserEmail,
          role: 'admin',
        },
        requestId: 'test-request-9',
      } as unknown as Request;

      const res = {} as Response;
      let capturedError: any;
      const next = vi.fn((err?: any) => {
        capturedError = err;
      });

      const middleware = requireRole('admin');
      middleware(req, res, next);
      expect(capturedError).toBeUndefined();
    });

    it('should deny user with user role from accessing admin endpoint', () => {
      const req = {
        user: {
          userId: testUserId,
          email: testUserEmail,
          role: 'user',
        },
        requestId: 'test-request-10',
      } as unknown as Request;

      const res = {} as Response;
      let capturedError: any;
      const next = vi.fn((err?: any) => {
        capturedError = err;
      });

      const middleware = requireRole('admin');
      middleware(req, res, next);
      expect(capturedError?.code).toBe('FORBIDDEN');
      expect(capturedError?.message).toContain('Admin access required');
    });

    it('should allow user role for user endpoint', () => {
      const req = {
        user: {
          userId: testUserId,
          email: testUserEmail,
          role: 'user',
        },
        requestId: 'test-request-11',
      } as unknown as Request;

      const res = {} as Response;
      let capturedError: any;
      const next = vi.fn((err?: any) => {
        capturedError = err;
      });

      const middleware = requireRole('user');
      middleware(req, res, next);
      expect(capturedError).toBeUndefined();
    });

    it('should fail if user is not authenticated', () => {
      const req = {
        requestId: 'test-request-12',
      } as unknown as Request;

      const res = {} as Response;
      let capturedError: any;
      const next = vi.fn((err?: any) => {
        capturedError = err;
      });

      const middleware = requireRole('admin');
      middleware(req, res, next);
      expect(capturedError?.code).toBe('UNAUTHORIZED');
    });
  });

  describe('verifyProjectOwnership', () => {
    it('should allow user to access their own project', async () => {
      const prisma = (await import('../config/database.js')).default;
      vi.mocked(prisma.project.findUnique).mockResolvedValueOnce({
        id: testProjectId,
        userId: testUserId,
      } as any);

      const req = {
        user: {
          userId: testUserId,
          email: testUserEmail,
          role: 'user',
        },
        params: {
          projectId: testProjectId,
        },
        requestId: 'test-request-13',
      } as unknown as Request;

      const res = {} as Response;
      let capturedError: any;
      const next = vi.fn((err?: any) => {
        capturedError = err;
      });

      await verifyProjectOwnership(req, res, next);
      expect(capturedError).toBeUndefined();
    });

    it('should deny user from accessing another user project', async () => {
      const prisma = (await import('../config/database.js')).default;
      vi.mocked(prisma.project.findUnique).mockResolvedValueOnce({
        id: testProjectId,
        userId: 'different-user-id',
      } as any);

      const req = {
        user: {
          userId: testUserId,
          email: testUserEmail,
          role: 'user',
        },
        params: {
          projectId: testProjectId,
        },
        requestId: 'test-request-14',
      } as unknown as Request;

      const res = {} as Response;
      let capturedError: any;
      const next = vi.fn((err?: any) => {
        capturedError = err;
      });

      await verifyProjectOwnership(req, res, next);
      expect(capturedError?.code).toBe('FORBIDDEN');
      expect(capturedError?.message).toContain('do not have access');
    });

    it('should fail if project does not exist', async () => {
      const prisma = (await import('../config/database.js')).default;
      vi.mocked(prisma.project.findUnique).mockResolvedValueOnce(null);

      const req = {
        user: {
          userId: testUserId,
          email: testUserEmail,
          role: 'user',
        },
        params: {
          projectId: 'nonexistent-project-id',
        },
        requestId: 'test-request-15',
      } as unknown as Request;

      const res = {} as Response;
      let capturedError: any;
      const next = vi.fn((err?: any) => {
        capturedError = err;
      });

      await verifyProjectOwnership(req, res, next);
      expect(capturedError?.code).toBe('FORBIDDEN');
      expect(capturedError?.message).toContain('not found');
    });

    it('should fail if user is not authenticated', async () => {
      const req = {
        params: {
          projectId: testProjectId,
        },
        requestId: 'test-request-16',
      } as unknown as Request;

      const res = {} as Response;
      let capturedError: any;
      const next = vi.fn((err?: any) => {
        capturedError = err;
      });

      await verifyProjectOwnership(req, res, next);
      expect(capturedError?.code).toBe('UNAUTHORIZED');
    });
  });

  describe('optionalAuthenticateJWT', () => {
    it('should authenticate user with valid token', () => {
      const req = {
        headers: {
          authorization: `Bearer ${validAccessToken}`,
        },
        requestId: 'test-request-17',
      } as unknown as Request;

      const res = {} as Response;
      let capturedError: any;
      const next = vi.fn((err?: any) => {
        capturedError = err;
      });

      optionalAuthenticateJWT(req, res, next);
      expect(capturedError).toBeUndefined();
      expect(req.user).toBeDefined();
      expect(req.user?.userId).toBe(testUserId);
    });

    it('should continue without user if no token provided', () => {
      const req = {
        headers: {},
        requestId: 'test-request-18',
      } as unknown as Request;

      const res = {} as Response;
      let capturedError: any;
      const next = vi.fn((err?: any) => {
        capturedError = err;
      });

      optionalAuthenticateJWT(req, res, next);
      expect(capturedError).toBeUndefined();
      expect(req.user).toBeUndefined();
    });

    it('should continue without user if token is invalid', () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid.token.here',
        },
        requestId: 'test-request-19',
      } as unknown as Request;

      const res = {} as Response;
      let capturedError: any;
      const next = vi.fn((err?: any) => {
        capturedError = err;
      });

      optionalAuthenticateJWT(req, res, next);
      expect(capturedError).toBeUndefined();
      expect(req.user).toBeUndefined();
    });
  });
});
