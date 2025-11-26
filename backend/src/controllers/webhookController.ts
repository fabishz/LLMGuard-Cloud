import { Request, Response, NextFunction } from 'express';
import env from '../config/env.js';
import { logger } from '../utils/logger.js';
import { validateDatadogWebhook, validateStripeWebhook } from '../integrations/webhookValidator.js';
import * as incidentService from '../services/incidentService.js';
import { ValidationError } from '../utils/errors.js';

/**
 * Handle Datadog webhook
 * POST /webhooks/datadog
 * 
 * Validates webhook signature and creates an incident if the alert indicates an anomaly
 * Requirements: 4.2
 */
export const handleDatadogWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawBody = (req as any).rawBody || '';
    const signature = req.headers['x-datadog-signature'] as string | undefined;

    // Validate webhook signature
    const validation = validateDatadogWebhook(rawBody, signature, env.DATADOG_WEBHOOK_SECRET);

    if (!validation.valid) {
      logger.warn(
        { error: validation.error },
        'Datadog webhook signature validation failed'
      );
      throw new ValidationError('Invalid webhook signature', { error: validation.error });
    }

    // Parse request body
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (error) {
      logger.warn({ error }, 'Failed to parse Datadog webhook body');
      throw new ValidationError('Invalid JSON in request body');
    }

    // Extract alert information
    const alert = body.alert;
    if (!alert) {
      logger.warn('Datadog webhook missing alert field');
      throw new ValidationError('Missing alert field in webhook body');
    }

    // Extract project ID from alert metadata
    // Datadog webhooks should include project ID in tags or custom fields
    const projectId = extractProjectIdFromDatadogAlert(alert);
    if (!projectId) {
      logger.warn({ alert }, 'Could not extract project ID from Datadog alert');
      throw new ValidationError('Could not determine project ID from alert');
    }

    // Determine severity based on alert status
    const severity = mapDatadogAlertStatusToSeverity(alert.status);

    // Create incident from webhook
    const incident = await incidentService.createIncidentFromDetection(
      projectId,
      {
        triggered: true,
        triggerType: 'webhook',
        severity,
        message: alert.title || 'Datadog alert triggered',
        metadata: {
          datadogAlertId: alert.id,
          datadogAlertTitle: alert.title,
          datadogAlertStatus: alert.status,
          datadogLastUpdated: alert.last_updated,
          datadogOrg: alert.org?.name,
          webhookSource: 'datadog',
        },
      }
    );

    logger.info(
      {
        incidentId: incident.id,
        projectId,
        datadogAlertId: alert.id,
        severity,
      },
      'Incident created from Datadog webhook'
    );

    // Generate RCA asynchronously (don't wait for it)
    incidentService
      .generateIncidentRCA(projectId, incident.id)
      .catch((error) => {
        logger.error(
          { error, incidentId: incident.id, projectId },
          'Failed to generate RCA for incident from Datadog webhook'
        );
      });

    res.status(200).json({
      success: true,
      incidentId: incident.id,
      message: 'Incident created from Datadog alert',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle Stripe webhook
 * POST /webhooks/stripe
 * 
 * Validates webhook signature and processes Stripe events
 * Requirements: 9.2
 */
export const handleStripeWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawBody = (req as any).rawBody || '';
    const signature = req.headers['stripe-signature'] as string | undefined;

    // Validate webhook signature
    const validation = validateStripeWebhook(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);

    if (!validation.valid) {
      logger.warn(
        { error: validation.error },
        'Stripe webhook signature validation failed'
      );
      throw new ValidationError('Invalid webhook signature', { error: validation.error });
    }

    // Parse request body
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch (error) {
      logger.warn({ error }, 'Failed to parse Stripe webhook body');
      throw new ValidationError('Invalid JSON in request body');
    }

    // Extract event type
    const eventType = event.type;
    if (!eventType) {
      logger.warn('Stripe webhook missing type field');
      throw new ValidationError('Missing type field in webhook body');
    }

    logger.info(
      {
        eventId: event.id,
        eventType,
      },
      'Stripe webhook received'
    );

    // Handle different event types
    // Note: Actual implementation will be in task 38 (Stripe webhook handler)
    // For now, we just acknowledge receipt
    switch (eventType) {
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted':
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        logger.debug(
          { eventType, eventId: event.id },
          'Stripe event acknowledged (handler to be implemented in task 38)'
        );
        break;

      default:
        logger.debug(
          { eventType, eventId: event.id },
          'Stripe event type not yet handled'
        );
    }

    res.status(200).json({
      received: true,
      eventId: event.id,
      eventType,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Extract project ID from Datadog alert
 * 
 * Datadog alerts can include project ID in:
 * 1. Custom tags (e.g., "project_id:proj_123")
 * 2. Alert title or description
 * 3. Snapshot metadata
 * 
 * @param alert - Datadog alert object
 * @returns Project ID or undefined
 */
function extractProjectIdFromDatadogAlert(alert: any): string | undefined {
  // Try to extract from tags
  if (alert.tags && Array.isArray(alert.tags)) {
    for (const tag of alert.tags) {
      if (tag.startsWith('project_id:')) {
        return tag.substring('project_id:'.length);
      }
    }
  }

  // Try to extract from alert title (format: "Project: proj_123 - Alert Title")
  if (alert.title && typeof alert.title === 'string') {
    const match = alert.title.match(/Project:\s*([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Try to extract from snapshot metadata
  if (alert.snapshot && alert.snapshot.metadata && alert.snapshot.metadata.project_id) {
    return alert.snapshot.metadata.project_id;
  }

  return undefined;
}

/**
 * Map Datadog alert status to incident severity
 * 
 * @param status - Datadog alert status
 * @returns Incident severity level
 */
function mapDatadogAlertStatusToSeverity(
  status: string
): 'low' | 'medium' | 'high' | 'critical' {
  switch (status?.toLowerCase()) {
    case 'alert':
    case 'critical':
      return 'critical';
    case 'warning':
    case 'warn':
      return 'high';
    case 'no data':
    case 'unknown':
      return 'medium';
    default:
      return 'low';
  }
}
