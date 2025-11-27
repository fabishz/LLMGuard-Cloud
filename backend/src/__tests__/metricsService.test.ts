import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as metricsService from '../services/metricsService.js';
import prisma from '../config/database.js';
import * as authService from '../services/authService.js';
import * as projectService from '../services/projectService.js';

describe('Metrics Service', () => {
  let testUser: any;
  let testProject: any;
  const testEmail = 'metrics-test-' + Date.now() + '@example.com';
  const testPassword = 'TestPassword123!';

  beforeAll(async () => {
    // Create test user
    const userResponse = await authService.register({
      email: testEmail,
      password: testPassword,
      name: 'Metrics Test User',
    });
    testUser = userResponse.user;

    // Create test project
    const projectResponse = await projectService.createProject(testUser.id, {
      name: 'Metrics Test Project',
    });
    testProject = projectResponse;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.lLMRequest.deleteMany({
      where: { projectId: testProject.id },
    });
    await prisma.project.deleteMany({
      where: { id: testProject.id },
    });
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
  });

  describe('Daily Summary Aggregation', () => {
    it('should return empty metrics for project with no requests', async () => {
      const metrics = await metricsService.getProjectMetrics(testProject.id);

      expect(metrics).toBeDefined();
      expect(metrics.projectId).toBe(testProject.id);
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.averageLatency).toBe(0);
      expect(metrics.totalTokens).toBe(0);
      expect(metrics.estimatedCost).toBe(0);
      expect(metrics.modelBreakdown).toEqual([]);
      expect(metrics.dailySummary).toEqual([]);
    });

    it('should aggregate daily summaries correctly', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Create requests for today
      await prisma.lLMRequest.createMany({
        data: [
          {
            projectId: testProject.id,
            prompt: 'Test prompt 1',
            response: 'Test response 1',
            model: 'gpt-4',
            latency: 1000,
            tokens: 100,
            riskScore: 20,
            createdAt: new Date(today.getTime() + 1000),
          },
          {
            projectId: testProject.id,
            prompt: 'Test prompt 2',
            response: 'Test response 2',
            model: 'gpt-4',
            latency: 2000,
            tokens: 200,
            riskScore: 30,
            createdAt: new Date(today.getTime() + 2000),
          },
        ],
      });

      const metrics = await metricsService.getProjectMetrics(testProject.id);

      expect(metrics.totalRequests).toBe(2);
      expect(metrics.totalTokens).toBe(300);
      expect(metrics.dailySummary.length).toBeGreaterThan(0);

      const todaySummary = metrics.dailySummary.find(
        (s) => s.date === today.toISOString().split('T')[0]
      );
      expect(todaySummary).toBeDefined();
      expect(todaySummary?.requests).toBe(2);
      expect(todaySummary?.tokens).toBe(300);
    });

    it('should calculate average latency in daily summary', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Create requests with known latencies
      await prisma.lLMRequest.deleteMany({
        where: { projectId: testProject.id },
      });

      await prisma.lLMRequest.createMany({
        data: [
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-4',
            latency: 1000,
            tokens: 100,
            riskScore: 20,
            createdAt: new Date(today.getTime() + 1000),
          },
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-4',
            latency: 3000,
            tokens: 100,
            riskScore: 20,
            createdAt: new Date(today.getTime() + 2000),
          },
        ],
      });

      const metrics = await metricsService.getProjectMetrics(testProject.id);
      const todaySummary = metrics.dailySummary.find(
        (s) => s.date === today.toISOString().split('T')[0]
      );

      expect(todaySummary?.avgLatency).toBe(2000); // (1000 + 3000) / 2
    });
  });

  describe('Error Rate Calculation', () => {
    it('should calculate error rate correctly', async () => {
      await prisma.lLMRequest.deleteMany({
        where: { projectId: testProject.id },
      });

      // Create 10 requests: 3 with errors, 7 without
      await prisma.lLMRequest.createMany({
        data: [
          ...Array(7).fill(null).map((_, i) => ({
            projectId: testProject.id,
            prompt: `Test ${i}`,
            response: `Response ${i}`,
            model: 'gpt-4',
            latency: 1000,
            tokens: 100,
            riskScore: 20,
            error: null,
          })),
          ...Array(3).fill(null).map((_, i) => ({
            projectId: testProject.id,
            prompt: `Error ${i}`,
            response: `Error response ${i}`,
            model: 'gpt-4',
            latency: 1000,
            tokens: 100,
            riskScore: 20,
            error: 'Test error',
          })),
        ],
      });

      const metrics = await metricsService.getProjectMetrics(testProject.id);

      expect(metrics.totalRequests).toBe(10);
      expect(metrics.errorCount).toBe(3);
      expect(metrics.errorRate).toBe(0.3); // 3/10
    });

    it('should get error rate stats by model', async () => {
      await prisma.lLMRequest.deleteMany({
        where: { projectId: testProject.id },
      });

      await prisma.lLMRequest.createMany({
        data: [
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-4',
            latency: 1000,
            tokens: 100,
            riskScore: 20,
            error: 'Error 1',
          },
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-3.5-turbo',
            latency: 1000,
            tokens: 100,
            riskScore: 20,
            error: 'Error 2',
          },
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-3.5-turbo',
            latency: 1000,
            tokens: 100,
            riskScore: 20,
            error: null,
          },
        ],
      });

      const stats = await metricsService.getErrorRateStats(testProject.id);

      expect(stats.totalRequests).toBe(3);
      expect(stats.errorCount).toBe(2);
      expect(stats.errorRate).toBeCloseTo(0.667, 2);
      expect(stats.errorsByModel['gpt-4']).toBe(1);
      expect(stats.errorsByModel['gpt-3.5-turbo']).toBe(1);
    });
  });

  describe('Cost Estimation', () => {
    it('should calculate cost based on model pricing', async () => {
      await prisma.lLMRequest.deleteMany({
        where: { projectId: testProject.id },
      });

      // Create requests with known token counts and models
      await prisma.lLMRequest.createMany({
        data: [
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-4', // $0.03 per 1K tokens
            latency: 1000,
            tokens: 1000, // Should cost $0.03
            riskScore: 20,
          },
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-3.5-turbo', // $0.0005 per 1K tokens
            latency: 1000,
            tokens: 1000, // Should cost $0.0005
            riskScore: 20,
          },
        ],
      });

      const estimate = await metricsService.getCostEstimate(testProject.id);

      expect(estimate.requestCount).toBe(2);
      expect(estimate.totalTokens).toBe(2000);
      expect(estimate.costByModel['gpt-4']).toBe(0.03);
      expect(estimate.costByModel['gpt-3.5-turbo']).toBe(0.0005);
      expect(estimate.totalCost).toBeCloseTo(0.0305, 4);
    });

    it('should round costs to 2 decimal places', async () => {
      await prisma.lLMRequest.deleteMany({
        where: { projectId: testProject.id },
      });

      await prisma.lLMRequest.createMany({
        data: [
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-4',
            latency: 1000,
            tokens: 333, // 333 * 0.03 / 1000 = 0.00999
            riskScore: 20,
          },
        ],
      });

      const estimate = await metricsService.getCostEstimate(testProject.id);

      expect(estimate.totalCost).toBe(0.01); // Rounded to 2 decimal places
    });

    it('should calculate average cost per request', async () => {
      await prisma.lLMRequest.deleteMany({
        where: { projectId: testProject.id },
      });

      await prisma.lLMRequest.createMany({
        data: [
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-4',
            latency: 1000,
            tokens: 1000,
            riskScore: 20,
          },
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-4',
            latency: 1000,
            tokens: 1000,
            riskScore: 20,
          },
        ],
      });

      const estimate = await metricsService.getCostEstimate(testProject.id);

      expect(estimate.requestCount).toBe(2);
      expect(estimate.totalCost).toBe(0.06);
      expect(estimate.averageCostPerRequest).toBe(0.03);
    });
  });

  describe('Model Breakdown', () => {
    it('should calculate model usage breakdown', async () => {
      await prisma.lLMRequest.deleteMany({
        where: { projectId: testProject.id },
      });

      await prisma.lLMRequest.createMany({
        data: [
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-4',
            latency: 1000,
            tokens: 500,
            riskScore: 20,
          },
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-4',
            latency: 2000,
            tokens: 300,
            riskScore: 20,
          },
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-3.5-turbo',
            latency: 500,
            tokens: 200,
            riskScore: 20,
          },
        ],
      });

      const breakdown = await metricsService.getModelUsageBreakdown(testProject.id);

      expect(breakdown.length).toBe(2);

      const gpt4 = breakdown.find((m) => m.model === 'gpt-4');
      expect(gpt4?.count).toBe(2);
      expect(gpt4?.totalTokens).toBe(800);
      expect(gpt4?.avgLatency).toBe(1500); // (1000 + 2000) / 2

      const gpt35 = breakdown.find((m) => m.model === 'gpt-3.5-turbo');
      expect(gpt35?.count).toBe(1);
      expect(gpt35?.totalTokens).toBe(200);
      expect(gpt35?.avgLatency).toBe(500);
    });

    it('should sort model breakdown by count descending', async () => {
      await prisma.lLMRequest.deleteMany({
        where: { projectId: testProject.id },
      });

      await prisma.lLMRequest.createMany({
        data: [
          ...Array(5).fill(null).map((_, i) => ({
            projectId: testProject.id,
            prompt: `Test ${i}`,
            response: 'Response',
            model: 'gpt-3.5-turbo',
            latency: 500,
            tokens: 100,
            riskScore: 20,
          })),
          ...Array(3).fill(null).map((_, i) => ({
            projectId: testProject.id,
            prompt: `Test ${i}`,
            response: 'Response',
            model: 'gpt-4',
            latency: 1000,
            tokens: 100,
            riskScore: 20,
          })),
        ],
      });

      const breakdown = await metricsService.getModelUsageBreakdown(testProject.id);

      expect(breakdown[0].model).toBe('gpt-3.5-turbo');
      expect(breakdown[0].count).toBe(5);
      expect(breakdown[1].model).toBe('gpt-4');
      expect(breakdown[1].count).toBe(3);
    });

    it('should calculate total cost per model', async () => {
      await prisma.lLMRequest.deleteMany({
        where: { projectId: testProject.id },
      });

      await prisma.lLMRequest.createMany({
        data: [
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-4', // $0.03 per 1K
            latency: 1000,
            tokens: 1000,
            riskScore: 20,
          },
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-3.5-turbo', // $0.0005 per 1K
            latency: 500,
            tokens: 1000,
            riskScore: 20,
          },
        ],
      });

      const breakdown = await metricsService.getModelUsageBreakdown(testProject.id);

      const gpt4 = breakdown.find((m) => m.model === 'gpt-4');
      expect(gpt4?.totalCost).toBe(0.03);

      const gpt35 = breakdown.find((m) => m.model === 'gpt-3.5-turbo');
      expect(gpt35?.totalCost).toBe(0.0005);
    });
  });

  describe('Token Usage Statistics', () => {
    it('should calculate total tokens correctly', async () => {
      await prisma.lLMRequest.deleteMany({
        where: { projectId: testProject.id },
      });

      await prisma.lLMRequest.createMany({
        data: [
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-4',
            latency: 1000,
            tokens: 500,
            riskScore: 20,
          },
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-4',
            latency: 1000,
            tokens: 300,
            riskScore: 20,
          },
        ],
      });

      const stats = await metricsService.getTokenUsageStats(testProject.id);

      expect(stats.totalTokens).toBe(800);
      expect(stats.requestCount).toBe(2);
      expect(stats.averageTokensPerRequest).toBe(400);
    });

    it('should calculate tokens by model', async () => {
      await prisma.lLMRequest.deleteMany({
        where: { projectId: testProject.id },
      });

      await prisma.lLMRequest.createMany({
        data: [
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-4',
            latency: 1000,
            tokens: 500,
            riskScore: 20,
          },
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-3.5-turbo',
            latency: 500,
            tokens: 200,
            riskScore: 20,
          },
        ],
      });

      const stats = await metricsService.getTokenUsageStats(testProject.id);

      expect(stats.tokensByModel['gpt-4']).toBe(500);
      expect(stats.tokensByModel['gpt-3.5-turbo']).toBe(200);
    });
  });

  describe('High Risk Score Tracking', () => {
    it('should count high risk requests', async () => {
      await prisma.lLMRequest.deleteMany({
        where: { projectId: testProject.id },
      });

      await prisma.lLMRequest.createMany({
        data: [
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-4',
            latency: 1000,
            tokens: 100,
            riskScore: 85,
          },
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-4',
            latency: 1000,
            tokens: 100,
            riskScore: 90,
          },
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-4',
            latency: 1000,
            tokens: 100,
            riskScore: 50,
          },
        ],
      });

      const metrics = await metricsService.getProjectMetrics(testProject.id);

      expect(metrics.highRiskCount).toBe(2);
    });

    it('should calculate average risk score', async () => {
      await prisma.lLMRequest.deleteMany({
        where: { projectId: testProject.id },
      });

      await prisma.lLMRequest.createMany({
        data: [
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-4',
            latency: 1000,
            tokens: 100,
            riskScore: 50,
          },
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-4',
            latency: 1000,
            tokens: 100,
            riskScore: 60,
          },
          {
            projectId: testProject.id,
            prompt: 'Test',
            response: 'Response',
            model: 'gpt-4',
            latency: 1000,
            tokens: 100,
            riskScore: 70,
          },
        ],
      });

      const metrics = await metricsService.getProjectMetrics(testProject.id);

      expect(metrics.averageRiskScore).toBe(60);
    });
  });
});
