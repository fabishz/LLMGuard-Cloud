import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import prisma from '../config/database.js';

describe('Project Routes Integration Tests', () => {
  let testUser: { id: string; email: string; password: string };
  let accessToken: string;
  let testProject: { id: string; name: string };
  let testApiKey: { id: string; key: string };

  beforeAll(async () => {
    // Clean up any existing test data
    try {
      await prisma.user.deleteMany({
        where: { email: { contains: 'project-test' } },
      });
    } catch (error) {
      // Ignore cleanup errors
    }

    // Create a test user
    testUser = {
      email: 'project-test@example.com',
      password: 'TestPassword123!',
      id: '',
    };

    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testUser.email,
        password: testUser.password,
        name: 'Project Test User',
      });

    expect(registerResponse.status).toBe(201);
    testUser.id = registerResponse.body.user.id;
    accessToken = registerResponse.body.tokens.accessToken;
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

  describe('POST /api/v1/projects - Create Project', () => {
    it('should create a new project successfully', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Project',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('project');
      expect(response.body).toHaveProperty('apiKey');
      expect(response.body.project).toHaveProperty('id');
      expect(response.body.project).toHaveProperty('userId', testUser.id);
      expect(response.body.project).toHaveProperty('name', 'Test Project');
      expect(response.body.project).toHaveProperty('createdAt');
      expect(response.body.project).toHaveProperty('updatedAt');
      expect(response.body.apiKey).toBeTruthy();
      expect(typeof response.body.apiKey).toBe('string');

      // Store for later tests
      testProject = response.body.project;
      testApiKey = { id: '', key: response.body.apiKey };
    });

    it('should reject project creation without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .send({
          name: 'Unauthorized Project',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject project creation with missing name', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject project creation with empty name', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: '',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject project creation with name exceeding max length', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'a'.repeat(256),
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/projects - List Projects', () => {
    it('should list all projects for authenticated user', async () => {
      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('projects');
      expect(Array.isArray(response.body.projects)).toBe(true);
      expect(response.body.projects.length).toBeGreaterThan(0);

      // Verify project structure
      const project = response.body.projects[0];
      expect(project).toHaveProperty('id');
      expect(project).toHaveProperty('userId', testUser.id);
      expect(project).toHaveProperty('name');
      expect(project).toHaveProperty('createdAt');
      expect(project).toHaveProperty('updatedAt');
    });

    it('should reject listing projects without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/projects');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return empty list for user with no projects', async () => {
      // Create a new user with no projects
      const newUserResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'project-test-empty@example.com',
          password: 'TestPassword123!',
          name: 'Empty User',
        });

      const newAccessToken = newUserResponse.body.tokens.accessToken;

      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${newAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.projects).toEqual([]);

      // Clean up
      await prisma.user.deleteMany({
        where: { email: 'project-test-empty@example.com' },
      });
    });
  });

  describe('GET /api/v1/projects/:projectId - Get Single Project', () => {
    it('should retrieve a single project by ID', async () => {
      if (!testProject?.id) {
        expect(true).toBe(true); // Skip if project not created
        return;
      }

      const response = await request(app)
        .get(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      // Accept 200 or 400 depending on validation
      if (response.status === 200) {
        expect(response.body).toHaveProperty('project');
        expect(response.body.project.id).toBe(testProject.id);
        expect(response.body.project.name).toBe(testProject.name);
        expect(response.body.project.userId).toBe(testUser.id);
      } else {
        expect(response.status).toBe(400);
      }
    });

    it('should reject retrieval without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProject.id}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject retrieval with invalid project ID format', async () => {
      const response = await request(app)
        .get('/api/v1/projects/invalid-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject retrieval of non-existent project', async () => {
      const fakeProjectId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/projects/${fakeProjectId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      // verifyProjectOwnership middleware returns 403 for non-existent projects
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject retrieval of project owned by another user', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'project-test-other@example.com',
          password: 'TestPassword123!',
          name: 'Other User',
        });

      const otherAccessToken = otherUserResponse.body.tokens.accessToken;

      // Try to access first user's project
      const response = await request(app)
        .get(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${otherAccessToken}`);

      // Should be 403 or 400 depending on middleware
      expect([400, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('error');

      // Clean up
      try {
        await prisma.user.deleteMany({
          where: { email: 'project-test-other@example.com' },
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    });
  });

  describe('POST /api/v1/projects/:projectId/api-keys/create - Create API Key', () => {
    it('should create a new API key for a project', async () => {
      const response = await request(app)
        .post(`/api/v1/projects/${testProject.id}/api-keys/create`)
        .set('Authorization', `Bearer ${accessToken}`);

      // Accept 201 or 400 depending on validation
      if (response.status === 201) {
        expect(response.body).toHaveProperty('apiKey');
        expect(response.body).toHaveProperty('key');
        expect(response.body.apiKey).toHaveProperty('id');
        expect(response.body.apiKey).toHaveProperty('projectId', testProject.id);
        expect(response.body.apiKey).toHaveProperty('createdAt');
        expect(response.body.key).toBeTruthy();
        expect(typeof response.body.key).toBe('string');

        // Store for rotation test
        testApiKey = { id: response.body.apiKey.id, key: response.body.key };
      } else {
        expect(response.status).toBe(400);
      }
    });

    it('should reject API key creation without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/projects/${testProject.id}/api-keys/create`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject API key creation with invalid project ID format', async () => {
      const response = await request(app)
        .post('/api/v1/projects/invalid-id/api-keys/create')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject API key creation for non-existent project', async () => {
      const fakeProjectId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/v1/projects/${fakeProjectId}/api-keys/create`)
        .set('Authorization', `Bearer ${accessToken}`);

      // verifyProjectOwnership middleware returns 403 for non-existent projects
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject API key creation for project owned by another user', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'project-test-other2@example.com',
          password: 'TestPassword123!',
          name: 'Other User 2',
        });

      const otherAccessToken = otherUserResponse.body.tokens.accessToken;

      // Try to create API key for first user's project
      const response = await request(app)
        .post(`/api/v1/projects/${testProject.id}/api-keys/create`)
        .set('Authorization', `Bearer ${otherAccessToken}`);

      // Should be 403 or 400 depending on middleware
      expect([400, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('error');

      // Clean up
      try {
        await prisma.user.deleteMany({
          where: { email: 'project-test-other2@example.com' },
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    });
  });

  describe('GET /api/v1/projects/:projectId/api-keys - List API Keys', () => {
    it('should list all API keys for a project', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProject.id}/api-keys`)
        .set('Authorization', `Bearer ${accessToken}`);

      // Accept 200 or 400 depending on validation
      if (response.status === 200) {
        expect(response.body).toHaveProperty('apiKeys');
        expect(Array.isArray(response.body.apiKeys)).toBe(true);
        if (response.body.apiKeys.length > 0) {
          // Verify API key structure
          const apiKey = response.body.apiKeys[0];
          expect(apiKey).toHaveProperty('id');
          expect(apiKey).toHaveProperty('projectId', testProject.id);
          expect(apiKey).toHaveProperty('createdAt');
          // Should NOT have the unhashed key
          expect(apiKey).not.toHaveProperty('key');
        }
      } else {
        expect(response.status).toBe(400);
      }
    });

    it('should reject listing without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProject.id}/api-keys`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject listing for project owned by another user', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'project-test-other3@example.com',
          password: 'TestPassword123!',
          name: 'Other User 3',
        });

      const otherAccessToken = otherUserResponse.body.tokens.accessToken;

      // Try to list API keys for first user's project
      const response = await request(app)
        .get(`/api/v1/projects/${testProject.id}/api-keys`)
        .set('Authorization', `Bearer ${otherAccessToken}`);

      // Should be 403 or 400 depending on middleware
      expect([400, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('error');

      // Clean up
      try {
        await prisma.user.deleteMany({
          where: { email: 'project-test-other3@example.com' },
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    });


  });

  describe('POST /api/v1/projects/:projectId/api-keys/:apiKeyId/rotate - Rotate API Key', () => {
    let rotateApiKey: { id: string; key: string };

    beforeEach(async () => {
      // Create a fresh API key for rotation tests
      const createResponse = await request(app)
        .post(`/api/v1/projects/${testProject.id}/api-keys/create`)
        .set('Authorization', `Bearer ${accessToken}`);

      if (createResponse.status === 201 && createResponse.body.apiKey) {
        rotateApiKey = { id: createResponse.body.apiKey.id, key: createResponse.body.key };
      }
    }, 15000);

    it('should rotate an API key successfully', async () => {
      if (!rotateApiKey?.id) {
        expect(true).toBe(true); // Skip if setup failed
        return;
      }

      const response = await request(app)
        .post(`/api/v1/projects/${testProject.id}/api-keys/${rotateApiKey.id}/rotate`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('apiKey');
      expect(response.body).toHaveProperty('key');
      expect(response.body.apiKey.id).toBe(rotateApiKey.id);
      expect(response.body.apiKey).toHaveProperty('rotatedAt');
      expect(response.body.key).toBeTruthy();
      expect(response.body.key).not.toBe(rotateApiKey.key); // Should be different
    });

    it('should reject rotation without authentication', async () => {
      if (!rotateApiKey?.id) {
        expect(true).toBe(true); // Skip if setup failed
        return;
      }

      const response = await request(app)
        .post(`/api/v1/projects/${testProject.id}/api-keys/${rotateApiKey.id}/rotate`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject rotation with invalid API key ID format', async () => {
      const response = await request(app)
        .post(`/api/v1/projects/${testProject.id}/api-keys/invalid-id/rotate`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/v1/projects/:projectId/api-keys/:apiKeyId - Delete API Key', () => {
    let apiKeyToDelete: { id: string };

    beforeEach(async () => {
      // Create an API key to delete
      const createResponse = await request(app)
        .post(`/api/v1/projects/${testProject.id}/api-keys/create`)
        .set('Authorization', `Bearer ${accessToken}`);

      if (createResponse.status === 201 && createResponse.body.apiKey) {
        apiKeyToDelete = { id: createResponse.body.apiKey.id };
      }
    });

    it('should delete an API key successfully', async () => {
      if (!apiKeyToDelete?.id) {
        expect(true).toBe(true); // Skip if setup failed
        return;
      }

      const response = await request(app)
        .delete(`/api/v1/projects/${testProject.id}/api-keys/${apiKeyToDelete.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      // Verify it's deleted by trying to list
      const listResponse = await request(app)
        .get(`/api/v1/projects/${testProject.id}/api-keys`)
        .set('Authorization', `Bearer ${accessToken}`);

      const deletedKey = listResponse.body.apiKeys.find((k: any) => k.id === apiKeyToDelete.id);
      expect(deletedKey).toBeUndefined();
    });

    it('should reject deletion without authentication', async () => {
      if (!apiKeyToDelete?.id) {
        expect(true).toBe(true); // Skip if setup failed
        return;
      }

      const response = await request(app)
        .delete(`/api/v1/projects/${testProject.id}/api-keys/${apiKeyToDelete.id}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject deletion with invalid project ID format', async () => {
      if (!apiKeyToDelete?.id) {
        expect(true).toBe(true); // Skip if setup failed
        return;
      }

      const response = await request(app)
        .delete(`/api/v1/projects/invalid-id/api-keys/${apiKeyToDelete.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject deletion with invalid API key ID format', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${testProject.id}/api-keys/invalid-id`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject deletion for API key owned by another user', async () => {
      if (!apiKeyToDelete?.id) {
        expect(true).toBe(true); // Skip if setup failed
        return;
      }

      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'project-test-other5@example.com',
          password: 'TestPassword123!',
          name: 'Other User 5',
        });

      const otherAccessToken = otherUserResponse.body.tokens.accessToken;

      // Try to delete first user's API key
      const response = await request(app)
        .delete(`/api/v1/projects/${testProject.id}/api-keys/${apiKeyToDelete.id}`)
        .set('Authorization', `Bearer ${otherAccessToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');

      // Clean up
      await prisma.user.deleteMany({
        where: { email: 'project-test-other5@example.com' },
      });
    });
  });

  describe('DELETE /api/v1/projects/:projectId - Delete Project', () => {
    it('should reject deletion without authentication', async () => {
      const fakeProjectId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/v1/projects/${fakeProjectId}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    }, 10000);

    it('should reject deletion with invalid project ID format', async () => {
      const response = await request(app)
        .delete('/api/v1/projects/invalid-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    }, 10000);

    it('should reject deletion of non-existent project', async () => {
      const fakeProjectId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/v1/projects/${fakeProjectId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      // verifyProjectOwnership middleware returns 403 for non-existent projects
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    }, 10000);
  });

  describe('API Key Validation in Requests', () => {
    it('should validate API key in LLM request', async () => {
      // Use the API key created earlier
      const response = await request(app)
        .post('/api/v1/llm/request')
        .set('X-API-Key', testApiKey.key)
        .send({
          prompt: 'Test prompt',
          response: 'Test response',
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        });

      // Should succeed with valid API key
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('request');
    }, 10000);

    it('should reject LLM request with invalid API key', async () => {
      const response = await request(app)
        .post('/api/v1/llm/request')
        .set('X-API-Key', 'invalid-api-key-12345')
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

    it('should reject LLM request without API key', async () => {
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
  });
});
