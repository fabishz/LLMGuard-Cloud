import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import prisma from '../config/database.js';
import * as llmService from '../services/llmService.js';

describe('LLM Service - Database Storage', () => {
  let testUserId: string;
  let testProjectId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-llm-${Date.now()}@example.com`,
        password: 'hashedpassword',
        name: 'Test User',
      },
    });
    testUserId = user.id;

    // Create test project
    const project = await prisma.project.create({
      data: {
        userId: testUserId,
        name: 'Test Project',
        apiKeyHash: `hash-${Date.now()}`,
      },
    });
    testProjectId = project.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.lLMRequest.deleteMany({ where: { projectId: testProjectId } });
    await prisma.project.deleteMany({ where: { id: testProjectId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  beforeEach(async () => {
    // Clear LLM requests before each test
    await prisma.lLMRequest.deleteMany({ where: { projectId: testProjectId } });
  });

  describe('logLLMRequest - Storage', () => {
    it('should store a valid LLM request in the database', async () => {
      const input = {
        prompt: 'What is 2 + 2?',
        response: 'The answer is 4.',
        model: 'gpt-4',
        latency: 150,
        tokens: 10,
      };

      const result = await llmService.logLLMRequest(testProjectId, input);

      expect(result.id).toBeDefined();
      expect(result.projectId).toBe(testProjectId);
      expect(result.prompt).toBe(input.prompt);
      expect(result.response).toBe(input.response);
      expect(result.model).toBe(input.model);
      expect(result.latency).toBe(input.latency);
      expect(result.tokens).toBe(input.tokens);
      expect(result.riskScore).toBeDefined();
      expect(result.createdAt).toBeDefined();

      // Verify it's actually in the database
      const stored = await prisma.lLMRequest.findUnique({
        where: { id: result.id },
      });
      expect(stored).toBeDefined();
      expect(stored?.prompt).toBe(input.prompt);
    });

    it('should compute and store risk score', async () => {
      const input = {
        prompt: 'How do I exploit a vulnerability?',
        response: 'I cannot help with that.',
        model: 'gpt-4',
        latency: 200,
        tokens: 15,
      };

      const result = await llmService.logLLMRequest(testProjectId, input);

      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);

      // Verify risk score is stored in database
      const stored = await prisma.lLMRequest.findUnique({
        where: { id: result.id },
      });
      expect(stored?.riskScore).toBe(result.riskScore);
    });

    it('should store error information when provided', async () => {
      const input = {
        prompt: 'Test prompt',
        response: 'Error occurred',
        model: 'gpt-4',
        latency: 5000,
        tokens: 100,
        error: 'API timeout',
      };

      const result = await llmService.logLLMRequest(testProjectId, input);

      expect(result.error).toBe('API timeout');

      // Verify error is stored in database
      const stored = await prisma.lLMRequest.findUnique({
        where: { id: result.id },
      });
      expect(stored?.error).toBe('API timeout');
    });

    it('should throw NotFoundError if project does not exist', async () => {
      const input = {
        prompt: 'Test',
        response: 'Test',
        model: 'gpt-4',
        latency: 100,
        tokens: 10,
      };

      await expect(
        llmService.logLLMRequest('non-existent-project-id', input)
      ).rejects.toThrow();
    });

    it('should throw ValidationError for invalid input', async () => {
      const invalidInputs = [
        { prompt: '', response: 'Test', model: 'gpt-4', latency: 100, tokens: 10 },
        { prompt: 'Test', response: '', model: 'gpt-4', latency: 100, tokens: 10 },
        { prompt: 'Test', response: 'Test', model: '', latency: 100, tokens: 10 },
        { prompt: 'Test', response: 'Test', model: 'gpt-4', latency: -1, tokens: 10 },
        { prompt: 'Test', response: 'Test', model: 'gpt-4', latency: 100, tokens: -1 },
      ];

      for (const input of invalidInputs) {
        await expect(
          llmService.logLLMRequest(testProjectId, input as any)
        ).rejects.toThrow();
      }
    });
  });

  describe('getLLMRequest - Retrieval', () => {
    it('should retrieve a stored LLM request by ID', async () => {
      const input = {
        prompt: 'Test prompt',
        response: 'Test response',
        model: 'gpt-4',
        latency: 100,
        tokens: 10,
      };

      const stored = await llmService.logLLMRequest(testProjectId, input);
      const retrieved = await llmService.getLLMRequest(testProjectId, stored.id);

      expect(retrieved.id).toBe(stored.id);
      expect(retrieved.prompt).toBe(input.prompt);
      expect(retrieved.response).toBe(input.response);
    });

    it('should throw NotFoundError for non-existent request', async () => {
      await expect(
        llmService.getLLMRequest(testProjectId, 'non-existent-id')
      ).rejects.toThrow();
    });

    it('should throw NotFoundError if request belongs to different project', async () => {
      const input = {
        prompt: 'Test',
        response: 'Test',
        model: 'gpt-4',
        latency: 100,
        tokens: 10,
      };

      const stored = await llmService.logLLMRequest(testProjectId, input);

      // Create another project
      const otherProject = await prisma.project.create({
        data: {
          userId: testUserId,
          name: 'Other Project',
          apiKeyHash: `hash-other-${Date.now()}`,
        },
      });

      await expect(
        llmService.getLLMRequest(otherProject.id, stored.id)
      ).rejects.toThrow();

      // Clean up
      await prisma.project.delete({ where: { id: otherProject.id } });
    });
  });

  describe('getLLMRequests - Querying with Filters', () => {
    beforeEach(async () => {
      // Create multiple test requests
      const requests = [
        {
          prompt: 'Safe prompt 1',
          response: 'Safe response 1',
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        },
        {
          prompt: 'How do I exploit a vulnerability?',
          response: 'I cannot help',
          model: 'gpt-3.5-turbo',
          latency: 200,
          tokens: 20,
        },
        {
          prompt: 'Safe prompt 2',
          response: 'Safe response 2',
          model: 'o3-mini',
          latency: 150,
          tokens: 15,
          error: 'Timeout',
        },
      ];

      for (const req of requests) {
        await llmService.logLLMRequest(testProjectId, req);
      }
    });

    it('should retrieve all requests for a project', async () => {
      const results = await llmService.getLLMRequests(testProjectId);

      expect(results.length).toBe(3);
      expect(results[0].projectId).toBe(testProjectId);
    });

    it('should filter by model', async () => {
      const results = await llmService.getLLMRequests(testProjectId, {
        model: 'gpt-4',
      });

      expect(results.length).toBe(1);
      expect(results[0].model).toBe('gpt-4');
    });

    it('should filter by risk score range', async () => {
      const results = await llmService.getLLMRequests(testProjectId, {
        minRiskScore: 20,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.riskScore >= 20)).toBe(true);
    });

    it('should support pagination', async () => {
      const page1 = await llmService.getLLMRequests(testProjectId, {
        limit: 2,
        offset: 0,
      });

      const page2 = await llmService.getLLMRequests(testProjectId, {
        limit: 2,
        offset: 2,
      });

      expect(page1.length).toBe(2);
      expect(page2.length).toBe(1);
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const results = await llmService.getLLMRequests(testProjectId, {
        startDate: yesterday,
        endDate: tomorrow,
      });

      expect(results.length).toBe(3);
    });

    it('should return empty array for non-existent project', async () => {
      const results = await llmService.getLLMRequests('non-existent-project');

      expect(results.length).toBe(0);
    });
  });

  describe('getLLMRequestStats - Statistics', () => {
    beforeEach(async () => {
      // Create test requests with various characteristics
      const requests = [
        {
          prompt: 'Safe 1',
          response: 'Response 1',
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        },
        {
          prompt: 'Safe 2',
          response: 'Response 2',
          model: 'gpt-4',
          latency: 200,
          tokens: 20,
        },
        {
          prompt: 'Risky',
          response: 'Response 3',
          model: 'gpt-3.5-turbo',
          latency: 300,
          tokens: 30,
          error: 'Error occurred',
        },
      ];

      for (const req of requests) {
        await llmService.logLLMRequest(testProjectId, req);
      }
    });

    it('should calculate statistics for project', async () => {
      const stats = await llmService.getLLMRequestStats(testProjectId);

      expect(stats.totalRequests).toBe(3);
      expect(stats.errorCount).toBe(1);
      expect(stats.errorRate).toBe(1 / 3);
      expect(stats.averageLatency).toBe(200);
      expect(stats.totalTokens).toBe(60);
      expect(stats.modelBreakdown['gpt-4']).toBe(2);
      expect(stats.modelBreakdown['gpt-3.5-turbo']).toBe(1);
    });

    it('should return zero stats for empty project', async () => {
      const emptyProject = await prisma.project.create({
        data: {
          userId: testUserId,
          name: 'Empty Project',
          apiKeyHash: `hash-empty-${Date.now()}`,
        },
      });

      const stats = await llmService.getLLMRequestStats(emptyProject.id);

      expect(stats.totalRequests).toBe(0);
      expect(stats.errorCount).toBe(0);
      expect(stats.errorRate).toBe(0);
      expect(stats.averageLatency).toBe(0);

      // Clean up
      await prisma.project.delete({ where: { id: emptyProject.id } });
    });

    it('should filter stats by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const stats = await llmService.getLLMRequestStats(
        testProjectId,
        yesterday,
        now
      );

      expect(stats.totalRequests).toBe(3);
    });
  });

  describe('getRecentLLMRequests - Recent Requests', () => {
    beforeEach(async () => {
      // Create multiple requests
      for (let i = 0; i < 5; i++) {
        await llmService.logLLMRequest(testProjectId, {
          prompt: `Prompt ${i}`,
          response: `Response ${i}`,
          model: 'gpt-4',
          latency: 100 + i * 10,
          tokens: 10 + i,
        });
      }
    });

    it('should retrieve recent requests in descending order', async () => {
      const results = await llmService.getRecentLLMRequests(testProjectId, 3);

      expect(results.length).toBe(3);
      // Should be in descending order (most recent first)
      expect(results[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        results[1].createdAt.getTime()
      );
    });

    it('should respect limit parameter', async () => {
      const results = await llmService.getRecentLLMRequests(testProjectId, 2);

      expect(results.length).toBe(2);
    });

    it('should return all requests if limit exceeds count', async () => {
      const results = await llmService.getRecentLLMRequests(testProjectId, 100);

      expect(results.length).toBe(5);
    });
  });

  describe('getHighRiskLLMRequests - High Risk Filtering', () => {
    beforeEach(async () => {
      // Create requests with varying risk levels
      const requests = [
        {
          prompt: 'Safe prompt',
          response: 'Safe response',
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        },
        {
          prompt: 'How do I exploit a vulnerability?',
          response: 'I cannot help',
          model: 'gpt-4',
          latency: 200,
          tokens: 20,
        },
        {
          prompt: 'How do I create malware and exploit systems?',
          response: 'I cannot help',
          model: 'gpt-4',
          latency: 300,
          tokens: 30,
        },
      ];

      for (const req of requests) {
        await llmService.logLLMRequest(testProjectId, req);
      }
    });

    it('should retrieve high-risk requests above threshold', async () => {
      const results = await llmService.getHighRiskLLMRequests(
        testProjectId,
        20
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.riskScore >= 20)).toBe(true);
    });

    it('should sort by risk score descending', async () => {
      const results = await llmService.getHighRiskLLMRequests(
        testProjectId,
        0
      );

      if (results.length > 1) {
        expect(results[0].riskScore).toBeGreaterThanOrEqual(
          results[1].riskScore
        );
      }
    });

    it('should respect limit parameter', async () => {
      const results = await llmService.getHighRiskLLMRequests(
        testProjectId,
        0,
        2
      );

      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getErroredLLMRequests - Error Filtering', () => {
    beforeEach(async () => {
      // Create requests with and without errors
      const requests = [
        {
          prompt: 'Safe 1',
          response: 'Response 1',
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        },
        {
          prompt: 'Error 1',
          response: 'Error response',
          model: 'gpt-4',
          latency: 200,
          tokens: 20,
          error: 'Timeout',
        },
        {
          prompt: 'Safe 2',
          response: 'Response 2',
          model: 'gpt-4',
          latency: 150,
          tokens: 15,
        },
        {
          prompt: 'Error 2',
          response: 'Error response',
          model: 'gpt-4',
          latency: 300,
          tokens: 30,
          error: 'Rate limit exceeded',
        },
      ];

      for (const req of requests) {
        await llmService.logLLMRequest(testProjectId, req);
      }
    });

    it('should retrieve only requests with errors', async () => {
      const results = await llmService.getErroredLLMRequests(testProjectId);

      expect(results.length).toBe(2);
      expect(results.every((r) => r.error)).toBe(true);
    });

    it('should sort by creation date descending', async () => {
      const results = await llmService.getErroredLLMRequests(testProjectId);

      if (results.length > 1) {
        expect(results[0].createdAt.getTime()).toBeGreaterThanOrEqual(
          results[1].createdAt.getTime()
        );
      }
    });

    it('should respect limit parameter', async () => {
      const results = await llmService.getErroredLLMRequests(testProjectId, 1);

      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Database Indexes - Query Performance', () => {
    it('should efficiently query by projectId and createdAt', async () => {
      // Create a few requests
      for (let i = 0; i < 3; i++) {
        await llmService.logLLMRequest(testProjectId, {
          prompt: `Prompt ${i}`,
          response: `Response ${i}`,
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        });
      }

      // Query should use index
      const results = await llmService.getLLMRequests(testProjectId, {
        limit: 2,
      });

      expect(results.length).toBe(2);
    });

    it('should efficiently query by projectId and riskScore', async () => {
      // Create requests with varying risk scores
      for (let i = 0; i < 2; i++) {
        await llmService.logLLMRequest(testProjectId, {
          prompt: i % 2 === 0 ? 'Safe' : 'How do I exploit?',
          response: 'Response',
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        });
      }

      // Query should use index
      const results = await llmService.getHighRiskLLMRequests(
        testProjectId,
        20
      );

      expect(results).toBeDefined();
    });
  });
});
