import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

/**
 * Supported remediation action types
 */
export type RemediationActionType =
  | 'switch_model'
  | 'increase_safety_threshold'
  | 'disable_endpoint'
  | 'reset_settings'
  | 'change_system_prompt'
  | 'rate_limit_user';

/**
 * Remediation action request payload
 */
export interface RemediationActionRequest {
  actionType: RemediationActionType;
  parameters: Record<string, any>;
}

/**
 * Remediation action response
 */
export interface RemediationActionResponse {
  id: string;
  incidentId: string;
  actionType: RemediationActionType;
  parameters: Record<string, any>;
  executed: boolean;
  executedAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
}

/**
 * Active remediation constraint for request validation
 */
export interface RemediationConstraint {
  actionType: RemediationActionType;
  parameters: Record<string, any>;
  metadata: Record<string, any>;
}

/**
 * Validate remediation action request
 * @param request - Remediation action request
 * @throws ValidationError if request is invalid
 */
function validateRemediationRequest(request: RemediationActionRequest): void {
  const validActionTypes: RemediationActionType[] = [
    'switch_model',
    'increase_safety_threshold',
    'disable_endpoint',
    'reset_settings',
    'change_system_prompt',
    'rate_limit_user',
  ];

  if (!validActionTypes.includes(request.actionType)) {
    throw new ValidationError('Invalid action type', {
      field: 'actionType',
      validTypes: validActionTypes,
    });
  }

  if (!request.parameters || typeof request.parameters !== 'object') {
    throw new ValidationError('Parameters must be an object', {
      field: 'parameters',
    });
  }

  // Validate action-specific parameters
  switch (request.actionType) {
    case 'switch_model':
      if (!request.parameters.newModel || typeof request.parameters.newModel !== 'string') {
        throw new ValidationError('switch_model requires newModel parameter', {
          field: 'parameters.newModel',
        });
      }
      break;

    case 'increase_safety_threshold':
      if (
        request.parameters.newThreshold === undefined ||
        typeof request.parameters.newThreshold !== 'number' ||
        request.parameters.newThreshold < 0 ||
        request.parameters.newThreshold > 100
      ) {
        throw new ValidationError('increase_safety_threshold requires newThreshold parameter (0-100)', {
          field: 'parameters.newThreshold',
        });
      }
      break;

    case 'disable_endpoint':
      if (!request.parameters.endpoint || typeof request.parameters.endpoint !== 'string') {
        throw new ValidationError('disable_endpoint requires endpoint parameter', {
          field: 'parameters.endpoint',
        });
      }
      break;

    case 'reset_settings':
      // No specific parameters required
      break;

    case 'change_system_prompt':
      if (!request.parameters.newPrompt || typeof request.parameters.newPrompt !== 'string') {
        throw new ValidationError('change_system_prompt requires newPrompt parameter', {
          field: 'parameters.newPrompt',
        });
      }
      break;

    case 'rate_limit_user':
      if (
        request.parameters.requestsPerMinute === undefined ||
        typeof request.parameters.requestsPerMinute !== 'number' ||
        request.parameters.requestsPerMinute <= 0
      ) {
        throw new ValidationError('rate_limit_user requires requestsPerMinute parameter (> 0)', {
          field: 'parameters.requestsPerMinute',
        });
      }
      break;
  }
}

/**
 * Create a remediation action for an incident
 * @param projectId - Project ID
 * @param incidentId - Incident ID
 * @param request - Remediation action request
 * @returns Created remediation action
 * @throws NotFoundError if incident not found
 * @throws ValidationError if request is invalid
 */
export async function createRemediationAction(
  projectId: string,
  incidentId: string,
  request: RemediationActionRequest
): Promise<RemediationActionResponse> {
  try {
    // Validate request
    validateRemediationRequest(request);

    // Verify incident exists and belongs to project
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
    });

    if (!incident || incident.projectId !== projectId) {
      logger.warn({ projectId, incidentId }, 'Incident not found for remediation action');
      throw new NotFoundError('Incident');
    }

    // Create remediation action
    const action = await prisma.remediationAction.create({
      data: {
        incidentId,
        actionType: request.actionType,
        parameters: request.parameters,
        metadata: {
          createdBy: 'system',
          reason: `Automated remediation for ${incident.triggerType}`,
        },
      },
    });

    logger.info(
      {
        projectId,
        incidentId,
        actionId: action.id,
        actionType: request.actionType,
      },
      'Remediation action created'
    );

    return {
      id: action.id,
      incidentId: action.incidentId,
      actionType: action.actionType as RemediationActionType,
      parameters: action.parameters as Record<string, any>,
      executed: action.executed,
      executedAt: action.executedAt || undefined,
      metadata: action.metadata as Record<string, any>,
      createdAt: action.createdAt,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    logger.error({ error, projectId, incidentId }, 'Failed to create remediation action');
    throw new Error('Failed to create remediation action');
  }
}

/**
 * Apply a remediation action (mark as executed)
 * @param projectId - Project ID
 * @param incidentId - Incident ID
 * @param actionId - Remediation action ID
 * @returns Updated remediation action
 * @throws NotFoundError if incident or action not found
 */
export async function applyRemediationAction(
  projectId: string,
  incidentId: string,
  actionId: string
): Promise<RemediationActionResponse> {
  try {
    // Verify incident exists and belongs to project
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
    });

    if (!incident || incident.projectId !== projectId) {
      logger.warn({ projectId, incidentId }, 'Incident not found for applying remediation');
      throw new NotFoundError('Incident');
    }

    // Verify action exists and belongs to incident
    const action = await prisma.remediationAction.findUnique({
      where: { id: actionId },
    });

    if (!action || action.incidentId !== incidentId) {
      logger.warn({ projectId, incidentId, actionId }, 'Remediation action not found');
      throw new NotFoundError('Remediation action');
    }

    // Update action as executed
    const metadata = typeof action.metadata === 'object' && action.metadata !== null
      ? action.metadata as Record<string, any>
      : {};
    
    const updated = await prisma.remediationAction.update({
      where: { id: actionId },
      data: {
        executed: true,
        executedAt: new Date(),
        metadata: {
          ...metadata,
          executedAt: new Date().toISOString(),
        },
      },
    });

    logger.info(
      {
        projectId,
        incidentId,
        actionId,
        actionType: action.actionType,
      },
      'Remediation action applied'
    );

    return {
      id: updated.id,
      incidentId: updated.incidentId,
      actionType: updated.actionType as RemediationActionType,
      parameters: updated.parameters as Record<string, any>,
      executed: updated.executed,
      executedAt: updated.executedAt || undefined,
      metadata: updated.metadata as Record<string, any>,
      createdAt: updated.createdAt,
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, projectId, incidentId, actionId }, 'Failed to apply remediation action');
    throw new Error('Failed to apply remediation action');
  }
}

/**
 * Get remediation action by ID
 * @param projectId - Project ID
 * @param incidentId - Incident ID
 * @param actionId - Remediation action ID
 * @returns Remediation action details
 * @throws NotFoundError if incident or action not found
 */
export async function getRemediationAction(
  projectId: string,
  incidentId: string,
  actionId: string
): Promise<RemediationActionResponse> {
  try {
    // Verify incident exists and belongs to project
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
    });

    if (!incident || incident.projectId !== projectId) {
      logger.warn({ projectId, incidentId }, 'Incident not found for retrieving remediation action');
      throw new NotFoundError('Incident');
    }

    // Get action
    const action = await prisma.remediationAction.findUnique({
      where: { id: actionId },
    });

    if (!action || action.incidentId !== incidentId) {
      logger.warn({ projectId, incidentId, actionId }, 'Remediation action not found');
      throw new NotFoundError('Remediation action');
    }

    return {
      id: action.id,
      incidentId: action.incidentId,
      actionType: action.actionType as RemediationActionType,
      parameters: action.parameters as Record<string, any>,
      executed: action.executed,
      executedAt: action.executedAt || undefined,
      metadata: action.metadata as Record<string, any>,
      createdAt: action.createdAt,
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, projectId, incidentId, actionId }, 'Failed to get remediation action');
    throw new Error('Failed to get remediation action');
  }
}

/**
 * Get all remediation actions for an incident
 * @param projectId - Project ID
 * @param incidentId - Incident ID
 * @param options - Query options (limit, offset)
 * @returns Array of remediation actions
 * @throws NotFoundError if incident not found
 */
export interface GetRemediationActionsOptions {
  limit?: number;
  offset?: number;
}

export async function getRemediationActions(
  projectId: string,
  incidentId: string,
  options: GetRemediationActionsOptions = {}
): Promise<RemediationActionResponse[]> {
  try {
    const { limit = 50, offset = 0 } = options;

    // Verify incident exists and belongs to project
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
    });

    if (!incident || incident.projectId !== projectId) {
      logger.warn({ projectId, incidentId }, 'Incident not found for retrieving remediation actions');
      throw new NotFoundError('Incident');
    }

    // Get remediation actions
    const actions = await prisma.remediationAction.findMany({
      where: { incidentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    logger.debug({ projectId, incidentId, count: actions.length }, 'Remediation actions retrieved');

    return actions.map((action) => ({
      id: action.id,
      incidentId: action.incidentId,
      actionType: action.actionType as RemediationActionType,
      parameters: action.parameters as Record<string, any>,
      executed: action.executed,
      executedAt: action.executedAt || undefined,
      metadata: action.metadata as Record<string, any>,
      createdAt: action.createdAt,
    }));
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, projectId, incidentId }, 'Failed to get remediation actions');
    throw new Error('Failed to get remediation actions');
  }
}

/**
 * Get active remediation constraints for a project
 * Returns all executed remediation actions that should be enforced
 * @param projectId - Project ID
 * @returns Array of active remediation constraints
 */
export async function getActiveRemediationConstraints(projectId: string): Promise<RemediationConstraint[]> {
  try {
    // Get all executed remediation actions for the project
    const actions = await prisma.remediationAction.findMany({
      where: {
        executed: true,
        incident: {
          projectId,
          status: 'open', // Only enforce for open incidents
        },
      },
      include: {
        incident: true,
      },
    });

    logger.debug({ projectId, constraintCount: actions.length }, 'Active remediation constraints retrieved');

    return actions.map((action) => ({
      actionType: action.actionType as RemediationActionType,
      parameters: action.parameters as Record<string, any>,
      metadata: action.metadata as Record<string, any>,
    }));
  } catch (error) {
    logger.error({ error, projectId }, 'Failed to get active remediation constraints');
    throw new Error('Failed to get active remediation constraints');
  }
}

/**
 * Check if a request violates any active remediation constraints
 * @param projectId - Project ID
 * @param requestData - Request data to validate (model, userId, endpoint, etc.)
 * @returns Constraint violation details or null if no violations
 */
export interface RequestData {
  model?: string;
  userId?: string;
  endpoint?: string;
  [key: string]: any;
}

export interface ConstraintViolation {
  violated: boolean;
  actionType?: RemediationActionType;
  reason?: string;
  details?: Record<string, any>;
}

export async function checkRemediationConstraints(
  projectId: string,
  requestData: RequestData
): Promise<ConstraintViolation> {
  try {
    const constraints = await getActiveRemediationConstraints(projectId);

    for (const constraint of constraints) {
      switch (constraint.actionType) {
        case 'switch_model':
          // Enforce model switching
          if (requestData.model && requestData.model !== constraint.parameters.newModel) {
            return {
              violated: true,
              actionType: 'switch_model',
              reason: `Model must be switched to ${constraint.parameters.newModel}`,
              details: {
                currentModel: requestData.model,
                requiredModel: constraint.parameters.newModel,
              },
            };
          }
          break;

        case 'increase_safety_threshold':
          // Enforce safety threshold
          if (requestData.riskScore !== undefined) {
            if (requestData.riskScore > constraint.parameters.newThreshold) {
              return {
                violated: true,
                actionType: 'increase_safety_threshold',
                reason: `Request risk score exceeds safety threshold of ${constraint.parameters.newThreshold}`,
                details: {
                  riskScore: requestData.riskScore,
                  threshold: constraint.parameters.newThreshold,
                },
              };
            }
          }
          break;

        case 'disable_endpoint':
          // Enforce endpoint disabling
          if (requestData.endpoint === constraint.parameters.endpoint) {
            return {
              violated: true,
              actionType: 'disable_endpoint',
              reason: `Endpoint ${constraint.parameters.endpoint} is disabled`,
              details: {
                endpoint: constraint.parameters.endpoint,
              },
            };
          }
          break;

        case 'rate_limit_user':
          // Rate limiting is enforced at middleware level
          // Store constraint for middleware to use
          if (requestData.userId) {
            requestData._remediationRateLimit = constraint.parameters.requestsPerMinute;
          }
          break;

        case 'change_system_prompt':
          // System prompt change is enforced at request processing level
          requestData._remediationSystemPrompt = constraint.parameters.newPrompt;
          break;

        case 'reset_settings':
          // Reset settings is a one-time action, no ongoing constraint
          break;
      }
    }

    return { violated: false };
  } catch (error) {
    logger.error({ error, projectId }, 'Error checking remediation constraints');
    // Return no violation on error to avoid blocking requests
    return { violated: false };
  }
}

/**
 * Delete a remediation action
 * @param projectId - Project ID
 * @param incidentId - Incident ID
 * @param actionId - Remediation action ID
 * @throws NotFoundError if incident or action not found
 */
export async function deleteRemediationAction(
  projectId: string,
  incidentId: string,
  actionId: string
): Promise<void> {
  try {
    // Verify incident exists and belongs to project
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
    });

    if (!incident || incident.projectId !== projectId) {
      logger.warn({ projectId, incidentId }, 'Incident not found for deleting remediation action');
      throw new NotFoundError('Incident');
    }

    // Verify action exists and belongs to incident
    const action = await prisma.remediationAction.findUnique({
      where: { id: actionId },
    });

    if (!action || action.incidentId !== incidentId) {
      logger.warn({ projectId, incidentId, actionId }, 'Remediation action not found for deletion');
      throw new NotFoundError('Remediation action');
    }

    // Delete action
    await prisma.remediationAction.delete({
      where: { id: actionId },
    });

    logger.info(
      {
        projectId,
        incidentId,
        actionId,
      },
      'Remediation action deleted'
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, projectId, incidentId, actionId }, 'Failed to delete remediation action');
    throw new Error('Failed to delete remediation action');
  }
}
