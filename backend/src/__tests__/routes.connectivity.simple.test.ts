import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';

describe('Route Connectivity - Simple Tests', { timeout: 10000 }, () => {
  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment');
    });
  });

  describe('API Versioning', () => {
    it('should return 404 for routes without /api/v1 prefix', async () => {
      const response = await request(app)
        .get('/projects');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for protected routes without auth', async () => {
      const response = await request(app)
        .get('/api/v1/projects');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Route Endpoints Exist', () => {
    // These tests verify that routes are registered and respond (even if with auth errors)
    
    it('POST /api/v1/auth/register should exist', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test123!',
        });

      // Should not be 404
      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('POST /api/v1/auth/login should exist', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!',
        });

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('POST /api/v1/auth/refresh-token should exist', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken: 'test-token',
        });

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('POST /api/v1/auth/logout should exist', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/projects should exist', async () => {
      const response = await request(app)
        .get('/api/v1/projects');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('POST /api/v1/projects should exist', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .send({ name: 'Test' });

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('POST /api/v1/llm/request should exist', async () => {
      const response = await request(app)
        .post('/api/v1/llm/request')
        .send({
          prompt: 'test',
          response: 'test',
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        });

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/llm/requests should exist', async () => {
      const response = await request(app)
        .get('/api/v1/llm/requests');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/llm/stats should exist', async () => {
      const response = await request(app)
        .get('/api/v1/llm/stats');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/llm/recent should exist', async () => {
      const response = await request(app)
        .get('/api/v1/llm/recent');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/llm/high-risk should exist', async () => {
      const response = await request(app)
        .get('/api/v1/llm/high-risk');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/llm/errors should exist', async () => {
      const response = await request(app)
        .get('/api/v1/llm/errors');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/projects/:projectId/incidents should exist', async () => {
      const response = await request(app)
        .get('/api/v1/projects/test-id/incidents');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/projects/:projectId/incidents/:incidentId should exist', async () => {
      const response = await request(app)
        .get('/api/v1/projects/test-id/incidents/incident-id');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('POST /api/v1/projects/:projectId/incidents/:incidentId/resolve should exist', async () => {
      const response = await request(app)
        .post('/api/v1/projects/test-id/incidents/incident-id/resolve');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('POST /api/v1/projects/:projectId/incidents/:incidentId/remediations should exist', async () => {
      const response = await request(app)
        .post('/api/v1/projects/test-id/incidents/incident-id/remediations')
        .send({
          actionType: 'switch_model',
          parameters: {},
        });

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/projects/:projectId/incidents/:incidentId/remediations should exist', async () => {
      const response = await request(app)
        .get('/api/v1/projects/test-id/incidents/incident-id/remediations');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/metrics/:projectId should exist', async () => {
      const response = await request(app)
        .get('/api/v1/metrics/test-id');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/metrics/:projectId/daily should exist', async () => {
      const response = await request(app)
        .get('/api/v1/metrics/test-id/daily');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/metrics/:projectId/models should exist', async () => {
      const response = await request(app)
        .get('/api/v1/metrics/test-id/models');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/metrics/:projectId/errors should exist', async () => {
      const response = await request(app)
        .get('/api/v1/metrics/test-id/errors');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/metrics/:projectId/tokens should exist', async () => {
      const response = await request(app)
        .get('/api/v1/metrics/test-id/tokens');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/metrics/:projectId/costs should exist', async () => {
      const response = await request(app)
        .get('/api/v1/metrics/test-id/costs');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/projects/:projectId/logs should exist', async () => {
      const response = await request(app)
        .get('/api/v1/projects/test-id/logs');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/projects/:projectId/logs/stats should exist', async () => {
      const response = await request(app)
        .get('/api/v1/projects/test-id/logs/stats');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/projects/:projectId/logs/:logId should exist', async () => {
      const response = await request(app)
        .get('/api/v1/projects/test-id/logs/log-id');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/settings/profile should exist', async () => {
      const response = await request(app)
        .get('/api/v1/settings/profile');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('POST /api/v1/settings/profile should exist', async () => {
      const response = await request(app)
        .post('/api/v1/settings/profile')
        .send({ name: 'Test' });

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/settings/project/:projectId should exist', async () => {
      const response = await request(app)
        .get('/api/v1/settings/project/test-id');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('POST /api/v1/settings/project/:projectId should exist', async () => {
      const response = await request(app)
        .post('/api/v1/settings/project/test-id')
        .send({});

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('POST /api/v1/billing/checkout should exist', async () => {
      const response = await request(app)
        .post('/api/v1/billing/checkout')
        .send({
          plan: 'pro',
          successUrl: 'https://example.com',
          cancelUrl: 'https://example.com',
        });

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('POST /api/v1/billing/portal should exist', async () => {
      const response = await request(app)
        .post('/api/v1/billing/portal')
        .send({
          returnUrl: 'https://example.com',
        });

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/billing/invoices should exist', async () => {
      const response = await request(app)
        .get('/api/v1/billing/invoices');

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('POST /webhooks/datadog should exist', async () => {
      const response = await request(app)
        .post('/webhooks/datadog')
        .send({
          alert: {
            id: 'test',
            title: 'Test',
            status: 'alert',
          },
        });

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('POST /webhooks/stripe should exist', async () => {
      const response = await request(app)
        .post('/webhooks/stripe')
        .send({
          id: 'evt_test',
          type: 'customer.subscription.updated',
          data: {},
        });

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/v1/non-existent-route-xyz');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'RESOURCE_NOT_FOUND');
    });
  });
});
