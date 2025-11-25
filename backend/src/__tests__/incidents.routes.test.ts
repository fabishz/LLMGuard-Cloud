import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import prisma from '../config/database.js';
import * as authService from '../services/authService.js';
import * as llmService from '../services/llmService.js';

describe('Incident Routes', { timeout: 30000 }, () => {
  let testUser: any;
  let testProject: any;
  let accessToken: string;
  let testIncidents: any[] = [];

  beforeAll(async () => {
    // Create test user
    const userResult = await authService.register({
      email: `test-incident-routes-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      name: 'Test User',
    });
    testUser = userResult.user;
    accessToken = userResult.tokens.accessToken;

    // Create test project
    testProject = await prisma.project.create({
      data: {
        userId: testUser.id,
        name: 'Test Project',
        apiKeyHash: `hash-${Date.now()}`,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.incident.deleteMany({ where: { projectId: testProject.id } });
    await prisma.lLMRequest.deleteMany({ where: { projectId: testProject.id } });
    await prisma.project.deleteMany({ where: { id: testProject.id } });
    await prisma.user.deleteMany({ where: { id: testUser.id } });
  });

  beforeEach(async () => {
    // Clear incidents before each test
    await prisma.incident.deleteMany({ where: { projectId: testProject.id } });
    testIncidents = [];
  });

  describe('GET /projects/:projectId/incidents', () => {
    beforeEach(async () => {
      // Create test incidents
      for (let i = 0; i < 3; i++) {
        const incident = await prisma.incident.create({
          data: {
            projectId: testProject.id,
            severity: i === 0 ? 'high' : 'medium',
            triggerType: 'latency_threshold',
            status: i === 0 ? 'open' : 'resolved',
            metadata: { test: true },
          },
        });
        testIncidents.push(incident);
      }
    });

    it('should list all incidents for a project', async () => {
      const response = await request(app)
        .get(`/projects/${testProject.id}/incidents`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('incidents');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('total');
      expect(response.body.incidents.length).toBe(3);
      expect(response.body.incidents[0]).toHaveProperty('id');
      expect(response.body.incidents[0]).toHaveProperty('severity');
      expect(response.body.incidents[0]).toHaveProperty('status');
      expect(response.body.incidents[0]).toHaveProperty('triggerType');
    });

    it('should filter incidents by status', async () => {
      const response = await request(app)
        .get(`/projects/${testProject.id}/incidents?status=open`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.incidents.length).toBe(1);
      expect(response.body.incidents[0].status).toBe('open');
    });

    it('should support pagination with limit and page', async () => {
      const response = await request(app)
        .get(`/projects/${testProject.id}/incidents?limit=2&page=1`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.incidents.length).toBeLessThanOrEqual(2);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(2);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get(`/projects/${testProject.id}/incidents`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for project not owned by user', async () => {
      // Create another user and project
      const otherUserResult = await authService.register({
        email: `other-user-${Date.now()}@example.com`,
        password: 'TestPassword123!',
      });

      const otherProject = await prisma.project.create({
        data: {
          userId: otherUserResult.user.id,
          name: 'Other Project',
          apiKeyHash: `hash-other-${Date.now()}`,
        },
      });

      const response = await request(app)
        .get(`/projects/${otherProject.id}/incidents`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);

      // Clean up
      await prisma.project.deleteMany({ where: { id: otherProject.id } });
      await prisma.user.deleteMany({ where: { id: otherUserResult.user.id } });
    });

    it('should handle invalid query parameters', async () => {
      const response = await request(app)
        .get(`/projects/${testProject.id}/incidents?limit=invalid`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return empty array for project with no incidents', async () => {
      // Create a new project with no incidents
      const emptyProject = await prisma.project.create({
        data: {
          userId: testUser.id,
          name: 'Empty Project',
          apiKeyHash: `hash-empty-${Date.now()}`,
        },
      });

      const response = await request(app)
        .get(`/projects/${emptyProject.id}/incidents`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.incidents.length).toBe(0);

      // Clean up
      await prisma.project.deleteMany({ where: { id: emptyProject.id } });
    });
  });

  describe('GET /projects/:projectId/incidents/:incidentId', () => {
    beforeEach(async () => {
      // Create a test incident
      const incident = await prisma.incident.create({
        data: {
          projectId: testProject.id,
          severity: 'high',
          triggerType: 'latency_threshold',
          status: 'open',
          metadata: { avgLatency: 6000 },
        },
      });
      testIncidents.push(incident);
    });

    it('should retrieve a single incident by ID', async () => {
      const incidentId = testIncidents[0].id;

      const response = await request(app)
        .get(`/projects/${testProject.id}/incidents/${incidentId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('incident');
      expect(response.body.incident.id).toBe(incidentId);
      expect(response.body.incident.severity).toBe('high');
      expect(response.body.incident.status).toBe('open');
      expect(response.body.incident.triggerType).toBe('latency_threshold');
      expect(response.body.incident).toHaveProperty('metadata');
    });

    it('should include remediation actions in response', async () => {
      const incidentId = testIncidents[0].id;

      // Create a remediation action
      await prisma.remediationAction.create({
        data: {
          incidentId,
          actionType: 'switch_model',
          parameters: { newModel: 'gpt-4-turbo' },
          executed: false,
        },
      });

      const response = await request(app)
        .get(`/projects/${testProject.id}/incidents/${incidentId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.incident).toHaveProperty('remediationActions');
      expect(response.body.incident.remediationActions.length).toBe(1);
    });

    it('should return 404 for non-existent incident', async () => {
      const response = await request(app)
        .get(`/projects/${testProject.id}/incidents/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 without authentication', async () => {
      const incidentId = testIncidents[0].id;

      const response = await request(app)
        .get(`/projects/${testProject.id}/incidents/${incidentId}`);

      expect(response.status).toBe(401);
    });

    it('should return 403 for incident in project not owned by user', async () => {
      // Create another user and project with incident
      const otherUserResult = await authService.register({
        email: `other-user-incident-${Date.now()}@example.com`,
        password: 'TestPassword123!',
      });

      const otherProject = await prisma.project.create({
        data: {
          userId: otherUserResult.user.id,
          name: 'Other Project',
          apiKeyHash: `hash-other-${Date.now()}`,
        },
      });

      const otherIncident = await prisma.incident.create({
        data: {
          projectId: otherProject.id,
          severity: 'high',
          triggerType: 'latency_threshold',
          status: 'open',
        },
      });

      const response = await request(app)
        .get(`/projects/${otherProject.id}/incidents/${otherIncident.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);

      // Clean up
      await prisma.incident.deleteMany({ where: { id: otherIncident.id } });
      await prisma.project.deleteMany({ where: { id: otherProject.id } });
      await prisma.user.deleteMany({ where: { id: otherUserResult.user.id } });
    });

    it('should handle invalid incident ID format', async () => {
      const response = await request(app)
        .get(`/projects/${testProject.id}/incidents/invalid-id`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /projects/:projectId/incidents/:incidentId/resolve', () => {
    beforeEach(async () => {
      // Create a test incident
      const incident = await prisma.incident.create({
        data: {
          projectId: testProject.id,
          severity: 'high',
          triggerType: 'latency_threshold',
          status: 'open',
        },
      });
      testIncidents.push(incident);
    });

    it('should resolve an open incident', async () => {
      const incidentId = testIncidents[0].id;

      const response = await request(app)
        .post(`/projects/${testProject.id}/incidents/${incidentId}/resolve`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('incident');
      expect(response.body).toHaveProperty('message');
      expect(response.body.incident.status).toBe('resolved');
      expect(response.body.incident.resolvedAt).toBeDefined();
      expect(response.body.message).toBe('Incident resolved successfully');

      // Verify in database
      const stored = await prisma.incident.findUnique({
        where: { id: incidentId },
      });
      expect(stored?.status).toBe('resolved');
      expect(stored?.resolvedAt).toBeDefined();
    });

    it('should return 404 for non-existent incident', async () => {
      const response = await request(app)
        .post(`/projects/${testProject.id}/incidents/00000000-0000-0000-0000-000000000000/resolve`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 without authentication', async () => {
      const incidentId = testIncidents[0].id;

      const response = await request(app)
        .post(`/projects/${testProject.id}/incidents/${incidentId}/resolve`);

      expect(response.status).toBe(401);
    });

    it('should return 403 for incident in project not owned by user', async () => {
      // Create another user and project with incident
      const otherUserResult = await authService.register({
        email: `other-user-resolve-${Date.now()}@example.com`,
        password: 'TestPassword123!',
      });

      const otherProject = await prisma.project.create({
        data: {
          userId: otherUserResult.user.id,
          name: 'Other Project',
          apiKeyHash: `hash-other-${Date.now()}`,
        },
      });

      const otherIncident = await prisma.incident.create({
        data: {
          projectId: otherProject.id,
          severity: 'high',
          triggerType: 'latency_threshold',
          status: 'open',
        },
      });

      const response = await request(app)
        .post(`/projects/${otherProject.id}/incidents/${otherIncident.id}/resolve`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);

      // Clean up
      await prisma.incident.deleteMany({ where: { id: otherIncident.id } });
      await prisma.project.deleteMany({ where: { id: otherProject.id } });
      await prisma.user.deleteMany({ where: { id: otherUserResult.user.id } });
    });

    it('should handle invalid incident ID format', async () => {
      const response = await request(app)
        .post(`/projects/${testProject.id}/incidents/invalid-id/resolve`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid project ID format', async () => {
      const response = await request(app)
        .post(`/projects/invalid-project-id/incidents/00000000-0000-0000-0000-000000000000/resolve`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });
});
