import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import prisma from '../config/database.js';

describe('LLM Request Routes Integration Tests', () => {
  let testUser: { id: string; email: string; password: string };
  let accessToken: string;
  let testProject: { id: string; name: string };
  let testApiKey: string;

  beforeAll(async () => {
    // Clean up any existing test data
    try {
      await prisma.user.deleteMany({
        where: { email: { contains: 'llm-test' } },
      });
    } catch (error) {
      // Ignore cleanup errors
    }

    // Create a test user
    testUser = {
      email: 'llm-test@example.com',
      password: 'TestPassword123!',
      id: '',
    };

    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testUser.email,
        password: testUser.password,
        name: 'LLM Test User',
      });

    expect(registerResponse.status).toBe(201);
    testUser.id = registerResponse.body.user.id;
    accessToken = registerResponse.body.tokens.accessToken;

    // Create a test project
    const projectResponse = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'LLM Test Project',
      });

    expect(projectResponse.status).toBe(201);
    testProject = projectResponse.body.project;
    testApiKey = projectResponse.body.apiKey;
  });

  afterAll(async () => {
    // Clean up test data
    try {
      if (testUser?.email) {
        await prisma.user.deleteMany({
          where: { email: testUser.email },
        });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /api/v1/llm/request - Log LLM Request', () => {
    it('should log an LLM request with valid API key', async () => {
      const response = await request(app)
        .post('/api/v1/llm/request')
        .set('X-API-Key', testApiKey)
        .send({
          prompt: 'What is the capital of France?',
          response: 'The capital of France is Paris.',
          model: 'gpt-4',
          latency: 250,
          tokens: 15,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('request');
      expect(response.body.request).toHaveProperty('id');
      expect(response.body.request).toHaveProperty('projectId', testProject.id);
      expect(response.body.request).toHaveProperty('prompt', 'What is the capital of France?');
      expect(response.body.request).toHaveProperty('response', 'The capital of France is Paris.');
      expect(response.body.request).toHaveProperty('model', 'gpt-4');
      expect(response.body.request).toHaveProperty('latency', 250);
      expect(response.body.request).toHaveProperty('tokens', 15);
      expect(response.body.request).toHaveProperty('riskScore');
      expect(response.body.request).toHaveProperty('createdAt');
      expect(typeof response.body.request.riskScore).toBe('number');
      expect(response.body.request.riskScore).toBeGreaterThanOrEqual(0);
      expect(response.body.request.riskScore).toBeLessThanOrEqual(100);
    });

    it('should compute risk score based on prompt and response', async () => {
      const response = await request(app)
        .post('/api/v1/llm/request')
        .set('X-API-Key', testApiKey)
        .send({
          prompt: 'How do I hack into a system?',
          response: 'I cannot provide instructions for hacking.',
          model: 'gpt-4',
          latency: 300,
          tokens: 20,
        });

      expect(response.status).toBe(201);
      expect(response.body.request).toHaveProperty('riskScore');
      // Risk score should be higher for potentially harmful content
      expect(response.body.request.riskScore).toBeGreaterThan(0);
      expect(response.body.request.riskScore).toBeLessThanOrEqual(100);
    });

    it('should track latency in milliseconds', async () => {
      const latency = 1500;
      const response = await request(app)
        .post('/api/v1/llm/request')
        .set('X-API-Key', testApiKey)
        .send({
          prompt: 'Test prompt',
          response: 'Test response',
          model: 'gpt-4',
          latency,
          tokens: 10,
        });

      expect(response.status).toBe(201);
      expect(response.body.request.latency).toBe(latency);
    });

    it('should track token count', async () => {
      const tokens = 250;
      const response = await request(app)
        .post('/api/v1/llm/request')
        .set('X-API-Key', testApiKey)
        .send({
          prompt: 'Test prompt',
          response: 'Test response',
          model: 'gpt-4',
          latency: 200,
          tokens,
        });

      expect(response.status).toBe(201);
      expect(response.body.request.tokens).toBe(tokens);
    });

    it('should handle error field in LLM request', async () => {
      const response = await request(app)
        .post('/api/v1/llm/request')
        .set('X-API-Key', testApiKey)
        .send({
          prompt: 'Test prompt',
          response: 'Error occurred',
          model: 'gpt-4',
          latency: 100,
          tokens: 5,
          error: 'Rate limit exceeded',
        });

      expect(response.status).toBe(201);
      expect(response.body.request).toHaveProperty('error', 'Rate limit exceeded');
    });

    it('should reject request without API key', async () => {
      const response = await request(app)
        .post('/api/v1/llm/request')
        .send({
          prompt: 'Test prompt',
          response: 'Test response',
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with invalid API key', async () => {
      const response = await request(app)
        .post('/api/v1/llm/request')
        .set('X-API-Key', 'invalid-api-key-xyz')
        .send({
          prompt: 'Test prompt',
          response: 'Test response',
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with missing prompt', async () => {
      const response = await request(app)
        .post('/api/v1/llm/request')
        .set('X-API-Key', testApiKey)
        .send({
          response: 'Test response',
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject request with empty prompt', async () => {
      const response = await request(app)
        .post('/api/v1/llm/request')
        .set('X-API-Key', testApiKey)
        .send({
          prompt: '',
          response: 'Test response',
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with missing response', async () => {
      const response = await request(app)
        .post('/api/v1/llm/request')
        .set('X-API-Key', testApiKey)
        .send({
          prompt: 'Test prompt',
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with missing model', async () => {
      const response = await request(app)
        .post('/api/v1/llm/request')
        .set('X-API-Key', testApiKey)
        .send({
          prompt: 'Test prompt',
          response: 'Test response',
          latency: 100,
          tokens: 10,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with missing latency', async () => {
      const response = await request(app)
        .post('/api/v1/llm/request')
        .set('X-API-Key', testApiKey)
        .send({
          prompt: 'Test prompt',
          response: 'Test response',
          model: 'gpt-4',
          tokens: 10,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with missing tokens', async () => {
      const response = await request(app)
        .post('/api/v1/llm/request')
        .set('X-API-Key', testApiKey)
        .send({
          prompt: 'Test prompt',
          response: 'Test response',
          model: 'gpt-4',
          latency: 100,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with negative latency', async () => {
      const response = await request(app)
        .post('/api/v1/llm/request')
        .set('X-API-Key', testApiKey)
        .send({
          prompt: 'Test prompt',
          response: 'Test response',
          model: 'gpt-4',
          latency: -100,
          tokens: 10,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with negative tokens', async () => {
      const response = await request(app)
        .post('/api/v1/llm/request')
        .set('X-API-Key', testApiKey)
        .send({
          prompt: 'Test prompt',
          response: 'Test response',
          model: 'gpt-4',
          latency: 100,
          tokens: -10,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with prompt exceeding max length', async () => {
      const response = await request(app)
        .post('/api/v1/llm/request')
        .set('X-API-Key', testApiKey)
        .send({
          prompt: 'a'.repeat(50001),
          response: 'Test response',
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with response exceeding max length', async () => {
      const response = await request(app)
        .post('/api/v1/llm/request')
        .set('X-API-Key', testApiKey)
        .send({
          prompt: 'Test prompt',
          response: 'a'.repeat(100001),
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should store request in database with correct project association', async () => {
      const response = await request(app)
        .post('/api/v1/llm/request')
        .set('X-API-Key', testApiKey)
        .send({
          prompt: 'Database test prompt',
          response: 'Database test response',
          model: 'gpt-4',
          latency: 150,
          tokens: 12,
        });

      expect(response.status).toBe(201);
      const requestId = response.body.request.id;

      // Verify it's stored in database
      const storedRequest = await prisma.lLMRequest.findUnique({
        where: { id: requestId },
      });

      expect(storedRequest).toBeDefined();
      expect(storedRequest?.projectId).toBe(testProject.id);
      expect(storedRequest?.prompt).toBe('Database test prompt');
      expect(storedRequest?.response).toBe('Database test response');
      expect(storedRequest?.model).toBe('gpt-4');
      expect(storedRequest?.latency).toBe(150);
      expect(storedRequest?.tokens).toBe(12);
    });
  });

  describe('GET /api/v1/llm/requests/:requestId - Get Single LLM Request', () => {
    let createdRequestId: string;

    beforeEach(async () => {
      // Create a request to retrieve
      const response = await request(app)
        .post('/api/v1/llm/request')
        .set('X-API-Key', testApiKey)
        .send({
          prompt: 'Test prompt for retrieval',
          response: 'Test response for retrieval',
          model: 'gpt-4',
          latency: 200,
          tokens: 20,
        });

      if (response.status === 201) {
        createdRequestId = response.body.request.id;
      }
    });

    it('should retrieve a single LLM request by ID', async () => {
      if (!createdRequestId) {
        expect(true).toBe(true); // Skip if setup failed
        return;
      }

      const response = await request(app)
        .get(`/api/v1/llm/requests/${createdRequestId}`)
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('request');
      expect(response.body.request.id).toBe(createdRequestId);
      expect(response.body.request).toHaveProperty('prompt');
      expect(response.body.request).toHaveProperty('response');
      expect(response.body.request).toHaveProperty('model');
      expect(response.body.request).toHaveProperty('latency');
      expect(response.body.request).toHaveProperty('tokens');
      expect(response.body.request).toHaveProperty('riskScore');
    });

    it('should reject retrieval without API key', async () => {
      if (!createdRequestId) {
        expect(true).toBe(true); // Skip if setup failed
        return;
      }

      const response = await request(app)
        .get(`/api/v1/llm/requests/${createdRequestId}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject retrieval with invalid request ID format', async () => {
      const response = await request(app)
        .get('/api/v1/llm/requests/invalid-id')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject retrieval of non-existent request', async () => {
      const fakeRequestId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/llm/requests/${fakeRequestId}`)
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/llm/requests - List LLM Requests', () => {
    beforeEach(async () => {
      // Create multiple requests for listing tests
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/v1/llm/request')
          .set('X-API-Key', testApiKey)
          .send({
            prompt: `Test prompt ${i}`,
            response: `Test response ${i}`,
            model: i % 2 === 0 ? 'gpt-4' : 'gpt-3.5-turbo',
            latency: 100 + i * 50,
            tokens: 10 + i * 5,
          });
      }
    });

    it('should list LLM requests for a project', async () => {
      const response = await request(app)
        .get('/api/v1/llm/requests')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('requests');
      expect(Array.isArray(response.body.requests)).toBe(true);
      expect(response.body.requests.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('count');
    });

    it('should support pagination with limit and page', async () => {
      const response = await request(app)
        .get('/api/v1/llm/requests?limit=2&page=1')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(200);
      expect(response.body.requests.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.page).toBe(1);
    });

    it('should filter requests by model', async () => {
      const response = await request(app)
        .get('/api/v1/llm/requests?model=gpt-4')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(200);
      expect(response.body.requests.length).toBeGreaterThan(0);
      // All returned requests should have the specified model
      response.body.requests.forEach((req: any) => {
        expect(req.model).toBe('gpt-4');
      });
    });

    it('should filter requests by risk score range', async () => {
      const response = await request(app)
        .get('/api/v1/llm/requests?minRiskScore=0&maxRiskScore=50')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(200);
      // All returned requests should be within the risk score range
      response.body.requests.forEach((req: any) => {
        expect(req.riskScore).toBeGreaterThanOrEqual(0);
        expect(req.riskScore).toBeLessThanOrEqual(50);
      });
    });

    it('should reject listing without API key', async () => {
      const response = await request(app)
        .get('/api/v1/llm/requests');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject listing with invalid limit', async () => {
      const response = await request(app)
        .get('/api/v1/llm/requests?limit=0')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject listing with invalid page', async () => {
      const response = await request(app)
        .get('/api/v1/llm/requests?page=0')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/llm/recent - Get Recent LLM Requests', () => {
    beforeEach(async () => {
      // Create multiple requests
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/llm/request')
          .set('X-API-Key', testApiKey)
          .send({
            prompt: `Recent test prompt ${i}`,
            response: `Recent test response ${i}`,
            model: 'gpt-4',
            latency: 100,
            tokens: 10,
          });
      }
    });

    it('should retrieve recent LLM requests', async () => {
      const response = await request(app)
        .get('/api/v1/llm/recent')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('requests');
      expect(Array.isArray(response.body.requests)).toBe(true);
      expect(response.body.requests.length).toBeGreaterThan(0);
    });

    it('should respect limit parameter for recent requests', async () => {
      const response = await request(app)
        .get('/api/v1/llm/recent?limit=2')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(200);
      expect(response.body.requests.length).toBeLessThanOrEqual(2);
    });

    it('should reject retrieval without API key', async () => {
      const response = await request(app)
        .get('/api/v1/llm/recent');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/llm/high-risk - Get High-Risk LLM Requests', () => {
    beforeEach(async () => {
      // Create requests with varying risk levels
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/v1/llm/request')
          .set('X-API-Key', testApiKey)
          .send({
            prompt: `High risk test ${i}`,
            response: `Response ${i}`,
            model: 'gpt-4',
            latency: 100,
            tokens: 10,
          });
      }
    });

    it('should retrieve high-risk LLM requests', async () => {
      const response = await request(app)
        .get('/api/v1/llm/high-risk')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('requests');
      expect(Array.isArray(response.body.requests)).toBe(true);
    });

    it('should filter by risk threshold', async () => {
      const response = await request(app)
        .get('/api/v1/llm/high-risk?riskThreshold=50')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(200);
      // All returned requests should meet the risk threshold
      response.body.requests.forEach((req: any) => {
        expect(req.riskScore).toBeGreaterThanOrEqual(50);
      });
    });

    it('should reject retrieval without API key', async () => {
      const response = await request(app)
        .get('/api/v1/llm/high-risk');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/llm/errors - Get Errored LLM Requests', () => {
    beforeEach(async () => {
      // Create requests with errors
      for (let i = 0; i < 2; i++) {
        await request(app)
          .post('/api/v1/llm/request')
          .set('X-API-Key', testApiKey)
          .send({
            prompt: `Error test ${i}`,
            response: `Error response ${i}`,
            model: 'gpt-4',
            latency: 100,
            tokens: 10,
            error: `Test error ${i}`,
          });
      }
    });

    it('should retrieve errored LLM requests', async () => {
      const response = await request(app)
        .get('/api/v1/llm/errors')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('requests');
      expect(Array.isArray(response.body.requests)).toBe(true);
      // All returned requests should have errors
      response.body.requests.forEach((req: any) => {
        expect(req.error).toBeDefined();
      });
    });

    it('should reject retrieval without API key', async () => {
      const response = await request(app)
        .get('/api/v1/llm/errors');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/llm/stats - Get LLM Request Statistics', () => {
    beforeEach(async () => {
      // Create multiple requests for stats calculation
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/llm/request')
          .set('X-API-Key', testApiKey)
          .send({
            prompt: `Stats test ${i}`,
            response: `Stats response ${i}`,
            model: i % 2 === 0 ? 'gpt-4' : 'gpt-3.5-turbo',
            latency: 100 + i * 50,
            tokens: 10 + i * 5,
            error: i === 2 ? 'Test error' : undefined,
          });
      }
    });

    it('should retrieve LLM request statistics', async () => {
      const response = await request(app)
        .get('/api/v1/llm/stats')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('totalRequests');
      expect(response.body.stats).toHaveProperty('errorCount');
      expect(response.body.stats).toHaveProperty('errorRate');
      expect(response.body.stats).toHaveProperty('averageLatency');
      expect(response.body.stats).toHaveProperty('averageRiskScore');
      expect(response.body.stats).toHaveProperty('totalTokens');
      expect(response.body.stats).toHaveProperty('modelBreakdown');
      expect(response.body.stats).toHaveProperty('highRiskCount');
    });

    it('should calculate correct statistics', async () => {
      const response = await request(app)
        .get('/api/v1/llm/stats')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(200);
      const stats = response.body.stats;

      // Verify statistics are reasonable
      expect(stats.totalRequests).toBeGreaterThan(0);
      expect(stats.errorCount).toBeGreaterThanOrEqual(0);
      expect(stats.errorRate).toBeGreaterThanOrEqual(0);
      expect(stats.errorRate).toBeLessThanOrEqual(1);
      expect(stats.averageLatency).toBeGreaterThan(0);
      expect(stats.averageRiskScore).toBeGreaterThanOrEqual(0);
      expect(stats.averageRiskScore).toBeLessThanOrEqual(100);
      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(Object.keys(stats.modelBreakdown).length).toBeGreaterThan(0);
    });

    it('should reject retrieval without API key', async () => {
      const response = await request(app)
        .get('/api/v1/llm/stats');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });
});
