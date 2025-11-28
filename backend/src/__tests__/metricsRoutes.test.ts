import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import prisma from '../config/database.js';
import * as authService from '../services/authService.js';
import * as projectService from '../services/projectService.js';

describe('Metrics Routes Integration Tests', () => {
  let testUser: any;
  let testProject: any;
  let accessToken: string;
  const testEmail = 'metrics-routes-test-' + Date.now() + '@example.com';
  const testPassword = 'TestPassword123!';

  beforeAll(async () => {
    // Create test user
    const userResponse = await authService.register({
      email: testEmail,
      password: testPassword,
      name: 'Metrics Routes Test User',
    });
    testUser = userResponse.user;

    // Get access token
    const loginResponse = await authService.login({
      email: testEmail,
      password: testPassword,
    });
    accessToken = loginResponse.tokens.accessToken;

    // Create test project
    const projectResponse = await projectService.createProject(testUser.id, {
      name: 'Metrics Routes Test Project',
    });
    testProject = projectResponse;

    // Create test LLM requests with various data
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
        {
          projectId: testProject.id,
          prompt: 'Test prompt 3',
          response: 'Test response 3',
          model: 'gpt-3.5-turbo',
          latency: 500,
          tokens: 50,
          riskScore: 15,
          createdAt: new Date(today.getTime() + 3000),
        },
        {
          projectId: testProject.id,
          prompt: 'Error test',
          response: 'Error response',
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
          riskScore: 25,
          error: 'Test error',
          createdAt: new Date(today.getTime() + 4000),
        },
      ],
    });
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

  describe('GET /api/v1/metrics/:projectId - Get Project Metrics', () => {
    it('should return aggregated metrics for a project', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('metrics');
      const metrics = response.body.metrics;

      expect(metrics).toHaveProperty('projectId', testProject.id);
      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('errorCount');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics).toHaveProperty('averageLatency');
      expect(metrics).toHaveProperty('totalTokens');
      expect(metrics).toHaveProperty('estimatedCost');
      expect(metrics).toHaveProperty('modelBreakdown');
      expect(metrics).toHaveProperty('dailySummary');
      expect(metrics).toHaveProperty('highRiskCount');
      expect(metrics).toHaveProperty('averageRiskScore');
    });

    it('should calculate correct total requests', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.metrics.totalRequests).toBe(4);
    });

    it('should calculate correct error count', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.metrics.errorCount).toBe(1);
    });

    it('should calculate correct error rate', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.metrics.errorRate).toBe(0.25); // 1/4
    });

    it('should calculate correct total tokens', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.metrics.totalTokens).toBe(360); // 100 + 200 + 50 + 10
    });

    it('should calculate average latency correctly', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      // (1000 + 2000 + 500 + 100) / 4 = 875, but may be rounded
      expect(response.body.metrics.averageLatency).toBeGreaterThan(800);
      expect(response.body.metrics.averageLatency).toBeLessThan(1000);
    });

    it('should include time-series data in daily summary', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.metrics.dailySummary)).toBe(true);
      expect(response.body.metrics.dailySummary.length).toBeGreaterThan(0);

      const summary = response.body.metrics.dailySummary[0];
      expect(summary).toHaveProperty('date');
      expect(summary).toHaveProperty('requests');
      expect(summary).toHaveProperty('errors');
      expect(summary).toHaveProperty('avgLatency');
      expect(summary).toHaveProperty('tokens');
      expect(summary).toHaveProperty('cost');
    });

    it('should include model breakdown', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.metrics.modelBreakdown)).toBe(true);
      expect(response.body.metrics.modelBreakdown.length).toBeGreaterThan(0);

      const model = response.body.metrics.modelBreakdown[0];
      expect(model).toHaveProperty('model');
      expect(model).toHaveProperty('count');
      expect(model).toHaveProperty('totalTokens');
      expect(model).toHaveProperty('totalCost');
      expect(model).toHaveProperty('avgLatency');
    });

    it('should calculate cost based on model pricing', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.metrics.estimatedCost).toBeGreaterThan(0);
      // Cost should be a number rounded to 2 decimal places
      expect(typeof response.body.metrics.estimatedCost).toBe('number');
    });

    it('should support date range filtering with startDate and endDate', async () => {
      const today = new Date();
      const startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}`)
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.metrics.totalRequests).toBeGreaterThan(0);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with invalid project ID', async () => {
      const response = await request(app)
        .get('/api/v1/metrics/invalid-id')
        .set('Authorization', `Bearer ${accessToken}`);

      // Will return 403 because the project doesn't exist (ownership check fails)
      expect([400, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request for project not owned by user', async () => {
      // Create another user and project
      const otherUser = await authService.register({
        email: 'other-user-' + Date.now() + '@example.com',
        password: 'TestPassword123!',
        name: 'Other User',
      });

      const otherProject = await projectService.createProject(otherUser.user.id, {
        name: 'Other Project',
      });

      const response = await request(app)
        .get(`/api/v1/metrics/${otherProject.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');

      // Cleanup
      await prisma.project.deleteMany({
        where: { id: otherProject.id },
      });
      await prisma.user.deleteMany({
        where: { id: otherUser.user.id },
      });
    });

    it('should reject request with invalid date format', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}`)
        .query({ startDate: 'invalid-date' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/metrics/:projectId/costs - Get Cost Estimation', () => {
    it('should return cost estimation', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}/costs`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('costEstimate');
      const estimate = response.body.costEstimate;

      expect(estimate).toHaveProperty('totalCost');
      expect(estimate).toHaveProperty('costByModel');
      expect(estimate).toHaveProperty('averageCostPerRequest');
      expect(estimate).toHaveProperty('requestCount');
    });

    it('should calculate total cost correctly', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}/costs`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.costEstimate.totalCost).toBeGreaterThan(0);
      expect(typeof response.body.costEstimate.totalCost).toBe('number');
    });

    it('should calculate cost by model', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}/costs`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      const costByModel = response.body.costEstimate.costByModel;

      expect(costByModel['gpt-4']).toBeGreaterThan(0);
      // gpt-3.5-turbo cost might be very small and round to 0
      expect(costByModel['gpt-3.5-turbo']).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average cost per request', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}/costs`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      const estimate = response.body.costEstimate;

      expect(estimate.averageCostPerRequest).toBeGreaterThan(0);
      expect(estimate.averageCostPerRequest).toBeLessThanOrEqual(estimate.totalCost);
    });

    it('should round costs to 2 decimal places', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}/costs`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      const totalCost = response.body.costEstimate.totalCost;
      const decimalPlaces = (totalCost.toString().split('.')[1] || '').length;

      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it('should calculate correct request count', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}/costs`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.costEstimate.requestCount).toBe(4);
    });

    it('should support date range filtering', async () => {
      const today = new Date();
      const startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}/costs`)
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.costEstimate.requestCount).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/metrics/:projectId/models - Get Model Usage Breakdown', () => {
    it('should return model usage breakdown', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}/models`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('modelUsage');
      expect(Array.isArray(response.body.modelUsage)).toBe(true);
      expect(response.body.modelUsage.length).toBeGreaterThan(0);
    });

    it('should calculate correct model counts', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}/models`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      const gpt4 = response.body.modelUsage.find((m: any) => m.model === 'gpt-4');
      const gpt35 = response.body.modelUsage.find((m: any) => m.model === 'gpt-3.5-turbo');

      expect(gpt4?.count).toBe(3); // 3 gpt-4 requests
      expect(gpt35?.count).toBe(1); // 1 gpt-3.5-turbo request
    });

    it('should calculate correct total tokens per model', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}/models`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      const gpt4 = response.body.modelUsage.find((m: any) => m.model === 'gpt-4');
      const gpt35 = response.body.modelUsage.find((m: any) => m.model === 'gpt-3.5-turbo');

      expect(gpt4?.totalTokens).toBe(310); // 100 + 200 + 10
      expect(gpt35?.totalTokens).toBe(50);
    });

    it('should calculate cost per model', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}/models`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      const gpt4 = response.body.modelUsage.find((m: any) => m.model === 'gpt-4');

      expect(gpt4?.totalCost).toBeGreaterThan(0);
      expect(typeof gpt4?.totalCost).toBe('number');
    });

    it('should sort models by count descending', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testProject.id}/models`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      const models = response.body.modelUsage;

      for (let i = 0; i < models.length - 1; i++) {
        expect(models[i].count).toBeGreaterThanOrEqual(models[i + 1].count);
      }
    });
  });
});
