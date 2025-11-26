import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Query parameters for filtering and searching LLM requests
 */
export interface LogQuery {
  search?: string;
  model?: string;
  minRiskScore?: number;
  maxRiskScore?: number;
  startDate?: Date;
  endDate?: Date;
  sortBy?: 'timestamp' | 'latency' | 'riskScore';
  sortOrder?: 'asc' | 'desc';
  limit: number;
  page: number;
}

/**
 * Paginated log results
 */
export interface LogResult {
  id: string;
  prompt: string;
  response: string;
  timestamp: Date;
  latency: number;
  model: string;
  riskScore: number;
  error?: string;
}

/**
 * Paginated response with metadata
 */
export interface PaginatedLogs {
  logs: LogResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Query LLM requests with full-text search, filtering, and sorting
 * 
 * This function:
 * 1. Validates the project exists
 * 2. Applies full-text search on prompt and response
 * 3. Filters by model, risk score range, and date range
 * 4. Sorts by timestamp, latency, or risk score
 * 5. Returns paginated results
 * 
 * Requirements: 7.1, 7.2, 7.3
 * 
 * @param projectId - Project ID to query logs for
 * @param query - Query parameters with filters and sorting
 * @returns Paginated log results
 * @throws Error if project not found or query fails
 */
export async function queryLogs(projectId: string, query: LogQuery): Promise<PaginatedLogs> {
  try {
    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Build where clause with filters
    const where: any = {
      projectId,
    };

    // Full-text search on prompt and response
    if (query.search && query.search.trim()) {
      const searchTerm = query.search.trim();
      where.OR = [
        {
          prompt: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          response: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Filter by model
    if (query.model) {
      where.model = query.model;
    }

    // Filter by risk score range
    if (query.minRiskScore !== undefined || query.maxRiskScore !== undefined) {
      where.riskScore = {};
      if (query.minRiskScore !== undefined) {
        where.riskScore.gte = query.minRiskScore;
      }
      if (query.maxRiskScore !== undefined) {
        where.riskScore.lte = query.maxRiskScore;
      }
    }

    // Filter by date range
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = query.startDate;
      }
      if (query.endDate) {
        where.createdAt.lte = query.endDate;
      }
    }

    // Determine sort order
    const sortBy = query.sortBy || 'timestamp';
    const sortOrder = query.sortOrder || 'desc';

    let orderBy: any = {};
    if (sortBy === 'timestamp') {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === 'latency') {
      orderBy.latency = sortOrder;
    } else if (sortBy === 'riskScore') {
      orderBy.riskScore = sortOrder;
    }

    // Get total count for pagination
    const total = await prisma.lLMRequest.count({ where });

    // Calculate pagination
    const offset = (query.page - 1) * query.limit;
    const totalPages = Math.ceil(total / query.limit);

    // Fetch paginated results
    const requests = await prisma.lLMRequest.findMany({
      where,
      select: {
        id: true,
        prompt: true,
        response: true,
        createdAt: true,
        latency: true,
        model: true,
        riskScore: true,
        error: true,
      },
      orderBy,
      skip: offset,
      take: query.limit,
    });

    const logs: LogResult[] = requests.map((req) => ({
      id: req.id,
      prompt: req.prompt,
      response: req.response,
      timestamp: req.createdAt,
      latency: req.latency,
      model: req.model,
      riskScore: req.riskScore,
      error: req.error || undefined,
    }));

    logger.debug(
      {
        projectId,
        total,
        page: query.page,
        limit: query.limit,
        sortBy,
        sortOrder,
      },
      'Logs queried successfully'
    );

    return {
      logs,
      total,
      page: query.page,
      limit: query.limit,
      totalPages,
    };
  } catch (error) {
    logger.error({ error, projectId, query }, 'Failed to query logs');
    throw error;
  }
}

/**
 * Search logs by full-text search on prompt and response
 * 
 * This function:
 * 1. Performs case-insensitive substring search
 * 2. Searches both prompt and response fields
 * 3. Returns matching logs sorted by relevance (most recent first)
 * 
 * Requirements: 7.2
 * 
 * @param projectId - Project ID to search logs for
 * @param searchTerm - Search term to find in prompts and responses
 * @param limit - Maximum number of results to return
 * @returns Array of matching log results
 * @throws Error if project not found or search fails
 */
export async function searchLogs(
  projectId: string,
  searchTerm: string,
  limit: number = 100
): Promise<LogResult[]> {
  try {
    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const trimmedSearch = searchTerm.trim();

    if (!trimmedSearch) {
      return [];
    }

    const requests = await prisma.lLMRequest.findMany({
      where: {
        projectId,
        OR: [
          {
            prompt: {
              contains: trimmedSearch,
              mode: 'insensitive',
            },
          },
          {
            response: {
              contains: trimmedSearch,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        prompt: true,
        response: true,
        createdAt: true,
        latency: true,
        model: true,
        riskScore: true,
        error: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const logs: LogResult[] = requests.map((req) => ({
      id: req.id,
      prompt: req.prompt,
      response: req.response,
      timestamp: req.createdAt,
      latency: req.latency,
      model: req.model,
      riskScore: req.riskScore,
      error: req.error || undefined,
    }));

    logger.debug(
      { projectId, searchTerm: trimmedSearch, resultCount: logs.length },
      'Logs searched successfully'
    );

    return logs;
  } catch (error) {
    logger.error({ error, projectId, searchTerm }, 'Failed to search logs');
    throw error;
  }
}

/**
 * Filter logs by model
 * 
 * Requirements: 7.3
 * 
 * @param projectId - Project ID to filter logs for
 * @param model - Model name to filter by
 * @param limit - Maximum number of results to return
 * @returns Array of logs for the specified model
 * @throws Error if project not found or filter fails
 */
export async function filterByModel(
  projectId: string,
  model: string,
  limit: number = 100
): Promise<LogResult[]> {
  try {
    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const requests = await prisma.lLMRequest.findMany({
      where: {
        projectId,
        model,
      },
      select: {
        id: true,
        prompt: true,
        response: true,
        createdAt: true,
        latency: true,
        model: true,
        riskScore: true,
        error: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const logs: LogResult[] = requests.map((req) => ({
      id: req.id,
      prompt: req.prompt,
      response: req.response,
      timestamp: req.createdAt,
      latency: req.latency,
      model: req.model,
      riskScore: req.riskScore,
      error: req.error || undefined,
    }));

    logger.debug(
      { projectId, model, resultCount: logs.length },
      'Logs filtered by model successfully'
    );

    return logs;
  } catch (error) {
    logger.error({ error, projectId, model }, 'Failed to filter logs by model');
    throw error;
  }
}

/**
 * Filter logs by risk score range
 * 
 * Requirements: 7.3
 * 
 * @param projectId - Project ID to filter logs for
 * @param minScore - Minimum risk score (inclusive)
 * @param maxScore - Maximum risk score (inclusive)
 * @param limit - Maximum number of results to return
 * @returns Array of logs within the risk score range
 * @throws Error if project not found or filter fails
 */
export async function filterByRiskScore(
  projectId: string,
  minScore: number = 0,
  maxScore: number = 100,
  limit: number = 100
): Promise<LogResult[]> {
  try {
    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Clamp scores to valid range
    const min = Math.max(0, Math.min(minScore, 100));
    const max = Math.max(0, Math.min(maxScore, 100));

    const requests = await prisma.lLMRequest.findMany({
      where: {
        projectId,
        riskScore: {
          gte: min,
          lte: max,
        },
      },
      select: {
        id: true,
        prompt: true,
        response: true,
        createdAt: true,
        latency: true,
        model: true,
        riskScore: true,
        error: true,
      },
      orderBy: { riskScore: 'desc' },
      take: limit,
    });

    const logs: LogResult[] = requests.map((req) => ({
      id: req.id,
      prompt: req.prompt,
      response: req.response,
      timestamp: req.createdAt,
      latency: req.latency,
      model: req.model,
      riskScore: req.riskScore,
      error: req.error || undefined,
    }));

    logger.debug(
      { projectId, minScore: min, maxScore: max, resultCount: logs.length },
      'Logs filtered by risk score successfully'
    );

    return logs;
  } catch (error) {
    logger.error(
      { error, projectId, minScore, maxScore },
      'Failed to filter logs by risk score'
    );
    throw error;
  }
}

/**
 * Filter logs by date range
 * 
 * Requirements: 7.3
 * 
 * @param projectId - Project ID to filter logs for
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @param limit - Maximum number of results to return
 * @returns Array of logs within the date range
 * @throws Error if project not found or filter fails
 */
export async function filterByDateRange(
  projectId: string,
  startDate: Date,
  endDate: Date,
  limit: number = 100
): Promise<LogResult[]> {
  try {
    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const requests = await prisma.lLMRequest.findMany({
      where: {
        projectId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        prompt: true,
        response: true,
        createdAt: true,
        latency: true,
        model: true,
        riskScore: true,
        error: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const logs: LogResult[] = requests.map((req) => ({
      id: req.id,
      prompt: req.prompt,
      response: req.response,
      timestamp: req.createdAt,
      latency: req.latency,
      model: req.model,
      riskScore: req.riskScore,
      error: req.error || undefined,
    }));

    logger.debug(
      { projectId, startDate, endDate, resultCount: logs.length },
      'Logs filtered by date range successfully'
    );

    return logs;
  } catch (error) {
    logger.error(
      { error, projectId, startDate, endDate },
      'Failed to filter logs by date range'
    );
    throw error;
  }
}

/**
 * Sort logs by specified field
 * 
 * Requirements: 7.3
 * 
 * @param projectId - Project ID to sort logs for
 * @param sortBy - Field to sort by: 'timestamp', 'latency', or 'riskScore'
 * @param sortOrder - Sort order: 'asc' or 'desc'
 * @param limit - Maximum number of results to return
 * @returns Array of sorted logs
 * @throws Error if project not found or sort fails
 */
export async function sortLogs(
  projectId: string,
  sortBy: 'timestamp' | 'latency' | 'riskScore' = 'timestamp',
  sortOrder: 'asc' | 'desc' = 'desc',
  limit: number = 100
): Promise<LogResult[]> {
  try {
    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    let orderBy: any = {};
    if (sortBy === 'timestamp') {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === 'latency') {
      orderBy.latency = sortOrder;
    } else if (sortBy === 'riskScore') {
      orderBy.riskScore = sortOrder;
    }

    const requests = await prisma.lLMRequest.findMany({
      where: { projectId },
      select: {
        id: true,
        prompt: true,
        response: true,
        createdAt: true,
        latency: true,
        model: true,
        riskScore: true,
        error: true,
      },
      orderBy,
      take: limit,
    });

    const logs: LogResult[] = requests.map((req) => ({
      id: req.id,
      prompt: req.prompt,
      response: req.response,
      timestamp: req.createdAt,
      latency: req.latency,
      model: req.model,
      riskScore: req.riskScore,
      error: req.error || undefined,
    }));

    logger.debug(
      { projectId, sortBy, sortOrder, resultCount: logs.length },
      'Logs sorted successfully'
    );

    return logs;
  } catch (error) {
    logger.error(
      { error, projectId, sortBy, sortOrder },
      'Failed to sort logs'
    );
    throw error;
  }
}

/**
 * Get a single log entry by ID
 * 
 * @param projectId - Project ID that owns the log
 * @param logId - Log entry ID
 * @returns Log result
 * @throws Error if project or log not found
 */
export async function getLogById(projectId: string, logId: string): Promise<LogResult> {
  try {
    const request = await prisma.lLMRequest.findFirst({
      where: {
        id: logId,
        projectId,
      },
      select: {
        id: true,
        prompt: true,
        response: true,
        createdAt: true,
        latency: true,
        model: true,
        riskScore: true,
        error: true,
      },
    });

    if (!request) {
      throw new Error('Log entry not found');
    }

    return {
      id: request.id,
      prompt: request.prompt,
      response: request.response,
      timestamp: request.createdAt,
      latency: request.latency,
      model: request.model,
      riskScore: request.riskScore,
      error: request.error || undefined,
    };
  } catch (error) {
    logger.error({ error, projectId, logId }, 'Failed to get log by ID');
    throw error;
  }
}

/**
 * Get statistics about logs for a project
 * 
 * @param projectId - Project ID to get statistics for
 * @returns Object with log statistics
 * @throws Error if project not found or stats calculation fails
 */
export interface LogStatistics {
  totalLogs: number;
  averageLatency: number;
  averageRiskScore: number;
  highRiskCount: number;
  errorCount: number;
  modelCount: number;
  dateRange: {
    earliest: Date | null;
    latest: Date | null;
  };
}

export async function getLogStatistics(projectId: string): Promise<LogStatistics> {
  try {
    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const requests = await prisma.lLMRequest.findMany({
      where: { projectId },
      select: {
        latency: true,
        riskScore: true,
        error: true,
        model: true,
        createdAt: true,
      },
    });

    if (requests.length === 0) {
      return {
        totalLogs: 0,
        averageLatency: 0,
        averageRiskScore: 0,
        highRiskCount: 0,
        errorCount: 0,
        modelCount: 0,
        dateRange: {
          earliest: null,
          latest: null,
        },
      };
    }

    const totalLatency = requests.reduce((sum, r) => sum + r.latency, 0);
    const totalRiskScore = requests.reduce((sum, r) => sum + r.riskScore, 0);
    const highRiskCount = requests.filter((r) => r.riskScore > 80).length;
    const errorCount = requests.filter((r) => r.error).length;

    const models = new Set(requests.map((r) => r.model));

    const dates = requests.map((r) => r.createdAt).sort((a, b) => a.getTime() - b.getTime());

    const stats: LogStatistics = {
      totalLogs: requests.length,
      averageLatency: Math.round(totalLatency / requests.length),
      averageRiskScore: Math.round((totalRiskScore / requests.length) * 100) / 100,
      highRiskCount,
      errorCount,
      modelCount: models.size,
      dateRange: {
        earliest: dates[0] || null,
        latest: dates[dates.length - 1] || null,
      },
    };

    logger.debug(
      { projectId, totalLogs: stats.totalLogs },
      'Log statistics calculated successfully'
    );

    return stats;
  } catch (error) {
    logger.error({ error, projectId }, 'Failed to calculate log statistics');
    throw error;
  }
}
