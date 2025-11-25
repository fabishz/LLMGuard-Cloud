import { Request, Response, NextFunction } from 'express';
import * as incidentService from '../services/incidentService.js';
import { logger } from '../utils/logger.js';

/**
 * List all incidents for a project with optional filtering
 * GET /projects/:projectId/incidents
 * Query: { status?, limit?, page? }
 * Response: { incidents, total, page, limit }
 * Requirements: 4.5
 */
export async function listIncidents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;
    const { status, limit = 50, page = 1 } = req.query;

    // Calculate offset from page number
    const offset = (Number(page) - 1) * Number(limit);

    const incidents = await incidentService.getIncidents(projectId, {
      status: status as string | undefined,
      limit: Number(limit),
      offset,
    });

    logger.info(
      { projectId, status, limit, page, count: incidents.length },
      'Incidents listed successfully'
    );

    res.status(200).json({
      incidents,
      page: Number(page),
      limit: Number(limit),
      total: incidents.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single incident by ID
 * GET /projects/:projectId/incidents/:incidentId
 * Response: { incident }
 * Requirements: 4.5
 */
export async function getIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, incidentId } = req.params;

    const incident = await incidentService.getIncident(projectId, incidentId);

    logger.info(
      { projectId, incidentId },
      'Incident retrieved successfully'
    );

    res.status(200).json({
      incident,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Resolve an incident
 * POST /projects/:projectId/incidents/:incidentId/resolve
 * Response: { incident }
 * Requirements: 4.6
 */
export async function resolveIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, incidentId } = req.params;

    const incident = await incidentService.resolveIncident(projectId, incidentId);

    logger.info(
      { projectId, incidentId },
      'Incident resolved successfully'
    );

    res.status(200).json({
      incident,
      message: 'Incident resolved successfully',
    });
  } catch (error) {
    next(error);
  }
}
