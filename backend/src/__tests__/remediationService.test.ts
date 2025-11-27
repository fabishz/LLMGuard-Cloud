import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as remediationService from '../services/remediationService.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
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

describe('Remediation Service', () => {
  const projectId = 'test-project-id';
  const incidentId = 'test-incident-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createRemediationAction', () => {
    it('should create a switch_model remediation action with valid parameters', async () => {
      const mockIncident = {
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
      };

      const mockAction = {
        id: 'action-123',
        incidentId,
        actionType: 'switch_model',
        parameters: { newModel: 'gpt-4-turbo' },
        executed: false,
        executedAt: null,
        metadata: { createdBy: 'system', reason: 'Automated remediation for high_risk_score' },
        createdAt: new Date(),
      };

      vi.mocked(prisma.incident.findUnique).mockResolvedValue(mockIncident as any);
      vi.mocked(prisma.remediationAction.create).mockResolvedValue(mockAction as any);

      const result = await remediationService.createRemediationAction(projectId, incidentId, {
        actionType: 'switch_model',
        parameters: { newModel: 'gpt-4-turbo' },
      });

      expect(result.id).toBe('action-123');
      expect(result.actionType).toBe('switch_model');
      expect(result.parameters.newModel).toBe('gpt-4-turbo');
      expect(result.executed).toBe(false);
      expect(result.metadata.createdBy).toBe('system');
    });

    it('should throw error for invalid action type', async () => {
      const mockIncident = {
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
      };

      vi.mocked(prisma.incident.findUnique).mockResolvedValue(mockIncident as any);

      await expect(
        remediationService.createRemediationAction(projectId, incidentId, {
          actionType: 'invalid_action' as any,
          parameters: {},
        })
      ).rejects.toThrow();
    });

    it('should throw error for switch_model without newModel parameter', async () => {
      const mockIncident = {
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
      };

      vi.mocked(prisma.incident.findUnique).mockResolvedValue(mockIncident as any);

      await expect(
        remediationService.createRemediationAction(projectId, incidentId, {
          actionType: 'switch_model',
          parameters: {},
        })
      ).rejects.toThrow();
    });

    it('should throw error when incident does not exist', async () => {
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(null);

      await expect(
        remediationService.createRemediationAction(projectId, incidentId, {
          actionType: 'switch_model',
          parameters: { newModel: 'gpt-4-turbo' },
        })
      ).rejects.toThrow();
    });

    it('should throw error when incident belongs to different project', async () => {
      const mockIncident = {
        id: incidentId,
        projectId: 'different-project-id',
        severity: 'high',
        triggerType: 'high_risk_score',
        status: 'open',
        rootCause: null,
        recommendedFix: null,
        affectedRequests: 5,
        metadata: {},
        createdAt: new Date(),
        resolvedAt: null,
      };

      vi.mocked(prisma.incident.findUnique).mockResolvedValue(mockIncident as any);

      await expect(
        remediationService.createRemediationAction(projectId, incidentId, {
          actionType: 'switch_model',
          parameters: { newModel: 'gpt-4-turbo' },
        })
      ).rejects.toThrow();
    });
  });

  describe('applyRemediationAction', () => {
    it('should mark remediation action as executed with timestamp', async () => {
      const mockIncident = {
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
      };

      const mockAction = {
        id: 'action-123',
        incidentId,
        actionType: 'switch_model',
        parameters: { newModel: 'gpt-4-turbo' },
        executed: false,
        executedAt: null,
        metadata: { createdBy: 'system' },
        createdAt: new Date(),
      };

      const mockUpdatedAction = {
        ...mockAction,
        executed: true,
        executedAt: new Date(),
        metadata: { createdBy: 'system', executedAt: new Date().toISOString() },
      };

      vi.mocked(prisma.incident.findUnique).mockResolvedValue(mockIncident as any);
      vi.mocked(prisma.remediationAction.findUnique).mockResolvedValue(mockAction as any);
      vi.mocked(prisma.remediationAction.update).mockResolvedValue(mockUpdatedAction as any);

      const result = await remediationService.applyRemediationAction(projectId, incidentId, 'action-123');

      expect(result.executed).toBe(true);
      expect(result.executedAt).toBeDefined();
      expect(result.metadata.executedAt).toBeDefined();
    });

    it('should throw error when action does not exist', async () => {
      const mockIncident = {
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
      };

      vi.mocked(prisma.incident.findUnique).mockResolvedValue(mockIncident as any);
      vi.mocked(prisma.remediationAction.findUnique).mockResolvedValue(null);

      await expect(
        remediationService.applyRemediationAction(projectId, incidentId, 'action-123')
      ).rejects.toThrow();
    });
  });

  describe('getRemediationActions', () => {
    it('should retrieve all remediation actions for an incident', async () => {
      const mockIncident = {
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
      };

      const mockActions = [
        {
          id: 'action-1',
          incidentId,
          actionType: 'switch_model',
          parameters: { newModel: 'gpt-4-turbo' },
          executed: true,
          executedAt: new Date(),
          metadata: { createdBy: 'system' },
          createdAt: new Date(),
        },
        {
          id: 'action-2',
          incidentId,
          actionType: 'increase_safety_threshold',
          parameters: { newThreshold: 75 },
          executed: false,
          executedAt: null,
          metadata: { createdBy: 'system' },
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.incident.findUnique).mockResolvedValue(mockIncident as any);
      vi.mocked(prisma.remediationAction.findMany).mockResolvedValue(mockActions as any);

      const result = await remediationService.getRemediationActions(projectId, incidentId);

      expect(result).toHaveLength(2);
      expect(result[0].actionType).toBe('switch_model');
      expect(result[1].actionType).toBe('increase_safety_threshold');
    });

    it('should support pagination with limit and offset', async () => {
      const mockIncident = {
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
      };

      const mockActions = [
        {
          id: 'action-1',
          incidentId,
          actionType: 'switch_model',
          parameters: { newModel: 'gpt-4-turbo' },
          executed: true,
          executedAt: new Date(),
          metadata: { createdBy: 'system' },
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.incident.findUnique).mockResolvedValue(mockIncident as any);
      vi.mocked(prisma.remediationAction.findMany).mockResolvedValue(mockActions as any);

      const result = await remediationService.getRemediationActions(projectId, incidentId, {
        limit: 10,
        offset: 0,
      });

      expect(result).toHaveLength(1);
      expect(vi.mocked(prisma.remediationAction.findMany)).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 0,
        })
      );
    });
  });

  describe('checkRemediationConstraints', () => {
    it('should enforce switch_model constraint', async () => {
      const mockIncident = {
        id: incidentId,
        projectId,
        status: 'open',
      };

      const mockActions = [
        {
          id: 'action-1',
          incidentId,
          actionType: 'switch_model',
          parameters: { newModel: 'gpt-4-turbo' },
          executed: true,
          executedAt: new Date(),
          metadata: {},
          createdAt: new Date(),
          incident: mockIncident,
        },
      ];

      vi.mocked(prisma.remediationAction.findMany).mockResolvedValue(mockActions as any);

      const violation = await remediationService.checkRemediationConstraints(projectId, {
        model: 'gpt-3.5-turbo',
      });

      expect(violation.violated).toBe(true);
      expect(violation.actionType).toBe('switch_model');
      expect(violation.details?.requiredModel).toBe('gpt-4-turbo');
    });

    it('should enforce increase_safety_threshold constraint', async () => {
      const mockIncident = {
        id: incidentId,
        projectId,
        status: 'open',
      };

      const mockActions = [
        {
          id: 'action-1',
          incidentId,
          actionType: 'increase_safety_threshold',
          parameters: { newThreshold: 70 },
          executed: true,
          executedAt: new Date(),
          metadata: {},
          createdAt: new Date(),
          incident: mockIncident,
        },
      ];

      vi.mocked(prisma.remediationAction.findMany).mockResolvedValue(mockActions as any);

      const violation = await remediationService.checkRemediationConstraints(projectId, {
        riskScore: 85,
      });

      expect(violation.violated).toBe(true);
      expect(violation.actionType).toBe('increase_safety_threshold');
      expect(violation.details?.riskScore).toBe(85);
      expect(violation.details?.threshold).toBe(70);
    });

    it('should enforce disable_endpoint constraint', async () => {
      const mockIncident = {
        id: incidentId,
        projectId,
        status: 'open',
      };

      const mockActions = [
        {
          id: 'action-1',
          incidentId,
          actionType: 'disable_endpoint',
          parameters: { endpoint: '/llm/request' },
          executed: true,
          executedAt: new Date(),
          metadata: {},
          createdAt: new Date(),
          incident: mockIncident,
        },
      ];

      vi.mocked(prisma.remediationAction.findMany).mockResolvedValue(mockActions as any);

      const violation = await remediationService.checkRemediationConstraints(projectId, {
        endpoint: '/llm/request',
      });

      expect(violation.violated).toBe(true);
      expect(violation.actionType).toBe('disable_endpoint');
    });

    it('should store rate_limit_user constraint in request data', async () => {
      const mockIncident = {
        id: incidentId,
        projectId,
        status: 'open',
      };

      const mockActions = [
        {
          id: 'action-1',
          incidentId,
          actionType: 'rate_limit_user',
          parameters: { requestsPerMinute: 10 },
          executed: true,
          executedAt: new Date(),
          metadata: {},
          createdAt: new Date(),
          incident: mockIncident,
        },
      ];

      vi.mocked(prisma.remediationAction.findMany).mockResolvedValue(mockActions as any);

      const requestData: any = { userId: 'user-123' };
      const violation = await remediationService.checkRemediationConstraints(projectId, requestData);

      expect(violation.violated).toBe(false);
      expect(requestData._remediationRateLimit).toBe(10);
    });

    it('should store change_system_prompt constraint in request data', async () => {
      const mockIncident = {
        id: incidentId,
        projectId,
        status: 'open',
      };

      const mockActions = [
        {
          id: 'action-1',
          incidentId,
          actionType: 'change_system_prompt',
          parameters: { newPrompt: 'You are a safe AI assistant.' },
          executed: true,
          executedAt: new Date(),
          metadata: {},
          createdAt: new Date(),
          incident: mockIncident,
        },
      ];

      vi.mocked(prisma.remediationAction.findMany).mockResolvedValue(mockActions as any);

      const requestData: any = {};
      const violation = await remediationService.checkRemediationConstraints(projectId, requestData);

      expect(violation.violated).toBe(false);
      expect(requestData._remediationSystemPrompt).toBe('You are a safe AI assistant.');
    });

    it('should return no violation when no constraints are active', async () => {
      vi.mocked(prisma.remediationAction.findMany).mockResolvedValue([]);

      const violation = await remediationService.checkRemediationConstraints(projectId, {
        model: 'gpt-3.5-turbo',
        riskScore: 85,
      });

      expect(violation.violated).toBe(false);
    });
  });

  describe('deleteRemediationAction', () => {
    it('should delete a remediation action', async () => {
      const mockIncident = {
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
      };

      const mockAction = {
        id: 'action-123',
        incidentId,
        actionType: 'switch_model',
        parameters: { newModel: 'gpt-4-turbo' },
        executed: false,
        executedAt: null,
        metadata: { createdBy: 'system' },
        createdAt: new Date(),
      };

      vi.mocked(prisma.incident.findUnique).mockResolvedValue(mockIncident as any);
      vi.mocked(prisma.remediationAction.findUnique).mockResolvedValue(mockAction as any);
      vi.mocked(prisma.remediationAction.delete).mockResolvedValue(mockAction as any);

      await remediationService.deleteRemediationAction(projectId, incidentId, 'action-123');

      expect(vi.mocked(prisma.remediationAction.delete)).toHaveBeenCalledWith({
        where: { id: 'action-123' },
      });
    });
  });

  describe('getActiveRemediationConstraints', () => {
    it('should retrieve only executed constraints for open incidents', async () => {
      const mockActions = [
        {
          id: 'action-1',
          incidentId: 'incident-1',
          actionType: 'switch_model',
          parameters: { newModel: 'gpt-4-turbo' },
          executed: true,
          executedAt: new Date(),
          metadata: {},
          createdAt: new Date(),
          incident: {
            id: 'incident-1',
            projectId,
            status: 'open',
          },
        },
        {
          id: 'action-2',
          incidentId: 'incident-2',
          actionType: 'increase_safety_threshold',
          parameters: { newThreshold: 75 },
          executed: true,
          executedAt: new Date(),
          metadata: {},
          createdAt: new Date(),
          incident: {
            id: 'incident-2',
            projectId,
            status: 'open',
          },
        },
      ];

      vi.mocked(prisma.remediationAction.findMany).mockResolvedValue(mockActions as any);

      const constraints = await remediationService.getActiveRemediationConstraints(projectId);

      expect(constraints).toHaveLength(2);
      expect(constraints[0].actionType).toBe('switch_model');
      expect(constraints[1].actionType).toBe('increase_safety_threshold');
    });
  });
});
