import { Router, type Router as ExpressRouter } from 'express';
import authRoutes from './auth.js';
import projectRoutes from './projects.js';
import llmRoutes from './llm.js';
import incidentRoutes from './incidents.js';
import remediationRoutes from './remediations.js';
import metricsRoutes from './metrics.js';
import logsRoutes from './logs.js';
import settingsRoutes from './settings.js';
import billingRoutes from './billing.js';
import webhookRoutes from './webhooks.js';

/**
 * Create webhook router (must be registered before body parsing middleware)
 * Webhooks need raw body for signature validation
 */
export const createWebhookRouter = (): ExpressRouter => {
  const router: ExpressRouter = Router();
  router.use('/webhooks', webhookRoutes);
  return router;
};

/**
 * Create API router with all versioned endpoints
 * Combines all route modules and applies /api/v1 versioning
 */
export const createApiRouter = (): ExpressRouter => {
  const router: ExpressRouter = Router();

  // ============================================================================
  // API V1 ROUTES (versioned endpoints)
  // ============================================================================
  const v1Router: ExpressRouter = Router();

  // Authentication routes
  v1Router.use('/auth', authRoutes);

  // Project routes
  v1Router.use('/projects', projectRoutes);

  // LLM routes
  v1Router.use('/llm', llmRoutes);

  // Incident routes (nested under projects)
  v1Router.use('/projects/:projectId/incidents', incidentRoutes);

  // Remediation routes (nested under incidents)
  v1Router.use('/projects/:projectId/incidents/:incidentId/remediation', remediationRoutes);

  // Metrics routes
  v1Router.use('/metrics', metricsRoutes);

  // Logs routes (nested under projects)
  v1Router.use('/projects/:projectId/logs', logsRoutes);

  // Settings routes
  v1Router.use('/settings', settingsRoutes);

  // Billing routes
  v1Router.use('/billing', billingRoutes);

  // Register v1 routes under /api/v1 prefix
  router.use('/api/v1', v1Router);

  return router;
};

export default createApiRouter;
