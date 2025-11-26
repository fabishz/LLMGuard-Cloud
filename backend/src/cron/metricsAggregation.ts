import cron from 'node-cron';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import * as metricsService from '../services/metricsService.js';

/**
 * Pre-calculate and cache metrics for a specific project and date
 * 
 * This function:
 * 1. Calculates daily metrics for the project
 * 2. Stores the metrics in the MetricsCache table
 * 3. Enables fast retrieval of frequently accessed metrics
 * 
 * @param projectId - Project ID to calculate metrics for
 * @param date - Date to calculate metrics for (defaults to yesterday)
 * @returns Cached metrics record
 */
async function cacheProjectMetrics(projectId: string, date?: Date): Promise<any> {
  try {
    const targetDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dateString = targetDate.toISOString().split('T')[0];

    logger.debug(
      { projectId, date: dateString },
      'Calculating and caching metrics for project'
    );

    // Get daily metrics for the date
    const dailyMetrics = await metricsService.getDailyMetrics(projectId, targetDate);

    // Get model breakdown for the date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const modelBreakdown = await metricsService.getModelUsageBreakdown(
      projectId,
      startOfDay,
      endOfDay
    );

    // Get error rate stats for the date
    const errorStats = await metricsService.getErrorRateStats(
      projectId,
      startOfDay,
      endOfDay
    );

    // Get high risk count for the date
    const highRiskRequests = await prisma.lLMRequest.count({
      where: {
        projectId,
        riskScore: { gt: 80 },
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Calculate average risk score for the date
    const riskScoreData = await prisma.lLMRequest.aggregate({
      where: {
        projectId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      _avg: { riskScore: true },
    });

    const averageRiskScore = riskScoreData._avg.riskScore || 0;

    // Upsert metrics cache record
    const cachedMetrics = await prisma.metricsCache.upsert({
      where: {
        projectId_date: {
          projectId,
          date: new Date(dateString),
        },
      },
      update: {
        totalRequests: dailyMetrics.requests,
        errorCount: dailyMetrics.errors,
        errorRate: errorStats.errorRate,
        averageLatency: dailyMetrics.avgLatency,
        totalTokens: dailyMetrics.tokens,
        estimatedCost: dailyMetrics.cost,
        highRiskCount: highRiskRequests,
        averageRiskScore: parseFloat(averageRiskScore.toFixed(2)),
        modelBreakdown: JSON.parse(JSON.stringify(modelBreakdown)),
        updatedAt: new Date(),
      },
      create: {
        projectId,
        date: new Date(dateString),
        totalRequests: dailyMetrics.requests,
        errorCount: dailyMetrics.errors,
        errorRate: errorStats.errorRate,
        averageLatency: dailyMetrics.avgLatency,
        totalTokens: dailyMetrics.tokens,
        estimatedCost: dailyMetrics.cost,
        highRiskCount: highRiskRequests,
        averageRiskScore: parseFloat(averageRiskScore.toFixed(2)),
        modelBreakdown: JSON.parse(JSON.stringify(modelBreakdown)),
      },
    });

    logger.debug(
      {
        projectId,
        date: dateString,
        totalRequests: cachedMetrics.totalRequests,
        estimatedCost: cachedMetrics.estimatedCost,
      },
      'Metrics cached successfully'
    );

    return cachedMetrics;
  } catch (error) {
    logger.error(
      { error, projectId, date },
      'Error caching project metrics'
    );
    throw error;
  }
}

/**
 * Get cached metrics for a project and date
 * 
 * This function retrieves pre-calculated metrics from the cache,
 * providing fast access to frequently requested data.
 * 
 * @param projectId - Project ID
 * @param date - Date to retrieve metrics for
 * @returns Cached metrics or null if not found
 */
export async function getCachedMetrics(projectId: string, date: Date): Promise<any | null> {
  try {
    const dateString = date.toISOString().split('T')[0];

    const cachedMetrics = await prisma.metricsCache.findUnique({
      where: {
        projectId_date: {
          projectId,
          date: new Date(dateString),
        },
      },
    });

    if (cachedMetrics) {
      logger.debug(
        { projectId, date: dateString },
        'Retrieved metrics from cache'
      );
    }

    return cachedMetrics;
  } catch (error) {
    logger.error(
      { error, projectId, date },
      'Error retrieving cached metrics'
    );
    return null;
  }
}

/**
 * Clear old cached metrics (older than 90 days)
 * 
 * This function removes stale metrics from the cache to prevent
 * the cache table from growing indefinitely.
 * 
 * @returns Number of records deleted
 */
async function clearOldCachedMetrics(): Promise<number> {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const result = await prisma.metricsCache.deleteMany({
      where: {
        date: {
          lt: ninetyDaysAgo,
        },
      },
    });

    if (result.count > 0) {
      logger.info(
        { deletedCount: result.count },
        'Cleared old cached metrics'
      );
    }

    return result.count;
  } catch (error) {
    logger.error({ error }, 'Error clearing old cached metrics');
    return 0;
  }
}

/**
 * Run daily metrics aggregation for all projects
 * 
 * This function:
 * 1. Fetches all projects
 * 2. Pre-calculates metrics for yesterday
 * 3. Caches the metrics in the database
 * 4. Clears old cached metrics (>90 days)
 * 5. Logs aggregation results
 */
async function runDailyMetricsAggregation(): Promise<void> {
  const startTime = Date.now();

  try {
    logger.info('Starting daily metrics aggregation job');

    // Get all projects
    const projects = await prisma.project.findMany({
      select: { id: true, name: true },
    });

    logger.debug({ projectCount: projects.length }, 'Processing projects for metrics aggregation');

    let projectsProcessed = 0;
    let projectsSucceeded = 0;
    let projectsFailed = 0;

    // Calculate metrics for yesterday (most recent complete day)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Process each project
    for (const project of projects) {
      try {
        projectsProcessed++;

        // Cache metrics for the project
        await cacheProjectMetrics(project.id, yesterday);
        projectsSucceeded++;

        logger.debug(
          { projectId: project.id, projectName: project.name },
          'Metrics cached for project'
        );
      } catch (error) {
        projectsFailed++;
        logger.error(
          { error, projectId: project.id, projectName: project.name },
          'Error caching metrics for project'
        );
        // Continue processing other projects
      }
    }

    // Clear old cached metrics
    const deletedCount = await clearOldCachedMetrics();

    const duration = Date.now() - startTime;

    logger.info(
      {
        projectsProcessed,
        projectsSucceeded,
        projectsFailed,
        oldMetricsDeleted: deletedCount,
        durationMs: duration,
      },
      'Daily metrics aggregation job completed'
    );
  } catch (error) {
    logger.error({ error }, 'Fatal error in daily metrics aggregation job');
  }
}

/**
 * Initialize daily metrics aggregation cron job
 * 
 * Runs daily at 1:00 AM UTC to aggregate metrics for the previous day.
 * This ensures metrics are pre-calculated and cached for fast retrieval.
 * 
 * Cron pattern: 0 1 * * * (every day at 1:00 AM UTC)
 * - 0: minute (0)
 * - 1: hour (1 AM)
 * - *: day of month (every day)
 * - *: month (every month)
 * - *: day of week (every day)
 */
export function initializeMetricsAggregationCron(): void {
  try {
    // Schedule job to run daily at 1:00 AM UTC
    cron.schedule('0 1 * * *', async () => {
      await runDailyMetricsAggregation();
    });

    logger.info('✅ Daily metrics aggregation cron job initialized (runs daily at 1:00 AM UTC)');

    // Optionally run immediately on startup (commented out for production)
    // await runDailyMetricsAggregation();
  } catch (error) {
    logger.error({ error }, 'Failed to initialize metrics aggregation cron job');
    throw error;
  }
}

/**
 * Export for testing purposes
 */
export {
  runDailyMetricsAggregation,
  cacheProjectMetrics,
  clearOldCachedMetrics,
};
