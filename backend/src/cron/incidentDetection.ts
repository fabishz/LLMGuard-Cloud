import cron from 'node-cron';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import * as incidentService from '../services/incidentService.js';
import * as llmService from '../services/llmService.js';

/**
 * Statistical anomaly detection using 3-sigma rule
 * 
 * The 3-sigma rule states that for a normal distribution:
 * - ~68% of data falls within 1 standard deviation
 * - ~95% of data falls within 2 standard deviations
 * - ~99.7% of data falls within 3 standard deviations
 * 
 * Values beyond 3 standard deviations are considered anomalies
 */

/**
 * Calculate mean and standard deviation for a dataset
 * @param values - Array of numeric values
 * @returns Object with mean and standard deviation
 */
function calculateStats(values: number[]): { mean: number; stdDev: number } {
  if (values.length === 0) {
    return { mean: 0, stdDev: 0 };
  }

  // Calculate mean
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

  // Calculate standard deviation
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev };
}

/**
 * Detect anomalies using 3-sigma rule
 * @param values - Array of numeric values
 * @param threshold - Number of standard deviations (default: 3)
 * @returns Array of indices where anomalies were detected
 */
function detect3SigmaAnomalies(values: number[], threshold: number = 3): number[] {
  if (values.length < 2) {
    return [];
  }

  const { mean, stdDev } = calculateStats(values);

  // If standard deviation is 0, no anomalies can be detected
  if (stdDev === 0) {
    return [];
  }

  const anomalies: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const zScore = Math.abs((values[i] - mean) / stdDev);
    if (zScore > threshold) {
      anomalies.push(i);
    }
  }

  return anomalies;
}

/**
 * Detect latency anomalies for a project
 * @param projectId - Project ID
 * @returns Detection result or null if no anomaly
 */
async function detectLatencyAnomalies(projectId: string): Promise<incidentService.DetectionResult | null> {
  try {
    // Get requests from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const requests = await llmService.getLLMRequests(projectId, {
      limit: 1000,
      startDate: oneHourAgo,
    });

    if (requests.length < 5) {
      // Need at least 5 data points for meaningful statistical analysis
      return null;
    }

    // Extract latency values
    const latencies = requests.map((req) => req.latency);

    // Detect anomalies using 3-sigma rule
    const anomalyIndices = detect3SigmaAnomalies(latencies);

    if (anomalyIndices.length > 0) {
      const { mean, stdDev } = calculateStats(latencies);
      const anomalousLatencies = anomalyIndices.map((i) => latencies[i]);
      const maxAnomaly = Math.max(...anomalousLatencies);

      logger.warn(
        {
          projectId,
          anomalyCount: anomalyIndices.length,
          mean: Math.round(mean),
          stdDev: Math.round(stdDev),
          maxAnomaly,
        },
        'Latency anomaly detected via 3-sigma rule'
      );

      return {
        triggered: true,
        triggerType: 'latency_threshold',
        severity: maxAnomaly > 10000 ? 'high' : 'medium',
        message: `${anomalyIndices.length} latency anomalies detected (3-sigma rule)`,
        metadata: {
          anomalyCount: anomalyIndices.length,
          mean: Math.round(mean),
          stdDev: Math.round(stdDev),
          maxAnomaly,
          threshold: 3,
        },
      };
    }

    return null;
  } catch (error) {
    logger.error({ error, projectId }, 'Error detecting latency anomalies');
    return null;
  }
}

/**
 * Detect risk score anomalies for a project
 * @param projectId - Project ID
 * @returns Detection result or null if no anomaly
 */
async function detectRiskScoreAnomalies(projectId: string): Promise<incidentService.DetectionResult | null> {
  try {
    // Get requests from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const requests = await llmService.getLLMRequests(projectId, {
      limit: 1000,
      startDate: oneHourAgo,
    });

    if (requests.length < 5) {
      // Need at least 5 data points for meaningful statistical analysis
      return null;
    }

    // Extract risk scores
    const riskScores = requests.map((req) => req.riskScore);

    // Detect anomalies using 3-sigma rule
    const anomalyIndices = detect3SigmaAnomalies(riskScores);

    if (anomalyIndices.length > 0) {
      const { mean, stdDev } = calculateStats(riskScores);
      const anomalousScores = anomalyIndices.map((i) => riskScores[i]);
      const maxAnomaly = Math.max(...anomalousScores);

      logger.warn(
        {
          projectId,
          anomalyCount: anomalyIndices.length,
          mean: Math.round(mean * 100) / 100,
          stdDev: Math.round(stdDev * 100) / 100,
          maxAnomaly,
        },
        'Risk score anomaly detected via 3-sigma rule'
      );

      return {
        triggered: true,
        triggerType: 'risk_score_anomaly',
        severity: maxAnomaly > 80 ? 'high' : 'medium',
        message: `${anomalyIndices.length} risk score anomalies detected (3-sigma rule)`,
        metadata: {
          anomalyCount: anomalyIndices.length,
          mean: Math.round(mean * 100) / 100,
          stdDev: Math.round(stdDev * 100) / 100,
          maxAnomaly,
          threshold: 3,
        },
      };
    }

    return null;
  } catch (error) {
    logger.error({ error, projectId }, 'Error detecting risk score anomalies');
    return null;
  }
}

/**
 * Detect error rate anomalies for a project
 * @param projectId - Project ID
 * @returns Detection result or null if no anomaly
 */
async function detectErrorRateAnomalies(projectId: string): Promise<incidentService.DetectionResult | null> {
  try {
    // Get requests from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const stats = await llmService.getLLMRequestStats(projectId, oneHourAgo);

    if (stats.totalRequests < 5) {
      // Need at least 5 requests for meaningful analysis
      return null;
    }

    // Get historical error rates for comparison (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const historicalStats = await llmService.getLLMRequestStats(projectId, sevenDaysAgo);

    if (historicalStats.totalRequests === 0) {
      return null;
    }

    // Calculate historical average error rate
    const historicalErrorRate = historicalStats.errorRate;
    const currentErrorRate = stats.errorRate;

    // Use 3-sigma approach: if current error rate is significantly higher than historical
    // Calculate standard deviation of error rate (approximation)
    const errorRateStdDev = Math.sqrt(historicalErrorRate * (1 - historicalErrorRate) / historicalStats.totalRequests);

    if (errorRateStdDev === 0) {
      return null;
    }

    const zScore = Math.abs((currentErrorRate - historicalErrorRate) / errorRateStdDev);

    if (zScore > 3) {
      logger.warn(
        {
          projectId,
          currentErrorRate: (currentErrorRate * 100).toFixed(2),
          historicalErrorRate: (historicalErrorRate * 100).toFixed(2),
          zScore: zScore.toFixed(2),
        },
        'Error rate anomaly detected via 3-sigma rule'
      );

      return {
        triggered: true,
        triggerType: 'error_rate',
        severity: currentErrorRate > 0.3 ? 'high' : 'medium',
        message: `Error rate anomaly detected (current: ${(currentErrorRate * 100).toFixed(2)}%, historical: ${(historicalErrorRate * 100).toFixed(2)}%)`,
        metadata: {
          currentErrorRate: parseFloat((currentErrorRate * 100).toFixed(2)),
          historicalErrorRate: parseFloat((historicalErrorRate * 100).toFixed(2)),
          zScore: parseFloat(zScore.toFixed(2)),
          errorCount: stats.errorCount,
          totalRequests: stats.totalRequests,
        },
      };
    }

    return null;
  } catch (error) {
    logger.error({ error, projectId }, 'Error detecting error rate anomalies');
    return null;
  }
}

/**
 * Run scheduled incident detection for all projects
 * This function:
 * 1. Fetches all projects
 * 2. Runs statistical anomaly detection (3-sigma rule) for each project
 * 3. Creates incidents for detected anomalies
 * 4. Logs results
 */
async function runScheduledIncidentDetection(): Promise<void> {
  const startTime = Date.now();

  try {
    logger.info('Starting scheduled incident detection job');

    // Get all projects
    const projects = await prisma.project.findMany({
      select: { id: true, name: true },
    });

    logger.debug({ projectCount: projects.length }, 'Processing projects for incident detection');

    let incidentsCreated = 0;
    let projectsProcessed = 0;
    let projectsWithAnomalies = 0;

    // Process each project
    for (const project of projects) {
      try {
        projectsProcessed++;

        // Run all anomaly detection methods
        const detections = await Promise.all([
          detectLatencyAnomalies(project.id),
          detectRiskScoreAnomalies(project.id),
          detectErrorRateAnomalies(project.id),
        ]);

        // Find first triggered detection
        const triggeredDetection = detections.find((d) => d?.triggered);

        if (triggeredDetection) {
          projectsWithAnomalies++;

          // Create incident from detection
          const incident = await incidentService.createIncidentFromDetection(
            project.id,
            triggeredDetection
          );

          incidentsCreated++;

          logger.info(
            {
              projectId: project.id,
              projectName: project.name,
              incidentId: incident.id,
              triggerType: triggeredDetection.triggerType,
              severity: triggeredDetection.severity,
            },
            'Incident created from scheduled detection'
          );
        }
      } catch (error) {
        logger.error(
          { error, projectId: project.id, projectName: project.name },
          'Error processing project in scheduled detection'
        );
        // Continue processing other projects
      }
    }

    const duration = Date.now() - startTime;

    logger.info(
      {
        projectsProcessed,
        projectsWithAnomalies,
        incidentsCreated,
        durationMs: duration,
      },
      'Scheduled incident detection job completed'
    );
  } catch (error) {
    logger.error({ error }, 'Fatal error in scheduled incident detection job');
  }
}

/**
 * Initialize scheduled incident detection cron job
 * Runs every hour at the top of the hour
 * 
 * Cron pattern: 0 * * * * (every hour)
 * - 0: minute (0)
 * - *: hour (every hour)
 * - *: day of month (every day)
 * - *: month (every month)
 * - *: day of week (every day)
 */
export function initializeIncidentDetectionCron(): void {
  try {
    // Schedule job to run every hour
    const job = cron.schedule('0 * * * *', async () => {
      await runScheduledIncidentDetection();
    });

    logger.info('✅ Scheduled incident detection cron job initialized (runs every hour)');

    // Optionally run immediately on startup (commented out for production)
    // await runScheduledIncidentDetection();
  } catch (error) {
    logger.error({ error }, 'Failed to initialize incident detection cron job');
    throw error;
  }
}

/**
 * Export for testing purposes
 */
export {
  runScheduledIncidentDetection,
  calculateStats,
  detect3SigmaAnomalies,
  detectLatencyAnomalies,
  detectRiskScoreAnomalies,
  detectErrorRateAnomalies,
};
