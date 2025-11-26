import { Request, Response, NextFunction } from 'express';
import * as remediationService from '../services/remediationService.js';
import { logger } from '../utils/logger.js';

/**
 * Create a remediation action for an incident
 * POST /projects/:projectId/incidents/:incidentId/remediation
 * Requirements: 5.1, 5.2, 5.3
 */
export async function createRemediationAction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId;
    const incidentId = req.params.incidentId;

    if (!projectId || !incidentId) {
      throw new Error('Project ID and Incident ID are required');
    }

    const { actionType, parameters } = req.body;

    const action = await remediationService.createRemediationAction(projectId, incidentId, {
      actionType,
      parameters,
    });

    logger.info(
      {
        projectId,
        incidentId,
        actionId: action.id,
        actionType,
      },
      'Remediation action created'
    );

    res.status(201).json({
      action,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Apply a remediation action (mark as executed)
 * POST /projects/:projectId/incidents/:incidentId/remediation/:actionId/apply
 * Requirements: 5.2, 5.3
 */
export async function applyRemediationAction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId;
    const incidentId = req.params.incidentId;
    const actionId = req.params.actionId;

    if (!projectId || !incidentId || !actionId) {
      throw new Error('Project ID, Incident ID, and Action ID are required');
    }

    const action = await remediationService.applyRemediationAction(projectId, incidentId, actionId);

    logger.info(
      {
        projectId,
        incidentId,
        actionId,
        actionType: action.actionType,
      },
      'Remediation action applied'
    );

    res.status(200).json({
      action,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a remediation action by ID
 * GET /projects/:projectId/incidents/:incidentId/remediation/:actionId
 * Requirements: 5.4
 */
export async function getRemediationAction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId;
    const incidentId = req.params.incidentId;
    const actionId = req.params.actionId;

    if (!projectId || !incidentId || !actionId) {
      throw new Error('Project ID, Incident ID, and Action ID are required');
    }

    const action = await remediationService.getRemediationAction(projectId, incidentId, actionId);

    logger.info(
      {
        projectId,
        incidentId,
        actionId,
      },
      'Remediation action retrieved'
    );

    res.status(200).json({
      action,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all remediation actions for an incident
 * GET /projects/:projectId/incidents/:incidentId/remediation
 * Requirements: 5.4
 */
export async function getRemediationActions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId;
    const incidentId = req.params.incidentId;
    const { limit = 50, offset = 0 } = req.query;

    if (!projectId || !incidentId) {
      throw new Error('Project ID and Incident ID are required');
    }

    const actions = await remediationService.getRemediationActions(projectId, incidentId, {
      limit: parseInt(limit as string, 10) || 50,
      offset: parseInt(offset as string, 10) || 0,
    });

    logger.info(
      {
        projectId,
        incidentId,
        count: actions.length,
      },
      'Remediation actions retrieved'
    );

    res.status(200).json({
      actions,
      pagination: {
        limit: parseInt(limit as string, 10) || 50,
        offset: parseInt(offset as string, 10) || 0,
        count: actions.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a remediation action
 * DELETE /projects/:projectId/incidents/:incidentId/remediation/:actionId
 * Requirements: 5.2
 */
export async function deleteRemediationAction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId;
    const incidentId = req.params.incidentId;
    const actionId = req.params.actionId;

    if (!projectId || !incidentId || !actionId) {
      throw new Error('Project ID, Incident ID, and Action ID are required');
    }

    await remediationService.deleteRemediationAction(projectId, incidentId, actionId);

    logger.info(
      {
        projectId,
        incidentId,
        actionId,
      },
      'Remediation action deleted'
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * Get active remediation constraints for a project
 * GET /projects/:projectId/remediation/constraints
 * Requirements: 5.3
 */
export async function getActiveConstraints(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId;

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    const constraints = await remediationService.getActiveRemediationConstraints(projectId);

    logger.info(
      {
        projectId,
        constraintCount: constraints.length,
      },
      'Active remediation constraints retrieved'
    );

    res.status(200).json({
      constraints,
    });
  } catch (error) {
    next(error);
  }
}
