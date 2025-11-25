# Requirements Document: LLMGuard Cloud Backend

## Introduction

LLMGuard Cloud is a production-ready SaaS backend that monitors, logs, and manages Large Language Model (LLM) requests in real-time. The system detects anomalies and security incidents through multiple detection methods, generates root cause analysis using AI, and provides automated remediation recommendations. The backend integrates with PostgreSQL (Neon), OpenAI APIs, Stripe for billing, and Datadog for monitoring. It serves a React-based dashboard frontend with comprehensive authentication, API key management, metrics generation, and incident tracking capabilities.

## Glossary

- **LLMGuard Cloud**: The backend system providing LLM monitoring, logging, and incident management
- **User**: An authenticated individual with an account in the system
- **Project**: A logical grouping of LLM requests and settings owned by a User
- **API Key**: A unique credential allowing programmatic access to LLM request logging endpoints
- **LLM Request**: A single prompt-response interaction with an LLM model (GPT-4, o3-mini, etc.)
- **Incident**: An anomaly or security event detected in LLM request patterns
- **Root Cause Analysis (RCA)**: AI-generated explanation of why an incident occurred
- **Remediation Action**: An automated or manual fix applied to resolve an incident
- **Risk Score**: A numerical value (0-100) indicating the security/safety risk of an LLM request
- **Metrics**: Aggregated statistics about LLM usage, errors, costs, and performance
- **JWT Token**: JSON Web Token used for stateless authentication (access + refresh)
- **API Rate Limiting**: Mechanism to restrict request frequency per user/API key
- **Webhook**: HTTP callback from external services (Datadog, Stripe) to the backend
- **Billing Plan**: Subscription tier (Free, Pro) with usage limits and pricing

## Requirements

### Requirement 1: User Authentication & Account Management

**User Story:** As a user, I want to register, log in, and manage my account securely, so that I can access the LLMGuard Cloud platform with confidence.

#### Acceptance Criteria

1. WHEN a user submits a registration request with email and password, THE LLMGuard Cloud SHALL validate the email format and password strength, hash the password using bcrypt, store the user record in the database, and return a success response with user ID and email.

2. WHEN a user submits a login request with valid email and password, THE LLMGuard Cloud SHALL verify the credentials, generate a JWT access token (15-minute expiration) and refresh token (7-day expiration), and return both tokens to the client.

3. WHEN a user submits a refresh token request, THE LLMGuard Cloud SHALL validate the refresh token, generate a new access token, and return it without requiring re-authentication.

4. WHEN a user submits a logout request, THE LLMGuard Cloud SHALL invalidate the session and return a success response.

5. IF a user submits invalid credentials, THEN THE LLMGuard Cloud SHALL return a 401 Unauthorized error with a generic message.

6. WHERE a user requests password reset, THE LLMGuard Cloud SHALL send a reset link via email and allow password update with a valid token.

### Requirement 2: Project Management & API Key System

**User Story:** As a user, I want to create and manage projects with unique API keys, so that I can organize and control access to my LLM monitoring.

#### Acceptance Criteria

1. WHEN a user creates a new project with a name, THE LLMGuard Cloud SHALL generate a unique API key, hash it using bcrypt, store the project record with the hashed key, and return the unhashed key once to the user.

2. WHEN a user requests to list projects, THE LLMGuard Cloud SHALL return all projects owned by the authenticated user with metadata (name, creation date, API key status).

3. WHEN a user rotates an API key for a project, THE LLMGuard Cloud SHALL generate a new API key, hash it, replace the old key, and return the new unhashed key.

4. WHEN a user deletes an API key, THE LLMGuard Cloud SHALL remove the key from the database and invalidate all requests using that key.

5. IF a request includes an invalid or expired API key, THEN THE LLMGuard Cloud SHALL return a 403 Forbidden error.

### Requirement 3: LLM Request Logging & Risk Scoring

**User Story:** As a developer, I want to log LLM requests with automatic risk assessment, so that I can track usage and identify potential security issues.

#### Acceptance Criteria

1. WHEN a developer submits an LLM request with a valid API key, prompt, response, model name, and latency, THE LLMGuard Cloud SHALL validate the API key, compute a risk score (0-100) based on prompt/response analysis, store the request record in the database, and return the LLM response with risk score.

2. WHILE processing an LLM request, THE LLMGuard Cloud SHALL measure and record the latency in milliseconds and token count from the LLM response.

3. WHEN computing a risk score, THE LLMGuard Cloud SHALL analyze the prompt and response for keywords, patterns, and content length to assign a numerical risk value.

4. IF an LLM request fails or times out, THEN THE LLMGuard Cloud SHALL log the error, increment the error counter for the project, and return an error response.

### Requirement 4: Incident Detection & Root Cause Analysis

**User Story:** As a platform operator, I want to automatically detect incidents and generate root cause analysis, so that I can quickly identify and resolve LLM-related issues.

#### Acceptance Criteria

1. WHEN the system detects an anomaly through rule-based triggers (latency > threshold, repeated errors, high risk score, cost spikes), THE LLMGuard Cloud SHALL create an incident record with severity level and trigger type.

2. WHEN a Datadog webhook is received at POST /webhooks/datadog, THE LLMGuard Cloud SHALL parse the alert, validate the webhook signature, create an incident if the alert indicates an anomaly, and store the incident metadata.

3. WHEN a scheduled cron job runs hourly, THE LLMGuard Cloud SHALL analyze the last hour of LLM requests, detect anomalies using statistical methods, and create incidents for significant deviations.

4. WHEN an incident is created, THE LLMGuard Cloud SHALL fetch the last 20 related LLM requests, send them to OpenAI for analysis, generate a root cause analysis with recommended fixes, and store the RCA in the incident record.

5. WHEN a user requests incident details, THE LLMGuard Cloud SHALL return the incident record including severity, status, root cause, recommended fix, and related LLM requests.

6. WHEN a user resolves an incident, THE LLMGuard Cloud SHALL update the incident status to resolved and record the resolution timestamp.

### Requirement 5: Auto-Remediation Engine

**User Story:** As a platform operator, I want to apply automated remediation actions to incidents, so that I can reduce manual intervention and improve system stability.

#### Acceptance Criteria

1. WHEN a remediation action is requested for an incident, THE LLMGuard Cloud SHALL support the following action types: switch model, increase safety threshold, disable risky endpoint, reset project settings, change system prompt, and rate limit user.

2. WHEN a remediation action is applied, THE LLMGuard Cloud SHALL log the action with metadata (action type, parameters, timestamp, status) and return a confirmation response.

3. WHILE a remediation action is active, THE LLMGuard Cloud SHALL enforce the action constraints (e.g., rate limit, model switch) on subsequent LLM requests.

4. WHEN a user requests remediation history, THE LLMGuard Cloud SHALL return all remediation actions applied to an incident with execution status and metadata.

### Requirement 6: Metrics & Analytics

**User Story:** As a user, I want to view aggregated metrics about my LLM usage, so that I can understand costs, performance, and error rates.

#### Acceptance Criteria

1. WHEN a user requests metrics for a project, THE LLMGuard Cloud SHALL return daily summaries including total requests, model usage breakdown, error rates, token usage, and estimated costs.

2. WHILE generating metrics, THE LLMGuard Cloud SHALL aggregate data from all LLM requests in the specified time period and calculate statistics.

3. WHEN metrics are requested, THE LLMGuard Cloud SHALL include time-series data for visualization on the dashboard.

### Requirement 7: Log Search & Filtering

**User Story:** As a user, I want to search and filter LLM request logs, so that I can investigate specific requests and patterns.

#### Acceptance Criteria

1. WHEN a user requests logs with search parameters (project ID, search query, limit, page), THE LLMGuard Cloud SHALL return paginated results with prompt, response, timestamp, latency, model, and risk score.

2. WHILE filtering logs, THE LLMGuard Cloud SHALL support full-text search on prompt and response content.

3. WHEN logs are requested, THE LLMGuard Cloud SHALL support sorting by timestamp, latency, risk score, and model.

### Requirement 8: User & Project Settings

**User Story:** As a user, I want to manage my profile and project settings, so that I can customize my LLMGuard Cloud experience.

#### Acceptance Criteria

1. WHEN a user requests profile settings, THE LLMGuard Cloud SHALL return user information (name, email, role, creation date).

2. WHEN a user updates profile settings, THE LLMGuard Cloud SHALL validate the input, update the user record, and return the updated profile.

3. WHEN a user requests project settings, THE LLMGuard Cloud SHALL return project configuration (name, model preferences, safety thresholds, rate limits).

4. WHEN a user updates project settings, THE LLMGuard Cloud SHALL validate the input, update the project record, and apply the new settings to subsequent requests.

### Requirement 9: Billing & Stripe Integration

**User Story:** As a user, I want to manage my subscription and billing, so that I can choose a plan that fits my usage needs.

#### Acceptance Criteria

1. WHEN a user initiates checkout for a billing plan, THE LLMGuard Cloud SHALL create a Stripe checkout session, store the session ID, and return the checkout URL.

2. WHEN a Stripe webhook is received at POST /webhooks/stripe, THE LLMGuard Cloud SHALL validate the webhook signature, update the user's billing plan and subscription ID, and record the transaction.

3. WHEN a user requests billing portal access, THE LLMGuard Cloud SHALL create a Stripe billing portal session and return the portal URL.

4. WHEN a user requests invoice history, THE LLMGuard Cloud SHALL return a list of invoices with amounts, dates, and status.

5. WHEN a user upgrades or downgrades their plan, THE LLMGuard Cloud SHALL update the subscription in Stripe and reflect the change in the database.

### Requirement 10: API Rate Limiting & Security

**User Story:** As a platform operator, I want to enforce rate limits and security controls, so that I can prevent abuse and ensure fair resource allocation.

#### Acceptance Criteria

1. WHEN a user or API key exceeds the rate limit for their plan, THE LLMGuard Cloud SHALL return a 429 Too Many Requests error with retry-after header.

2. WHILE processing requests, THE LLMGuard Cloud SHALL validate CORS headers and reject requests from unauthorized origins.

3. WHEN a request is received, THE LLMGuard Cloud SHALL log the request with timestamp, user ID, endpoint, and response status using Pino logger.

4. IF a request contains invalid input, THEN THE LLMGuard Cloud SHALL validate using Zod schemas and return a 400 Bad Request error with validation details.

### Requirement 11: System Architecture & Deployment

**User Story:** As a developer, I want a well-structured, scalable backend codebase, so that I can maintain and extend the system efficiently.

#### Acceptance Criteria

1. THE LLMGuard Cloud SHALL follow clean architecture principles with separation of concerns: controllers handle HTTP requests, services contain business logic, integrations manage external APIs, validators define Zod schemas, and utilities provide reusable helpers.

2. THE LLMGuard Cloud SHALL use Prisma ORM for all database operations with proper migrations and type safety.

3. THE LLMGuard Cloud SHALL use environment variables for configuration (database URL, API keys, JWT secrets, Stripe keys, OpenAI keys).

4. THE LLMGuard Cloud SHALL implement comprehensive error handling with consistent error response format.

5. THE LLMGuard Cloud SHALL support graceful shutdown and connection cleanup on application termination.
