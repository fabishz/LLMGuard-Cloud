import prisma from '../config/database.js';
import { MODEL_PRICING } from '../config/constants.js';
import { logger } from '../utils/logger.js';
import { getCachedMetrics } from '../cron/metricsAggregation.js';

/**
 * Daily summary of metrics for a project
 */
export interface DailySummary {
  date: string;
  requests: number;
  errors: number;
  avgLatency: number;
  tokens: number;
  cost: number;
}

/**
 * Model usage breakdown
 */
export interface ModelUsage {
  model: string;
  count: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
}

/**
 * Project metrics aggregation
 */
export interface ProjectMetrics {
  projectId: string;
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  averageLatency: number;
  totalTokens: number;
  estimatedCost: number;
  modelBreakdown: ModelUsage[];
  dailySummary: DailySummary[];
  highRiskCount: number;
  averageRiskScore: number;
}

/**
 * Get the pricing for a model
 * @param model - Model name
 * @returns Price per 1K tokens, defaults to 0.001 if model not found
 */
function getModelPrice(model: string): number {
  return MODEL_PRICING[model as keyof typeof MODEL_PRICING] || 0.001;
}

/**
 * Calculate cost for tokens and model
 * @param tokens - Number of tokens
 * @param model - Model name
 * @returns Estimated cost in USD
 */
function calculateCost(tokens: number, model: string): number {
  const pricePerK = getModelPrice(model);
  return (tokens / 1000) * pricePerK;
}

/**
 * Get metrics for a project within a date range
 * 
 * This function:
 * 1. Aggregates all LLM requests for the project
 * 2. Calculates daily summaries
 * 3. Computes model usage breakdown
 * 4. Estimates total costs
 * 5. Calculates error rates and latency averages
 * 
 * @param projectId - Project ID to get metrics for
 * @param startDate - Start date for metrics (optional, defaults to 30 days ago)
 * @param endDate - End date for metrics (optional, defaults to now)
 * @returns Aggregated project metrics
 * @throws Error if retrieval fails
 */
export async function getProjectMetrics(
  projectId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ProjectMetrics> {
  try {
    // Set default date range (last 30 days)
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    logger.debug(
      { projectId, startDate: start, endDate: end },
      'Calculating metrics for project'
    );

    // Get all LLM requests in the date range
    const requests = await prisma.lLMRequest.findMany({
      where: {
        projectId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        id: true,
        model: true,
        latency: true,
        tokens: true,
        riskScore: true,
        error: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // If no requests, return empty metrics
    if (requests.length === 0) {
      return {
        projectId,
        totalRequests: 0,
        errorCount: 0,
        errorRate: 0,
        averageLatency: 0,
        totalTokens: 0,
        estimatedCost: 0,
        modelBreakdown: [],
        dailySummary: [],
        highRiskCount: 0,
        averageRiskScore: 0,
      };
    }

    // Calculate aggregate statistics
    const errorCount = requests.filter((r) => r.error).length;
    const totalLatency = requests.reduce((sum, r) => sum + r.latency, 0);
    const totalTokens = requests.reduce((sum, r) => sum + r.tokens, 0);
    const totalRiskScore = requests.reduce((sum, r) => sum + r.riskScore, 0);
    const highRiskCount = requests.filter((r) => r.riskScore > 80).length;

    // Calculate total cost
    let totalCost = 0;
    for (const req of requests) {
      totalCost += calculateCost(req.tokens, req.model);
    }

    // Build model breakdown
    const modelMap = new Map<string, { count: number; tokens: number; latency: number }>();
    for (const req of requests) {
      const existing = modelMap.get(req.model) || { count: 0, tokens: 0, latency: 0 };
      modelMap.set(req.model, {
        count: existing.count + 1,
        tokens: existing.tokens + req.tokens,
        latency: existing.latency + req.latency,
      });
    }

    const modelBreakdown: ModelUsage[] = Array.from(modelMap.entries()).map(([model, data]) => ({
      model,
      count: data.count,
      totalTokens: data.tokens,
      totalCost: calculateCost(data.tokens, model),
      avgLatency: Math.round(data.latency / data.count),
    }));

    // Build daily summary
    const dailyMap = new Map<string, { requests: number; errors: number; latency: number; tokens: number }>();

    for (const req of requests) {
      const dateKey = req.createdAt.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { requests: 0, errors: 0, latency: 0, tokens: 0 };
      dailyMap.set(dateKey, {
        requests: existing.requests + 1,
        errors: existing.errors + (req.error ? 1 : 0),
        latency: existing.latency + req.latency,
        tokens: existing.tokens + req.tokens,
      });
    }

    const dailySummary: DailySummary[] = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        requests: data.requests,
        errors: data.errors,
        avgLatency: Math.round(data.latency / data.requests),
        tokens: data.tokens,
        cost: calculateCost(data.tokens, 'gpt-4'), // Use average model for daily cost
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const metrics: ProjectMetrics = {
      projectId,
      totalRequests: requests.length,
      errorCount,
      errorRate: errorCount / requests.length,
      averageLatency: Math.round(totalLatency / requests.length),
      totalTokens,
      estimatedCost: Math.round(totalCost * 100) / 100, // Round to 2 decimal places
      modelBreakdown,
      dailySummary,
      highRiskCount,
      averageRiskScore: Math.round((totalRiskScore / requests.length) * 100) / 100,
    };

    logger.info(
      {
        projectId,
        totalRequests: metrics.totalRequests,
        estimatedCost: metrics.estimatedCost,
        errorRate: metrics.errorRate,
      },
      'Project metrics calculated successfully'
    );

    return metrics;
  } catch (error) {
    logger.error({ error, projectId }, 'Failed to calculate project metrics');
    throw new Error('Failed to calculate project metrics');
  }
}

/**
 * Get daily metrics for a specific date with caching support
 * 
 * This function:
 * 1. Checks if metrics are cached for the date
 * 2. Returns cached metrics if available (fast path)
 * 3. Falls back to calculating metrics if not cached
 * 
 * @param projectId - Project ID to get metrics for
 * @param date - Date to get metrics for
 * @param useCache - Whether to use cached metrics (default: true)
 * @returns Daily metrics for the specified date
 * @throws Error if retrieval fails
 */
export async function getDailyMetrics(projectId: string, date: Date, useCache: boolean = true): Promise<DailySummary> {
  // Try to get cached metrics first
  if (useCache) {
    try {
      const cached = await getCachedMetrics(projectId, date);
      if (cached) {
        return {
          date: cached.date,
          requests: cached.totalRequests,
          errors: cached.errorCount,
          avgLatency: cached.averageLatency,
          tokens: cached.totalTokens,
          cost: cached.estimatedCost,
        };
      }
    } catch (error) {
      logger.debug(
        { error, projectId, date },
        'Failed to retrieve cached metrics, falling back to calculation'
      );
      // Fall through to calculate metrics
    }
  }

  // Calculate metrics if not cached
  return getDailyMetricsCalculated(projectId, date);
}

/**
 * Get daily metrics for a specific date (calculated, not cached)
 * @param projectId - Project ID to get metrics for
 * @param date - Date to get metrics for
 * @returns Daily metrics for the specified date
 * @throws Error if retrieval fails
 */
async function getDailyMetricsCalculated(projectId: string, date: Date): Promise<DailySummary> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const requests = await prisma.lLMRequest.findMany({
      where: {
        projectId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        latency: true,
        tokens: true,
        error: true,
        model: true,
      },
    });

    if (requests.length === 0) {
      return {
        date: date.toISOString().split('T')[0],
        requests: 0,
        errors: 0,
        avgLatency: 0,
        tokens: 0,
        cost: 0,
      };
    }

    const errorCount = requests.filter((r) => r.error).length;
    const totalLatency = requests.reduce((sum, r) => sum + r.latency, 0);
    const totalTokens = requests.reduce((sum, r) => sum + r.tokens, 0);

    let totalCost = 0;
    for (const req of requests) {
      totalCost += calculateCost(req.tokens, req.model);
    }

    return {
      date: date.toISOString().split('T')[0],
      requests: requests.length,
      errors: errorCount,
      avgLatency: Math.round(totalLatency / requests.length),
      tokens: totalTokens,
      cost: Math.round(totalCost * 100) / 100,
    };
  } catch (error) {
    logger.error({ error, projectId, date }, 'Failed to calculate daily metrics');
    throw new Error('Failed to calculate daily metrics');
  }
}

/**
 * Get model usage breakdown for a project
 * @param projectId - Project ID to get model usage for
 * @param startDate - Start date for metrics (optional)
 * @param endDate - End date for metrics (optional)
 * @returns Array of model usage statistics
 * @throws Error if retrieval fails
 */
export async function getModelUsageBreakdown(
  projectId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ModelUsage[]> {
  try {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const requests = await prisma.lLMRequest.findMany({
      where: {
        projectId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        model: true,
        latency: true,
        tokens: true,
      },
    });

    const modelMap = new Map<string, { count: number; tokens: number; latency: number }>();

    for (const req of requests) {
      const existing = modelMap.get(req.model) || { count: 0, tokens: 0, latency: 0 };
      modelMap.set(req.model, {
        count: existing.count + 1,
        tokens: existing.tokens + req.tokens,
        latency: existing.latency + req.latency,
      });
    }

    const modelUsage: ModelUsage[] = Array.from(modelMap.entries())
      .map(([model, data]) => ({
        model,
        count: data.count,
        totalTokens: data.tokens,
        totalCost: calculateCost(data.tokens, model),
        avgLatency: Math.round(data.latency / data.count),
      }))
      .sort((a, b) => b.count - a.count);

    logger.debug(
      { projectId, modelCount: modelUsage.length },
      'Model usage breakdown calculated'
    );

    return modelUsage;
  } catch (error) {
    logger.error({ error, projectId }, 'Failed to calculate model usage breakdown');
    throw new Error('Failed to calculate model usage breakdown');
  }
}

/**
 * Get error rate statistics for a project
 * @param projectId - Project ID to get error rate for
 * @param startDate - Start date for metrics (optional)
 * @param endDate - End date for metrics (optional)
 * @returns Object with error count, total requests, and error rate
 * @throws Error if retrieval fails
 */
export interface ErrorRateStats {
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  errorsByModel: Record<string, number>;
}

export async function getErrorRateStats(
  projectId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ErrorRateStats> {
  try {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const requests = await prisma.lLMRequest.findMany({
      where: {
        projectId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        error: true,
        model: true,
      },
    });

    const errorCount = requests.filter((r) => r.error).length;
    const errorsByModel: Record<string, number> = {};

    for (const req of requests) {
      if (req.error) {
        errorsByModel[req.model] = (errorsByModel[req.model] || 0) + 1;
      }
    }

    const stats: ErrorRateStats = {
      totalRequests: requests.length,
      errorCount,
      errorRate: requests.length > 0 ? errorCount / requests.length : 0,
      errorsByModel,
    };

    logger.debug(
      { projectId, errorRate: stats.errorRate },
      'Error rate statistics calculated'
    );

    return stats;
  } catch (error) {
    logger.error({ error, projectId }, 'Failed to calculate error rate statistics');
    throw new Error('Failed to calculate error rate statistics');
  }
}

/**
 * Get token usage statistics for a project
 * @param projectId - Project ID to get token usage for
 * @param startDate - Start date for metrics (optional)
 * @param endDate - End date for metrics (optional)
 * @returns Object with total tokens, average tokens per request, and tokens by model
 * @throws Error if retrieval fails
 */
export interface TokenUsageStats {
  totalTokens: number;
  averageTokensPerRequest: number;
  tokensByModel: Record<string, number>;
  requestCount: number;
}

export async function getTokenUsageStats(
  projectId: string,
  startDate?: Date,
  endDate?: Date
): Promise<TokenUsageStats> {
  try {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const requests = await prisma.lLMRequest.findMany({
      where: {
        projectId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        tokens: true,
        model: true,
      },
    });

    const totalTokens = requests.reduce((sum, r) => sum + r.tokens, 0);
    const tokensByModel: Record<string, number> = {};

    for (const req of requests) {
      tokensByModel[req.model] = (tokensByModel[req.model] || 0) + req.tokens;
    }

    const stats: TokenUsageStats = {
      totalTokens,
      averageTokensPerRequest: requests.length > 0 ? Math.round(totalTokens / requests.length) : 0,
      tokensByModel,
      requestCount: requests.length,
    };

    logger.debug(
      { projectId, totalTokens: stats.totalTokens },
      'Token usage statistics calculated'
    );

    return stats;
  } catch (error) {
    logger.error({ error, projectId }, 'Failed to calculate token usage statistics');
    throw new Error('Failed to calculate token usage statistics');
  }
}

/**
 * Get cost estimation for a project
 * @param projectId - Project ID to estimate costs for
 * @param startDate - Start date for metrics (optional)
 * @param endDate - End date for metrics (optional)
 * @returns Object with total cost, cost by model, and average cost per request
 * @throws Error if retrieval fails
 */
export interface CostEstimate {
  totalCost: number;
  costByModel: Record<string, number>;
  averageCostPerRequest: number;
  requestCount: number;
}

export async function getCostEstimate(
  projectId: string,
  startDate?: Date,
  endDate?: Date
): Promise<CostEstimate> {
  try {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const requests = await prisma.lLMRequest.findMany({
      where: {
        projectId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        tokens: true,
        model: true,
      },
    });

    let totalCost = 0;
    const costByModel: Record<string, number> = {};

    for (const req of requests) {
      const cost = calculateCost(req.tokens, req.model);
      totalCost += cost;
      costByModel[req.model] = (costByModel[req.model] || 0) + cost;
    }

    // Round costs to 2 decimal places
    totalCost = Math.round(totalCost * 100) / 100;
    for (const model in costByModel) {
      costByModel[model] = Math.round(costByModel[model] * 100) / 100;
    }

    const estimate: CostEstimate = {
      totalCost,
      costByModel,
      averageCostPerRequest: requests.length > 0 ? Math.round((totalCost / requests.length) * 10000) / 10000 : 0,
      requestCount: requests.length,
    };

    logger.debug(
      { projectId, totalCost: estimate.totalCost },
      'Cost estimate calculated'
    );

    return estimate;
  } catch (error) {
    logger.error({ error, projectId }, 'Failed to calculate cost estimate');
    throw new Error('Failed to calculate cost estimate');
  }
}
