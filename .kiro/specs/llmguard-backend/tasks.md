# Implementation Plan: LLMGuard Cloud Backend

## Phase 1: Project Setup & Core Infrastructure

- [x] 1. Initialize Node.js project with TypeScript and dependencies
  - Create package.json with Express, Prisma, Zod, bcrypt, jsonwebtoken, pino, stripe, dotenv
  - Configure TypeScript with strict mode (tsconfig.json)
  - Set up ESLint and Prettier for code quality
  - Create .env.example with all required environment variables
  - _Requirements: 11.1, 11.2, 11.3_

- [x] 2. Set up database configuration and Prisma ORM
  - Initialize Prisma with PostgreSQL (Neon)
  - Create prisma/schema.prisma with all entities and relationships
  - Configure connection pooling and environment variables
  - Create initial migration
  - _Requirements: 11.2, 11.3_

- [x] 3. Create project folder structure and core files
  - Create all directories: config, middleware, controllers, routes, services, validators, utils, db, cron, integrations, types
  - Create src/index.ts as application entry point
  - Set up Express app initialization with middleware stack
  - Configure CORS, error handling, and request logging
  - _Requirements: 11.1, 11.4_

- [x] 4. Implement configuration management
  - Create config/env.ts to validate and export environment variables
  - Create config/constants.ts with application constants (token expiration, rate limits, etc.)
  - Create config/database.ts to export Prisma client
  - _Requirements: 11.3_

- [x] 5. Set up logging infrastructure with Pino
  - Create utils/logger.ts with Pino configuration
  - Implement structured logging with request ID tracking
  - Create middleware/logging.ts for request/response logging
  - _Requirements: 10.3_

## Phase 2: Authentication & Security

- [x] 6. Implement JWT utilities and token management
  - Create utils/jwt.ts with token generation and verification functions
  - Implement access token (15-min) and refresh token (7-day) generation
  - Add token validation with error handling
  - _Requirements: 1.2, 1.3_

- [x] 7. Implement password hashing utilities
  - Create utils/crypto.ts with bcrypt hashing and verification
  - Implement password strength validation
  - Add API key hashing functions
  - _Requirements: 1.1, 2.1_

- [x] 8. Create authentication service
  - Create services/authService.ts with register, login, refresh, logout methods
  - Implement password validation and hashing
  - Add JWT token generation and refresh logic
  - Implement email validation
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 9. Create authentication routes and controller
  - Create routes/auth.ts with POST /auth/register, /auth/login, /auth/refresh-token, /auth/logout
  - Create controllers/authController.ts with request handlers
  - Create validators/auth.ts with Zod schemas for registration and login
  - Add input validation middleware
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 10. Implement authentication middleware
  - Create middleware/auth.ts with JWT verification middleware
  - Add API key validation middleware
  - Implement permission checking middleware (admin vs user)
  - _Requirements: 1.2, 2.4, 10.2_

- [x] 11. Implement rate limiting middleware
  - Create middleware/rateLimit.ts with sliding window rate limiter
  - Support per-user and per-API-key rate limits
  - Return 429 status with retry-after header
  - _Requirements: 10.1_

## Phase 3: Project & API Key Management

- [x] 12. Create project service
  - Create services/projectService.ts with CRUD operations
  - Implement project creation with API key generation
  - Add project listing and deletion
  - Implement API key rotation and validation
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 13. Create project routes and controller
  - Create routes/projects.ts with GET /projects, POST /projects, GET /projects/:id, DELETE /projects/:id
  - Create routes for API key management: POST /projects/:id/api-keys/create, /rotate, /delete
  - Create controllers/projectController.ts with request handlers
  - Create validators/project.ts with Zod schemas
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 14. Implement API key hashing and validation
  - Create utility functions for API key generation (UUID v4)
  - Implement bcrypt hashing for API key storage
  - Create middleware to validate API keys against projects
  - _Requirements: 2.1, 2.3, 2.4_

## Phase 4: LLM Request Logging & Risk Scoring

- [x] 15. Implement risk scoring algorithm
  - Create utils/riskScoring.ts with risk score calculation
  - Implement keyword detection for sensitive content
  - Add model-specific risk adjustments
  - Clamp scores to 0-100 range
  - _Requirements: 3.3_

- [x] 16. Create LLM service
  - Create services/llmService.ts with request logging and validation   
  - Implement risk score computation
  - Add latency and token tracking
  - Implement error handling and logging
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 17. Create LLM routes and controller
  - Create routes/llm.ts with POST /llm/request endpoint
  - Create controllers/llmController.ts with request handler
  - Create validators/llm.ts with Zod schemas for LLM requests
  - Implement API key validation middleware
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 18. Implement LLM request storage in database
  - Create Prisma operations for storing LLM requests
  - Add indexes for efficient querying (projectId, createdAt, riskScore)
  - Implement error tracking and logging
  - _Requirements: 3.1, 3.2, 3.4_

## Phase 5: Incident Detection & Root Cause Analysis

- [x] 19. Implement rule-based incident detection
  - Create services/incidentService.ts with detection logic
  - Implement latency threshold checking (>5000ms)
  - Add error rate detection (>10% in last hour)
  - Implement risk score anomaly detection (>80 for 3+ consecutive)
  - Add cost spike detection (>50% above daily average)
  - _Requirements: 4.1_

- [x] 20. Implement scheduled incident detection (cron job)
  - Create cron/incidentDetection.ts with hourly job
  - Implement statistical anomaly detection (3-sigma rule)
  - Create incidents for significant deviations
  - Add error handling and logging
  - _Requirements: 4.3_

- [x] 21. Integrate OpenAI for RCA generation
  - Create integrations/openai.ts with OpenAI API client
  - Implement RCA prompt generation
  - Add response parsing for severity, root cause, and recommended fix
  - Implement error handling and fallback responses
  - _Requirements: 4.4_

- [x] 22. Create incident service with RCA generation
  - Extend services/incidentService.ts with RCA generation
  - Implement fetching last 20 related LLM requests
  - Add OpenAI integration for analysis
  - Store RCA in incident record
  - _Requirements: 4.1, 4.3, 4.4_

- [x] 23. Create incident routes and controller
  - Create routes/incidents.ts with GET /incidents, GET /incidents/:id, POST /incidents/:id/resolve
  - Create controllers/incidentController.ts with request handlers
  - Create validators/incident.ts with Zod schemas
  - Implement incident listing with filtering
  - _Requirements: 4.5, 4.6_

- [x] 24. Implement Datadog webhook handler
  - Create integrations/webhookValidator.ts with signature validation
  - Create routes/webhooks.ts with POST /webhooks/datadog endpoint
  - Implement webhook parsing and incident creation
  - Add error handling and logging
  - _Requirements: 4.2_

## Phase 6: Auto-Remediation Engine

- [x] 25. Create remediation service
  - Create services/remediationService.ts with action application logic
  - Implement support for all action types (switch_model, increase_safety_threshold, disable_endpoint, reset_settings, change_system_prompt, rate_limit_user)
  - Add action logging with metadata
  - Implement constraint enforcement on requests
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 26. Create remediation routes and controller
  - Create routes/remediations.ts with POST /incidents/:id/apply-remediation
  - Create controllers/remediationController.ts with request handlers
  - Create validators/remediation.ts with Zod schemas
  - Implement remediation history retrieval
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 27. Implement remediation action enforcement
  - Add remediation constraint checking in LLM request validation
  - Implement model switching logic (mock)
  - Add safety threshold enforcement
  - Implement rate limiting for remediated users
  - _Requirements: 5.3_

## Phase 7: Metrics & Analytics

- [-] 28. Create metrics service
  - Create services/metricsService.ts with aggregation logic
  - Implement daily summary calculation
  - Add model usage breakdown
  - Implement error rate and token usage calculation
  - Add cost estimation based on model rates
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 29. Create metrics routes and controller
  - Create routes/metrics.ts with GET /metrics endpoint
  - Create controllers/metricsController.ts with request handler
  - Create validators/metrics.ts with Zod schemas
  - Implement time-series data generation
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 30. Implement metrics cron job
  - Create cron/metricsAggregation.ts with daily aggregation job
  - Implement pre-calculation of metrics for performance
  - Add caching layer for frequently accessed metrics
  - _Requirements: 6.1, 6.2_

## Phase 8: Log Search & Filtering

- [x] 31. Create logs service
  - Create services/logsService.ts with query and filtering logic
  - Implement full-text search on prompt and response
  - Add filtering by model, risk score, date range
  - Implement sorting by timestamp, latency, risk score
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 32. Create logs routes and controller
  - Create routes/logs.ts with GET /logs endpoint
  - Create controllers/logsController.ts with request handler
  - Create validators/logs.ts with Zod schemas
  - Implement pagination with limit and page parameters
  - _Requirements: 7.1, 7.2, 7.3_

## Phase 9: User & Project Settings

- [x] 33. Create settings service
  - Create services/settingsService.ts with profile and project settings management
  - Implement user profile retrieval and updates
  - Add project settings retrieval and updates
  - Implement validation for settings updates
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 34. Create settings routes and controller
  - Create routes/settings.ts with GET/POST /settings/profile, /settings/project, /settings/api-keys, /settings/model-settings
  - Create controllers/settingsController.ts with request handlers
  - Create validators/settings.ts with Zod schemas
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

## Phase 10: Billing & Stripe Integration

- [x] 35. Integrate Stripe SDK
  - Create integrations/stripe.ts with Stripe client initialization
  - Implement checkout session creation
  - Add billing portal session creation
  - Implement webhook signature validation
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 36. Create billing service
  - Create services/billingService.ts with subscription management
  - Implement plan upgrade/downgrade logic
  - Add invoice retrieval
  - Implement usage tracking and limit enforcement
  - _Requirements: 9.1, 9.2, 9.4, 9.5_

- [x] 37. Create billing routes and controller
  - Create routes/billing.ts with POST /billing/checkout, /billing/portal, GET /billing/invoices
  - Create controllers/billingController.ts with request handlers
  - Create validators/billing.ts with Zod schemas
  - _Requirements: 9.1, 9.3, 9.4_

- [x] 38. Implement Stripe webhook handler
  - Create routes/webhooks.ts POST /webhooks/stripe endpoint
  - Implement webhook signature validation
  - Add subscription update handling
  - Implement invoice tracking
  - _Requirements: 9.2, 9.5_

## Phase 11: Error Handling & Validation

- [x] 39. Implement global error handling
  - Create utils/errors.ts with custom error classes
  - Create middleware/errorHandler.ts with error response formatting
  - Implement error logging with Pino
  - Add error response standardization
  - _Requirements: 10.4, 11.4_

- [x] 40. Implement input validation middleware
  - Create middleware/validation.ts with Zod validation middleware
  - Add validation error response formatting
  - Implement request body, query, and params validation
  - _Requirements: 10.4_

## Phase 12: Integration & Testing

- [x] 41. Wire all routes together
  - Create routes/index.ts to combine all route modules
  - Register all routes in Express app
  - Implement route versioning (optional: /api/v1)
  - Test all endpoints for connectivity
  - _Requirements: 11.1_

- [x] 42. Implement graceful shutdown
  - Add process signal handlers (SIGTERM, SIGINT)
  - Implement database connection cleanup
  - Add server shutdown with timeout
  - _Requirements: 11.5_

- [x] 43. Create mock data and seed script
  - Create db/seed.ts with sample users, projects, and LLM requests
  - Implement seed script for development
  - Add mock incident data
  - _Requirements: 11.2_

- [x] 44. Create comprehensive API documentation
  - Document all endpoints with request/response examples
  - Add authentication requirements
  - Document error codes and messages
  - Create OpenAPI/Swagger spec
  - _Requirements: 11.1_

- [x] 45. Set up environment configuration for different environments
  - Create .env.development, .env.production, .env.test
  - Implement environment-specific configurations
  - Add validation for required variables per environment
  - _Requirements: 11.3_

- [ ] 46. Write unit tests for authentication service
  - Test password hashing and verification
  - Test JWT token generation and validation
  - Test login with valid/invalid credentials
  - Test token refresh logic
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 47. Write unit tests for risk scoring algorithm
  - Test risk score calculation with various inputs
  - Test keyword detection
  - Test score clamping to 0-100 range
  - Test model-specific adjustments
  - _Requirements: 3.3_

- [ ] 48. Write unit tests for incident detection
  - Test rule-based trigger detection
  - Test statistical anomaly detection
  - Test incident creation logic
  - _Requirements: 4.1, 4.3_

- [ ] 49. Write unit tests for metrics calculation
  - Test daily summary aggregation
  - Test error rate calculation
  - Test cost estimation
  - Test model breakdown
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 50. Write unit tests for remediation service
  - Test remediation action creation
  - Test constraint enforcement
  - Test action logging
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 51. Write integration tests for authentication endpoints
  - Test POST /auth/register with valid/invalid data
  - Test POST /auth/login with valid/invalid credentials
  - Test POST /auth/refresh-token with valid/expired tokens
  - Test POST /auth/logout
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 52. Write integration tests for project endpoints
  - Test POST /projects with project creation
  - Test GET /projects for listing
  - Test API key creation and rotation
  - Test API key validation in requests
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 53. Write integration tests for LLM request endpoint
  - Test POST /llm/request with valid API key
  - Test risk score computation
  - Test error handling for invalid requests
  - Test latency and token tracking
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 54. Write integration tests for incident endpoints
  - Test GET /incidents with filtering
  - Test GET /incidents/:id for detail retrieval
  - Test POST /incidents/:id/resolve
  - Test incident creation from various triggers
  - _Requirements: 4.1, 4.5, 4.6_

- [ ] 55. Write integration tests for metrics endpoint
  - Test GET /metrics with time-series data
  - Test metric aggregation accuracy
  - Test cost calculation
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 56. Write integration tests for logs endpoint
  - Test GET /logs with search and filtering
  - Test pagination with limit and page
  - Test sorting by different fields
  - Test full-text search functionality
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 57. Write integration tests for settings endpoints
  - Test GET/POST /settings/profile
  - Test GET/POST /settings/project
  - Test settings validation
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 58. Write integration tests for billing endpoints
  - Test POST /billing/checkout
  - Test POST /billing/portal
  - Test GET /billing/invoices
  - Test Stripe webhook handling
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 59. Write integration tests for webhook handlers
  - Test Datadog webhook signature validation
  - Test Datadog webhook incident creation
  - Test Stripe webhook signature validation
  - Test Stripe webhook subscription updates
  - _Requirements: 4.2, 9.2_

- [ ] 60. Write integration tests for middleware
  - Test authentication middleware with valid/invalid tokens
  - Test API key validation middleware
  - Test rate limiting middleware
  - Test error handling middleware
  - _Requirements: 10.1, 10.2, 10.3, 10.4_
