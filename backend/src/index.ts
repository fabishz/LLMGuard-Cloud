import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import env from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logging.js';
import { rateLimit } from './middleware/rateLimit.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import llmRoutes from './routes/llm.js';
import incidentRoutes from './routes/incidents.js';
import metricsRoutes from './routes/metrics.js';
import webhookRoutes from './routes/webhooks.js';
import { initializeIncidentDetectionCron } from './cron/incidentDetection.js';

// Initialize Express app
const app: Express = express();


// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// 1. Request logging middleware (before other middleware to capture all requests)
app.use(requestLogger);

// 2. CORS middleware
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  })
);

// 5. Health check endpoint (before route registration)
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

// Webhook routes (must be before global json middleware to capture raw body)
app.use('/webhooks', webhookRoutes);

// 3. Body parsing middleware (after webhooks to avoid interfering with signature validation)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 4. Rate limiting middleware (applies to authenticated requests)
app.use(rateLimit());

// Authentication routes
app.use('/auth', authRoutes);

// Project routes
app.use('/projects', projectRoutes);

// LLM routes
app.use('/llm', llmRoutes);

// Incident routes (nested under projects)
app.use('/projects/:projectId/incidents', incidentRoutes);

// Metrics routes
app.use('/metrics', metricsRoutes);

// Placeholder for additional routes (will be implemented in subsequent tasks):
// - Remediation routes
// - Logs routes
// - Settings routes
// - Billing routes

// ============================================================================
// 404 HANDLER
// ============================================================================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'RESOURCE_NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
    },
  });
});

// ============================================================================
// ERROR HANDLING MIDDLEWARE (must be last)
// ============================================================================

app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  logger.info(`🚀 LLMGuard Backend server running on port ${PORT}`);
  logger.info(`📝 Environment: ${env.NODE_ENV}`);
  logger.info(`🔗 API Base URL: ${env.API_BASE_URL}`);

  // Initialize scheduled incident detection cron job
  try {
    initializeIncidentDetectionCron();
  } catch (error) {
    logger.error({ error }, 'Failed to initialize cron jobs');
    // Don't exit on cron initialization failure - server can still run
  }
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const gracefulShutdown = async (signal: string) => {
  logger.info(`📍 Received ${signal}, starting graceful shutdown...`);

  // Close the server
  server.close(async () => {
    logger.info('✅ HTTP server closed');

    // Disconnect Prisma
    try {
      const prisma = (await import('./config/database.js')).default;
      await prisma.$disconnect();
      logger.info('✅ Database connection closed');
    } catch (error) {
      logger.error('❌ Error disconnecting database:', error);
    }

    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('❌ Forced shutdown after 30 seconds');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;
