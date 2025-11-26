import { Request, Response, NextFunction } from 'express';
import * as remediationService from '../services/remediationService.js';
import { logger } from '../utils/logger.js';

/**
 * Create a remediation action for an incident
 * POST /projects/:projectId/incidents/:incidentId/remediations
 * Body: { actionType, parameters }
 * Response: { action }
 * Requirements: 5.1, 5.2
 */
export async function createRemediationAction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId, incidentId } = req.params;
    const { actionType, parameters } = req.body;

    const action = await remediationService.createRemediationAction(projectId, incidentId, {
      actionType,
      parameters,
    });

    logger.info(
      { projectId, incidentId, actionId: action.id, actionType },
      'Remediation action created successfully'
    );

    res.status(201).json({
      action,
      message: 'Remediation action created successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Apply a remediation action (mark as executed)
 * POST /projects/:projectId/incidents/:incidentId/remediations/:actionId/apply
 * Response: { action }
 * Requirements: 5.2, 5.4
 */
export async function applyRemediationAction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId, incidentId, actionId } = req.params;

    const action = await remediationService.applyRemediationAction(projectId, incidentId, actionId);

    logger.info(
      { projectId, incidentId, actionId, actionType: action.actionType },
      'Remediation action applied successfully'
    );

    res.status(200).json({
      action,
      message: 'Remediation action applied successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single remediation action by ID
 * GET /projects/:projectId/incidents/:incidentId/remediations/:actionId
 * Response: { action }
 * Requirements: 5.4
 */
export async function getRemediationAction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId, incidentId, actionId } = req.params;

    const action = await remediationService.getRemediationAction(projectId, incidentId, actionId);

    logger.info(
      { projectId, incidentId, actionId },
      'Remediation action retrieved successfully'
    );

    res.status(200).json({
      action,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List all remediation actions for an incident
 * GET /projects/:projectId/incidents/:incidentId/remediations
 * Query: { limit?, page? }
 * Response: { actions, total, page, limit }
 * Requirements: 5.4
 */
export async function listRemediationActions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId, incidentId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    // Calculate offset from page number
    const offset = (Number(page) - 1) * Number(limit);

    const actions = await remediationService.getRemediationActions(projectId, incidentId, {
      limit: Number(limit),
      offset,
    });

    logger.info(
      { projectId, incidentId, limit, page, count: actions.length },
      'Remediation actions listed successfully'
    );

    res.status(200).json({
      actions,
      page: Number(page),
      limit: Number(limit),
      total: actions.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a remediation action
 * DELETE /projects/:projectId/incidents/:incidentId/remediations/:actionId
 * Response: { message }
 * Requirements: 5.4
 */
export async function deleteRemediationAction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId, incidentId, actionId } = req.params;

    await remediationService.deleteRemediationAction(projectId, incidentId, actionId);

    logger.info(
      { projectId, incidentId, actionId },
      'Remediation action deleted successfully'
    );

    res.status(200).json({
      message: 'Remediation action deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
