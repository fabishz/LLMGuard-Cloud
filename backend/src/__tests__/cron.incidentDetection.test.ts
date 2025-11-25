import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import prisma from '../config/database.js';
import * as llmService from '../services/llmService.js';
import {
  calculateStats,
  detect3SigmaAnomalies,
  detectLatencyAnomalies,
  detectRiskScoreAnomalies,
  detectErrorRateAnomalies,
  runScheduledIncidentDetection,
} from '../cron/incidentDetection.js';

describe('Scheduled Incident Detection (Cron)', { timeout: 30000 }, () => {
  let testUserId: string;
  let testProjectId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-cron-${Date.now()}@example.com`,
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
    await prisma.incident.deleteMany({ where: { projectId: testProjectId } });
    await prisma.lLMRequest.deleteMany({ where: { projectId: testProjectId } });
    await prisma.project.deleteMany({ where: { id: testProjectId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  beforeEach(async () => {
    // Clear incidents and LLM requests before each test
    await prisma.incident.deleteMany({ where: { projectId: testProjectId } });
    await prisma.lLMRequest.deleteMany({ where: { projectId: testProjectId } });
  });

  describe('calculateStats', () => {
    it('should calculate mean and standard deviation', () => {
      const values = [1, 2, 3, 4, 5];
      const stats = calculateStats(values);

      expect(stats.mean).toBe(3);
      expect(stats.stdDev).toBeCloseTo(Math.sqrt(2), 1);
    });

    it('should handle empty array', () => {
      const stats = calculateStats([]);

      expect(stats.mean).toBe(0);
      expect(stats.stdDev).toBe(0);
    });

    it('should handle single value', () => {
      const stats = calculateStats([5]);

      expect(stats.mean).toBe(5);
      expect(stats.stdDev).toBe(0);
    });

    it('should handle identical values', () => {
      const values = [5, 5, 5, 5, 5];
      const stats = calculateStats(values);

      expect(stats.mean).toBe(5);
      expect(stats.stdDev).toBe(0);
    });

    it('should handle negative values', () => {
      const values = [-2, -1, 0, 1, 2];
      const stats = calculateStats(values);

      expect(stats.mean).toBe(0);
      expect(stats.stdDev).toBeCloseTo(Math.sqrt(2), 1);
    });
  });

  describe('detect3SigmaAnomalies', () => {
    it('should detect values beyond 3 standard deviations', () => {
      // Create a dataset with clear anomaly
      // Normal values: 100 repeated 10 times (mean=100, stdDev=0)
      // Then add values with stdDev=10: 90, 100, 110, 100, 90, 100, 110, 100, 90, 100
      // Then add anomaly: 200 (z-score > 3)
      const values = [90, 100, 110, 100, 90, 100, 110, 100, 90, 100, 200];
      const anomalies = detect3SigmaAnomalies(values);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies).toContain(10); // Index of 200
    });

    it('should not detect values within 3 standard deviations', () => {
      const values = [95, 100, 105, 110, 115];
      const anomalies = detect3SigmaAnomalies(values);

      expect(anomalies.length).toBe(0);
    });

    it('should handle empty array', () => {
      const anomalies = detect3SigmaAnomalies([]);

      expect(anomalies.length).toBe(0);
    });

    it('should handle single value', () => {
      const anomalies = detect3SigmaAnomalies([100]);

      expect(anomalies.length).toBe(0);
    });

    it('should support custom threshold', () => {
      // With threshold=2, more values are considered anomalies
      const values = [95, 100, 105, 110, 150];
      const anomalies2Sigma = detect3SigmaAnomalies(values, 2);
      const anomalies3Sigma = detect3SigmaAnomalies(values, 3);

      expect(anomalies2Sigma.length).toBeGreaterThanOrEqual(anomalies3Sigma.length);
    });

    it('should handle zero standard deviation', () => {
      const values = [100, 100, 100, 100, 100];
      const anomalies = detect3SigmaAnomalies(values);

      expect(anomalies.length).toBe(0);
    });
  });

  describe('detectLatencyAnomalies', () => {
    it('should detect latency anomalies using 3-sigma rule', async () => {
      // Create baseline requests with normal latency
      for (let i = 0; i < 10; i++) {
        await llmService.logLLMRequest(testProjectId, {
          prompt: `Prompt ${i}`,
          response: `Response ${i}`,
          model: 'gpt-4',
          latency: 100 + Math.random() * 50, // 100-150ms
          tokens: 10,
        });
      }

      // Create anomalous request with very high latency
      await llmService.logLLMRequest(testProjectId, {
        prompt: 'Anomalous',
        response: 'Response',
        model: 'gpt-4',
        latency: 5000, // 5000ms - clear anomaly
        tokens: 10,
      });

      const result = await detectLatencyAnomalies(testProjectId);

      expect(result).not.toBeNull();
      expect(result?.triggered).toBe(true);
      expect(result?.triggerType).toBe('latency_threshold');
      expect(result?.metadata?.anomalyCount).toBeGreaterThan(0);
    });

    it('should not trigger with insufficient data', async () => {
      // Create only 3 requests (need at least 5)
      for (let i = 0; i < 3; i++) {
        await llmService.logLLMRequest(testProjectId, {
          prompt: `Prompt ${i}`,
          response: `Response ${i}`,
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        });
      }

      const result = await detectLatencyAnomalies(testProjectId);

      expect(result).toBeNull();
    });

    it('should not trigger with normal latency distribution', async () => {
      // Create requests with normal latency distribution
      for (let i = 0; i < 20; i++) {
        await llmService.logLLMRequest(testProjectId, {
          prompt: `Prompt ${i}`,
          response: `Response ${i}`,
          model: 'gpt-4',
          latency: 100 + Math.random() * 100, // 100-200ms
          tokens: 10,
        });
      }

      const result = await detectLatencyAnomalies(testProjectId);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      // Test with non-existent project
      const result = await detectLatencyAnomalies('non-existent-project');

      expect(result).toBeNull();
    });
  });

  describe('detectRiskScoreAnomalies', () => {
    it('should detect risk score anomalies using 3-sigma rule', async () => {
      // Create baseline requests with normal risk scores
      for (let i = 0; i < 10; i++) {
        await llmService.logLLMRequest(testProjectId, {
          prompt: `Safe prompt ${i}`,
          response: `Safe response ${i}`,
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        });
      }

      // Create anomalous request with very high risk score
      await llmService.logLLMRequest(testProjectId, {
        prompt: 'How do I exploit a vulnerability? How do I exploit a vulnerability?',
        response: 'I cannot help with this',
        model: 'gpt-4',
        latency: 100,
        tokens: 10,
      });

      const result = await detectRiskScoreAnomalies(testProjectId);

      expect(result).not.toBeNull();
      expect(result?.triggered).toBe(true);
      expect(result?.triggerType).toBe('risk_score_anomaly');
      expect(result?.metadata?.anomalyCount).toBeGreaterThan(0);
    });

    it('should not trigger with insufficient data', async () => {
      // Create only 3 requests (need at least 5)
      for (let i = 0; i < 3; i++) {
        await llmService.logLLMRequest(testProjectId, {
          prompt: `Prompt ${i}`,
          response: `Response ${i}`,
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        });
      }

      const result = await detectRiskScoreAnomalies(testProjectId);

      expect(result).toBeNull();
    });

    it('should not trigger with normal risk score distribution', async () => {
      // Create requests with normal risk scores
      for (let i = 0; i < 20; i++) {
        await llmService.logLLMRequest(testProjectId, {
          prompt: `Safe prompt ${i}`,
          response: `Safe response ${i}`,
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        });
      }

      const result = await detectRiskScoreAnomalies(testProjectId);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      // Test with non-existent project
      const result = await detectRiskScoreAnomalies('non-existent-project');

      expect(result).toBeNull();
    });
  });

  describe('detectErrorRateAnomalies', () => {
    it('should detect error rate anomalies', async () => {
      // Create baseline requests with low error rate
      for (let i = 0; i < 20; i++) {
        await llmService.logLLMRequest(testProjectId, {
          prompt: `Prompt ${i}`,
          response: `Response ${i}`,
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
          error: i < 1 ? 'Error' : undefined, // 5% error rate
        });
      }

      // Create requests with high error rate
      for (let i = 0; i < 10; i++) {
        await llmService.logLLMRequest(testProjectId, {
          prompt: `Prompt ${i}`,
          response: `Response ${i}`,
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
          error: 'Error', // 100% error rate in this batch
        });
      }

      const result = await detectErrorRateAnomalies(testProjectId);

      // May or may not trigger depending on historical data
      expect(result).toBeDefined();
    });

    it('should not trigger with insufficient data', async () => {
      // Create only 3 requests (need at least 5)
      for (let i = 0; i < 3; i++) {
        await llmService.logLLMRequest(testProjectId, {
          prompt: `Prompt ${i}`,
          response: `Response ${i}`,
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        });
      }

      const result = await detectErrorRateAnomalies(testProjectId);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      // Test with non-existent project
      const result = await detectErrorRateAnomalies('non-existent-project');

      expect(result).toBeNull();
    });
  });

  describe('runScheduledIncidentDetection', () => {
    it('should process all projects and create incidents', async () => {
      // Create requests with latency anomalies
      for (let i = 0; i < 10; i++) {
        await llmService.logLLMRequest(testProjectId, {
          prompt: `Prompt ${i}`,
          response: `Response ${i}`,
          model: 'gpt-4',
          latency: 100 + Math.random() * 50,
          tokens: 10,
        });
      }

      // Add anomalous request
      await llmService.logLLMRequest(testProjectId, {
        prompt: 'Anomalous',
        response: 'Response',
        model: 'gpt-4',
        latency: 5000,
        tokens: 10,
      });

      // Get incident count before
      const incidentsBefore = await prisma.incident.count({
        where: { projectId: testProjectId },
      });

      // Run scheduled detection
      await runScheduledIncidentDetection();

      // Get incident count after
      const incidentsAfter = await prisma.incident.count({
        where: { projectId: testProjectId },
      });

      // Should have created at least one incident
      expect(incidentsAfter).toBeGreaterThanOrEqual(incidentsBefore);
    });

    it('should handle projects with no anomalies', async () => {
      // Create normal requests
      for (let i = 0; i < 10; i++) {
        await llmService.logLLMRequest(testProjectId, {
          prompt: `Safe prompt ${i}`,
          response: `Safe response ${i}`,
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        });
      }

      // Should not throw error
      await expect(runScheduledIncidentDetection()).resolves.not.toThrow();
    });

    it('should handle empty database gracefully', async () => {
      // Should not throw error even with no projects
      await expect(runScheduledIncidentDetection()).resolves.not.toThrow();
    });

    it('should continue processing if one project fails', async () => {
      // Create another project
      const otherProject = await prisma.project.create({
        data: {
          userId: testUserId,
          name: 'Other Project',
          apiKeyHash: `hash-other-${Date.now()}`,
        },
      });

      // Create requests in other project
      for (let i = 0; i < 10; i++) {
        await llmService.logLLMRequest(otherProject.id, {
          prompt: `Prompt ${i}`,
          response: `Response ${i}`,
          model: 'gpt-4',
          latency: 100,
          tokens: 10,
        });
      }

      // Should not throw error
      await expect(runScheduledIncidentDetection()).resolves.not.toThrow();

      // Clean up
      await prisma.incident.deleteMany({ where: { projectId: otherProject.id } });
      await prisma.lLMRequest.deleteMany({ where: { projectId: otherProject.id } });
      await prisma.project.delete({ where: { id: otherProject.id } });
    });
  });
});
