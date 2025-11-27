import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as remediationService from '../services/remediationService.js';
import prisma from '../config/database.js';

// Mock prisma
vi.mock('../config/database.js', () => ({
  default: {
    remediationAction: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    incident: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Remediation Action Enforcement', () => {
  const projectId = 'test-project-id';
  const incidentId = 'test-incident-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Model Switching Constraint', () => {
    it('should enforce model switching when constraint is active', async () => {
      // Mock database response for active constraints
      vi.mocked(prisma.remediationAction.findMany).mockResolvedValue([
        {
          id: 'action-1',
          incidentId,
          actionType: 'switch_model',
          parameters: { newModel: 'gpt-4-turbo' },
          executed: true,
          executedAt: new Date(),
          metadata: {},
          createdAt: new Date(),
        },
      ] as any);

      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: incidentId,
        projectId,
        status: 'open',
      } as any);

      const requestData = {
        model: 'gpt-3.5-turbo',
        userId: 'user-123',
        endpoint: '/llm/request',
      };

      const violation = await remediationService.checkRemediationConstraints(projectId, requestData);

      expect(violation.violated).toBe(true);
      expect(violation.actionType).toBe('switch_model');
      expect(violation.details?.requiredModel).toBe('gpt-4-turbo');
    });

    it('should not violate if model matches constraint', async () => {
      vi.mocked(prisma.remediationAction.findMany).mockResolvedValue([
        {
          id: 'action-1',
          incidentId,
          actionType: 'switch_model',
          parameters: { newModel: 'gpt-4-turbo' },
          executed: true,
          executedAt: new Date(),
          metadata: {},
          createdAt: new Date(),
        },
      ] as any);

      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: incidentId,
        projectId,
        status: 'open',
      } as any);

      const requestData = {
        model: 'gpt-4-turbo',
        userId: 'user-123',
        endpoint: '/llm/request',
      };

      const violation = await remediationService.checkRemediationConstraints(projectId, requestData);

      expect(violation.violated).toBe(false);
    });
  });

  describe('Safety Threshold Constraint', () => {
    it('should enforce safety threshold when risk score exceeds threshold', async () => {
      vi.mocked(prisma.remediationAction.findMany).mockResolvedValue([
        {
          id: 'action-1',
          incidentId,
          actionType: 'increase_safety_threshold',
          parameters: { newThreshold: 70 },
          executed: true,
          executedAt: new Date(),
          metadata: {},
          createdAt: new Date(),
        },
      ] as any);

      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: incidentId,
        projectId,
        status: 'open',
      } as any);

      const requestData = {
        model: 'gpt-4',
        userId: 'user-123',
        endpoint: '/llm/request',
        riskScore: 85,
      };

      const violation = await remediationService.checkRemediationConstraints(projectId, requestData);

      expect(violation.violated).toBe(true);
      expect(violation.actionType).toBe('increase_safety_threshold');
      expect(violation.details?.riskScore).toBe(85);
      expect(violation.details?.threshold).toBe(70);
    });

    it('should not violate if risk score is below threshold', async () => {
      vi.mocked(prisma.remediationAction.findMany).mockResolvedValue([
        {
          id: 'action-1',
          incidentId,
          actionType: 'increase_safety_threshold',
          parameters: { newThreshold: 70 },
          executed: true,
          executedAt: new Date(),
          metadata: {},
          createdAt: new Date(),
        },
      ] as any);

      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: incidentId,
        projectId,
        status: 'open',
      } as any);

      const requestData = {
        model: 'gpt-4',
        userId: 'user-123',
        endpoint: '/llm/request',
        riskScore: 60,
      };

      const violation = await remediationService.checkRemediationConstraints(projectId, requestData);

      expect(violation.violated).toBe(false);
    });
  });

  describe('Endpoint Disabling Constraint', () => {
    it('should enforce endpoint disabling when endpoint matches', async () => {
      vi.mocked(prisma.remediationAction.findMany).mockResolvedValue([
        {
          id: 'action-1',
          incidentId,
          actionType: 'disable_endpoint',
          parameters: { endpoint: '/llm/request' },
          executed: true,
          executedAt: new Date(),
          metadata: {},
          createdAt: new Date(),
        },
      ] as any);

      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: incidentId,
        projectId,
        status: 'open',
      } as any);

      const requestData = {
        model: 'gpt-4',
        userId: 'user-123',
        endpoint: '/llm/request',
      };

      const violation = await remediationService.checkRemediationConstraints(projectId, requestData);

      expect(violation.violated).toBe(true);
      expect(violation.actionType).toBe('disable_endpoint');
    });

    it('should not violate if endpoint does not match', async () => {
      vi.mocked(prisma.remediationAction.findMany).mockResolvedValue([
        {
          id: 'action-1',
          incidentId,
          actionType: 'disable_endpoint',
          parameters: { endpoint: '/llm/request' },
          executed: true,
          executedAt: new Date(),
          metadata: {},
          createdAt: new Date(),
        },
      ] as any);

      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: incidentId,
        projectId,
        status: 'open',
      } as any);

      const requestData = {
        model: 'gpt-4',
        userId: 'user-123',
        endpoint: '/llm/requests',
      };

      const violation = await remediationService.checkRemediationConstraints(projectId, requestData);

      expect(violation.violated).toBe(false);
    });
  });

  describe('Rate Limiting Constraint', () => {
    it('should store rate limit in request data when constraint is active', async () => {
      vi.mocked(prisma.remediationAction.findMany).mockResolvedValue([
        {
          id: 'action-1',
          incidentId,
          actionType: 'rate_limit_user',
          parameters: { requestsPerMinute: 10 },
          executed: true,
          executedAt: new Date(),
          metadata: {},
          createdAt: new Date(),
        },
      ] as any);

      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: incidentId,
        projectId,
        status: 'open',
      } as any);

      const requestData: any = {
        model: 'gpt-4',
        userId: 'user-123',
        endpoint: '/llm/request',
      };

      const violation = await remediationService.checkRemediationConstraints(projectId, requestData);

      expect(violation.violated).toBe(false);
      expect(requestData._remediationRateLimit).toBe(10);
    });
  });

  describe('System Prompt Change Constraint', () => {
    it('should store system prompt in request data when constraint is active', async () => {
      vi.mocked(prisma.remediationAction.findMany).mockResolvedValue([
        {
          id: 'action-1',
          incidentId,
          actionType: 'change_system_prompt',
          parameters: { newPrompt: 'You are a safe AI assistant.' },
          executed: true,
          executedAt: new Date(),
          metadata: {},
          createdAt: new Date(),
        },
      ] as any);

      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: incidentId,
        projectId,
        status: 'open',
      } as any);

      const requestData: any = {
        model: 'gpt-4',
        userId: 'user-123',
        endpoint: '/llm/request',
      };

      const violation = await remediationService.checkRemediationConstraints(projectId, requestData);

      expect(violation.violated).toBe(false);
      expect(requestData._remediationSystemPrompt).toBe('You are a safe AI assistant.');
    });
  });

  describe('Multiple Constraints', () => {
    it('should check constraints in order and return first violation', async () => {
      vi.mocked(prisma.remediationAction.findMany).mockResolvedValue([
        {
          id: 'action-1',
          incidentId,
          actionType: 'switch_model',
          parameters: { newModel: 'gpt-4-turbo' },
          executed: true,
          executedAt: new Date(),
          metadata: {},
          createdAt: new Date(),
        },
        {
          id: 'action-2',
          incidentId,
          actionType: 'increase_safety_threshold',
          parameters: { newThreshold: 70 },
          executed: true,
          executedAt: new Date(),
          metadata: {},
          createdAt: new Date(),
        },
      ] as any);

      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: incidentId,
        projectId,
        status: 'open',
      } as any);

      const requestData = {
        model: 'gpt-3.5-turbo',
        userId: 'user-123',
        endpoint: '/llm/request',
        riskScore: 85,
      };

      const violation = await remediationService.checkRemediationConstraints(projectId, requestData);

      // Should return first violation (model switching)
      expect(violation.violated).toBe(true);
      expect(violation.actionType).toBe('switch_model');
    });
  });

  describe('No Active Constraints', () => {
    it('should return no violation when no constraints are active', async () => {
      vi.mocked(prisma.remediationAction.findMany).mockResolvedValue([]);

      const requestData = {
        model: 'gpt-3.5-turbo',
        userId: 'user-123',
        endpoint: '/llm/request',
        riskScore: 85,
      };

      const violation = await remediationService.checkRemediationConstraints(projectId, requestData);

      expect(violation.violated).toBe(false);
    });
  });

  describe('Remediation Action Creation', () => {
    it('should create a remediation action with valid parameters', async () => {
      // Mock incident exists
      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: incidentId,
        projectId,
        severity: 'high',
        triggerType: 'high_risk_score',
        status: 'open',
        rootCause: null,
        recommendedFix: null,
        affectedRequests: 5,
        metadata: {},
        createdAt: new Date(),
        resolvedAt: null,
      } as any);

      // Mock remediation action creation
      vi.mocked(prisma.remediationAction.create).mockResolvedValue({
        id: 'action-123',
        incidentId,
        actionType: 'switch_model',
        parameters: { newModel: 'gpt-4-turbo' },
        executed: false,
        executedAt: null,
        metadata: { createdBy: 'system' },
        createdAt: new Date(),
      } as any);

      const action = await remediationService.createRemediationAction(projectId, incidentId, {
        actionType: 'switch_model',
        parameters: { newModel: 'gpt-4-turbo' },
      });

      expect(action.id).toBe('action-123');
      expect(action.actionType).toBe('switch_model');
      expect(action.executed).toBe(false);
    });
  });

  describe('Remediation Action Application', () => {
    it('should mark remediation action as executed', async () => {
      // Mock incident exists
      vi.mocked(prisma.incident.findUnique).mockResolvedValue({
        id: incidentId,
        projectId,
        severity: 'high',
        triggerType: 'high_risk_score',
        status: 'open',
        rootCause: null,
        recommendedFix: null,
        affectedRequests: 5,
        metadata: {},
        createdAt: new Date(),
        resolvedAt: null,
      } as any);

      // Mock action exists
      vi.mocked(prisma.remediationAction.findUnique).mockResolvedValue({
        id: 'action-123',
        incidentId,
        actionType: 'switch_model',
        parameters: { newModel: 'gpt-4-turbo' },
        executed: false,
        executedAt: null,
        metadata: { createdBy: 'system' },
        createdAt: new Date(),
      } as any);

      // Mock action update
      vi.mocked(prisma.remediationAction.update).mockResolvedValue({
        id: 'action-123',
        incidentId,
        actionType: 'switch_model',
        parameters: { newModel: 'gpt-4-turbo' },
        executed: true,
        executedAt: new Date(),
        metadata: { createdBy: 'system', executedAt: new Date().toISOString() },
        createdAt: new Date(),
      } as any);

      const action = await remediationService.applyRemediationAction(projectId, incidentId, 'action-123');

      expect(action.executed).toBe(true);
      expect(action.executedAt).toBeDefined();
    });
  });
});
