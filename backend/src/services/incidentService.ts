import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { NotFoundError } from '../utils/errors.js';
import { getLLMRequests, getLLMRequestStats } from './llmService.js';

/**
 * Incident severity levels
 */
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Incident trigger types
 */
export type IncidentTriggerType = 
  | 'latency_threshold'
  | 'error_rate'
  | 'risk_score_anomaly'
  | 'cost_spike'
  | 'webhook'
  | 'manual';

/**
 * Incident detection result
 */
export interface DetectionResult {
  triggered: boolean;
  triggerType?: IncidentTriggerType;
  severity?: IncidentSeverity;
  message?: string;
  metadata?: Record<string, any>;
}

/**
 * Configuration for incident detection thresholds
 */
export interface DetectionConfig {
  latencyThreshold: number; // milliseconds
  errorRateThreshold: number; // percentage (0-100)
  riskScoreThreshold: number; // 0-100
  consecutiveHighRiskCount: number; // number of consecutive high-risk requests
  costSpikePercentage: number; // percentage increase above daily average
}

/**
 * Default detection configuration
 */
const DEFAULT_CONFIG: DetectionConfig = {
  latencyThreshold: 5000, // 5 seconds
  errorRateThreshold: 10, // 10%
  riskScoreThreshold: 80, // high risk
  consecutiveHighRiskCount: 3, // 3 consecutive
  costSpikePercentage: 50, // 50% above average
};

/**
 * Model pricing for cost calculation (per 1K tokens)
 */
const MODEL_PRICING: Record<string, number> = {
  'gpt-4': 0.03,
  'gpt-4-turbo': 0.01,
  'gpt-3.5-turbo': 0.0005,
  'o3-mini': 0.001,
  'claude-3': 0.015,
  'llama-2': 0.0001,
};

/**
 * Get default pricing for a model
 * @param model - Model name
 * @returns Price per 1K tokens
 */
function getModelPrice(model: string): number {
  const normalizedModel = model.toLowerCase();
  
  // Check for exact match
  if (normalizedModel in MODEL_PRICING) {
    return MODEL_PRICING[normalizedModel];
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(MODEL_PRICING)) {
    if (normalizedModel.includes(key)) {
      return value;
    }
  }

  // Default pricing for unknown models
  return 0.01;
}

/**
 * Calculate estimated cost for tokens
 * @param tokens - Number of tokens
 * @param model - Model name
 * @returns Estimated cost in dollars
 */
function calculateCost(tokens: number, model: string): number {
  const pricePerK = getModelPrice(model);
  return (tokens / 1000) * pricePerK;
}

/**
 * Check for latency threshold violation
 * Detects if recent requests have latency > threshold
 * 
 * @param projectId - Project ID
 * @param config - Detection configuration
 * @returns Detection result
 */
export async function checkLatencyThreshold(
  projectId: string,
  config: DetectionConfig = DEFAULT_CONFIG
): Promise<DetectionResult> {
  try {
    // Get recent requests (last 100)
    const requests = await getLLMRequests(projectId, { limit: 100 });

    if (requests.length === 0) {
      return { triggered: false };
    }

    // Check for requests exceeding latency threshold
    const violatingRequests = requests.filter(
      (req) => req.latency > config.latencyThreshold
    );

    if (violatingRequests.length > 0) {
      const avgLatency = violatingRequests.reduce((sum, req) => sum + req.latency, 0) / violatingRequests.length;
      const maxLatency = Math.max(...violatingRequests.map((req) => req.latency));

      logger.warn(
        {
          projectId,
          violatingCount: violatingRequests.length,
          avgLatency,
          maxLatency,
          threshold: config.latencyThreshold,
        },
        'Latency threshold violation detected'
      );

      return {
        triggered: true,
        triggerType: 'latency_threshold',
        severity: maxLatency > 10000 ? 'high' : 'medium',
        message: `${violatingRequests.length} requests exceeded latency threshold (${config.latencyThreshold}ms)`,
        metadata: {
          violatingCount: violatingRequests.length,
          avgLatency: Math.round(avgLatency),
          maxLatency,
          threshold: config.latencyThreshold,
        },
      };
    }

    return { triggered: false };
  } catch (error) {
    logger.error({ error, projectId }, 'Error checking latency threshold');
    return { triggered: false };
  }
}

/**
 * Check for error rate anomaly
 * Detects if error rate in last hour exceeds threshold
 * 
 * @param projectId - Project ID
 * @param config - Detection configuration
 * @returns Detection result
 */
export async function checkErrorRate(
  projectId: string,
  config: DetectionConfig = DEFAULT_CONFIG
): Promise<DetectionResult> {
  try {
    // Get requests from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const stats = await getLLMRequestStats(projectId, oneHourAgo);

    if (stats.totalRequests === 0) {
      return { triggered: false };
    }

    const errorRatePercentage = stats.errorRate * 100;

    if (errorRatePercentage > config.errorRateThreshold) {
      logger.warn(
        {
          projectId,
          errorRate: errorRatePercentage,
          errorCount: stats.errorCount,
          totalRequests: stats.totalRequests,
          threshold: config.errorRateThreshold,
        },
        'Error rate threshold violation detected'
      );

      return {
        triggered: true,
        triggerType: 'error_rate',
        severity: errorRatePercentage > 30 ? 'high' : 'medium',
        message: `Error rate ${errorRatePercentage.toFixed(2)}% exceeds threshold (${config.errorRateThreshold}%)`,
        metadata: {
          errorRate: errorRatePercentage,
          errorCount: stats.errorCount,
          totalRequests: stats.totalRequests,
          threshold: config.errorRateThreshold,
        },
      };
    }

    return { triggered: false };
  } catch (error) {
    logger.error({ error, projectId }, 'Error checking error rate');
    return { triggered: false };
  }
}

/**
 * Check for risk score anomaly
 * Detects if there are 3+ consecutive requests with risk score > threshold
 * 
 * @param projectId - Project ID
 * @param config - Detection configuration
 * @returns Detection result
 */
export async function checkRiskScoreAnomaly(
  projectId: string,
  config: DetectionConfig = DEFAULT_CONFIG
): Promise<DetectionResult> {
  try {
    // Get recent requests (last 50)
    const requests = await getLLMRequests(projectId, { limit: 50 });

    if (requests.length < config.consecutiveHighRiskCount) {
      return { triggered: false };
    }

    // Find consecutive high-risk requests
    let consecutiveCount = 0;
    let maxConsecutive = 0;
    const highRiskRequests = [];

    for (const req of requests) {
      if (req.riskScore > config.riskScoreThreshold) {
        consecutiveCount++;
        highRiskRequests.push(req);
        maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
      } else {
        consecutiveCount = 0;
      }
    }

    if (maxConsecutive >= config.consecutiveHighRiskCount) {
      logger.warn(
        {
          projectId,
          consecutiveCount: maxConsecutive,
          threshold: config.riskScoreThreshold,
          requiredCount: config.consecutiveHighRiskCount,
        },
        'Risk score anomaly detected'
      );

      return {
        triggered: true,
        triggerType: 'risk_score_anomaly',
        severity: 'high',
        message: `${maxConsecutive} consecutive requests with risk score > ${config.riskScoreThreshold}`,
        metadata: {
          consecutiveCount: maxConsecutive,
          highRiskCount: highRiskRequests.length,
          threshold: config.riskScoreThreshold,
          requiredCount: config.consecutiveHighRiskCount,
        },
      };
    }

    return { triggered: false };
  } catch (error) {
    logger.error({ error, projectId }, 'Error checking risk score anomaly');
    return { triggered: false };
  }
}

/**
 * Check for cost spike
 * Detects if daily cost exceeds 50% above the daily average
 * 
 * @param projectId - Project ID
 * @param config - Detection configuration
 * @returns Detection result
 */
export async function checkCostSpike(
  projectId: string,
  config: DetectionConfig = DEFAULT_CONFIG
): Promise<DetectionResult> {
  try {
    // Get requests from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const allRequests = await getLLMRequests(projectId, {
      limit: 10000,
      startDate: thirtyDaysAgo,
    });

    if (allRequests.length === 0) {
      return { triggered: false };
    }

    // Group requests by day and calculate daily costs
    const dailyCosts: Record<string, number> = {};
    
    for (const req of allRequests) {
      const date = new Date(req.createdAt).toISOString().split('T')[0];
      const cost = calculateCost(req.tokens, req.model);
      dailyCosts[date] = (dailyCosts[date] || 0) + cost;
    }

    // Calculate average daily cost
    const dailyCostValues = Object.values(dailyCosts);
    const avgDailyCost = dailyCostValues.reduce((sum, cost) => sum + cost, 0) / dailyCostValues.length;

    // Get today's cost
    const today = new Date().toISOString().split('T')[0];
    const todayCost = dailyCosts[today] || 0;

    // Check if today's cost exceeds threshold
    const costIncreasePercentage = ((todayCost - avgDailyCost) / avgDailyCost) * 100;

    if (costIncreasePercentage > config.costSpikePercentage) {
      logger.warn(
        {
          projectId,
          todayCost: todayCost.toFixed(4),
          avgDailyCost: avgDailyCost.toFixed(4),
          increasePercentage: costIncreasePercentage.toFixed(2),
          threshold: config.costSpikePercentage,
        },
        'Cost spike detected'
      );

      return {
        triggered: true,
        triggerType: 'cost_spike',
        severity: costIncreasePercentage > 100 ? 'high' : 'medium',
        message: `Daily cost increased ${costIncreasePercentage.toFixed(2)}% above average`,
        metadata: {
          todayCost: parseFloat(todayCost.toFixed(4)),
          avgDailyCost: parseFloat(avgDailyCost.toFixed(4)),
          increasePercentage: parseFloat(costIncreasePercentage.toFixed(2)),
          threshold: config.costSpikePercentage,
        },
      };
    }

    return { triggered: false };
  } catch (error) {
    logger.error({ error, projectId }, 'Error checking cost spike');
    return { triggered: false };
  }
}

/**
 * Run all detection checks for a project
 * Returns the first triggered detection or null if none triggered
 * 
 * @param projectId - Project ID
 * @param config - Detection configuration
 * @returns First triggered detection result or null
 */
export async function runAllDetections(
  projectId: string,
  config: DetectionConfig = DEFAULT_CONFIG
): Promise<DetectionResult | null> {
  try {
    // Run all detection checks
    const detections = await Promise.all([
      checkLatencyThreshold(projectId, config),
      checkErrorRate(projectId, config),
      checkRiskScoreAnomaly(projectId, config),
      checkCostSpike(projectId, config),
    ]);

    // Return first triggered detection
    for (const detection of detections) {
      if (detection.triggered) {
        return detection;
      }
    }

    return null;
  } catch (error) {
    logger.error({ error, projectId }, 'Error running all detections');
    return null;
  }
}

/**
 * Create an incident from a detection result
 * 
 * @param projectId - Project ID
 * @param detection - Detection result
 * @returns Created incident
 */
export async function createIncidentFromDetection(
  projectId: string,
  detection: DetectionResult
): Promise<any> {
  try {
    if (!detection.triggered || !detection.triggerType || !detection.severity) {
      throw new Error('Invalid detection result');
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project');
    }

    // Create incident
    const incident = await prisma.incident.create({
      data: {
        projectId,
        severity: detection.severity,
        triggerType: detection.triggerType,
        status: 'open',
        metadata: detection.metadata || {},
      },
    });

    logger.info(
      {
        incidentId: incident.id,
        projectId,
        triggerType: detection.triggerType,
        severity: detection.severity,
      },
      'Incident created from detection'
    );

    return incident;
  } catch (error) {
    logger.error({ error, projectId }, 'Error creating incident from detection');
    throw error;
  }
}

/**
 * Get incident by ID
 * 
 * @param projectId - Project ID
 * @param incidentId - Incident ID
 * @returns Incident details
 */
export async function getIncident(projectId: string, incidentId: string): Promise<any> {
  try {
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        remediationActions: true,
      },
    });

    if (!incident || incident.projectId !== projectId) {
      throw new NotFoundError('Incident');
    }

    return incident;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, projectId, incidentId }, 'Error getting incident');
    throw error;
  }
}

/**
 * Get incidents for a project
 * 
 * @param projectId - Project ID
 * @param options - Query options (status, limit, offset)
 * @returns Array of incidents
 */
export interface GetIncidentsOptions {
  status?: string;
  limit?: number;
  offset?: number;
}

export async function getIncidents(
  projectId: string,
  options: GetIncidentsOptions = {}
): Promise<any[]> {
  try {
    const { status, limit = 50, offset = 0 } = options;

    const where: any = { projectId };
    if (status) {
      where.status = status;
    }

    const incidents = await prisma.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        remediationActions: true,
      },
    });

    logger.debug({ projectId, count: incidents.length }, 'Incidents retrieved');

    return incidents;
  } catch (error) {
    logger.error({ error, projectId }, 'Error getting incidents');
    throw error;
  }
}

/**
 * Resolve an incident
 * 
 * @param projectId - Project ID
 * @param incidentId - Incident ID
 * @returns Updated incident
 */
export async function resolveIncident(projectId: string, incidentId: string): Promise<any> {
  try {
    await getIncident(projectId, incidentId);

    const updated = await prisma.incident.update({
      where: { id: incidentId },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
      },
      include: {
        remediationActions: true,
      },
    });

    logger.info(
      { incidentId, projectId },
      'Incident resolved'
    );

    return updated;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, projectId, incidentId }, 'Error resolving incident');
    throw error;
  }
}
