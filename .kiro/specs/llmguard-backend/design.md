# Design Document: LLMGuard Cloud Backend

## Overview

LLMGuard Cloud is a production-grade Node.js + TypeScript backend built with Express.js, Prisma ORM, and PostgreSQL (Neon). The system provides comprehensive LLM request monitoring, incident detection, and automated remediation through a RESTful API. The architecture follows clean separation of concerns with controllers, services, integrations, and validators organized by domain.

**Key Design Principles:**
- Clean Architecture: Clear separation between HTTP layer, business logic, and data access
- Type Safety: Full TypeScript with strict mode and Zod validation
- Scalability: Stateless design with horizontal scaling support
- Security: JWT authentication, API key hashing, rate limiting, CORS
- Observability: Structured logging with Pino, webhook integrations for monitoring
- Testability: Dependency injection, mock-friendly integrations

## Architecture

### High-Level System Flow

```
Client Request
    ↓
CORS Middleware
    ↓
Auth Middleware (JWT or API Key)
    ↓
Rate Limiting Middleware
    ↓
Input Validation (Zod)
    ↓
Controller (Route Handler)
    ↓
Service Layer (Business Logic)
    ↓
Prisma ORM (Database)
    ↓
External Integrations (OpenAI, Stripe, Datadog)
    ↓
Response + Logging
```

### Folder Structure

```
src/
├── config/              # Configuration management
│   ├── database.ts      # Prisma client setup
│   ├── env.ts           # Environment variables validation
│   └── constants.ts     # Application constants
├── middleware/          # Express middleware
│   ├── auth.ts          # JWT & API key authentication
│   ├── errorHandler.ts  # Global error handling
│   ├── rateLimit.ts     # Rate limiting
│   ├── cors.ts          # CORS configuration
│   ├── validation.ts    # Zod validation middleware
│   └── logging.ts       # Request logging with Pino
├── controllers/         # HTTP request handlers
│   ├── authController.ts
│   ├── projectController.ts
│   ├── llmController.ts
│   ├── incidentController.ts
│   ├── remediationController.ts
│   ├── metricsController.ts
│   ├── logsController.ts
│   ├── settingsController.ts
│   ├── billingController.ts
│   └── webhookController.ts
├── routes/              # Route definitions
│   ├── auth.ts
│   ├── projects.ts
│   ├── llm.ts
│   ├── incidents.ts
│   ├── remediations.ts
│   ├── metrics.ts
│   ├── logs.ts
│   ├── settings.ts
│   ├── billing.ts
│   ├── webhooks.ts
│   └── index.ts
├── services/            # Business logic
│   ├── authService.ts
│   ├── projectService.ts
│   ├── llmService.ts
│   ├── incidentService.ts
│   ├── remediationService.ts
│   ├── metricsService.ts
│   ├── logsService.ts
│   ├── settingsService.ts
│   └── billingService.ts
├── integrations/        # External API integrations
│   ├── openai.ts        # OpenAI API client
│   ├── stripe.ts        # Stripe API client
│   ├── datadog.ts       # Datadog webhook handler
│   └── webhookValidator.ts
├── validators/          # Zod schemas
│   ├── auth.ts
│   ├── project.ts
│   ├── llm.ts
│   ├── incident.ts
│   ├── remediation.ts
│   ├── settings.ts
│   └── billing.ts
├── utils/               # Utility functions
│   ├── jwt.ts           # JWT generation/verification
│   ├── crypto.ts        # Hashing and encryption
│   ├── errors.ts        # Custom error classes
│   ├── logger.ts        # Pino logger setup
│   ├── response.ts      # Standardized response formatting
│   └── validators.ts    # Validation helpers
├── db/                  # Database operations
│   ├── prisma.ts        # Prisma client export
│   └── migrations/      # Prisma migrations
├── cron/                # Scheduled jobs
│   ├── incidentDetection.ts
│   └── metricsAggregation.ts
├── types/               # TypeScript type definitions
│   ├── index.ts
│   ├── auth.ts
│   ├── project.ts
│   ├── llm.ts
│   ├── incident.ts
│   └── billing.ts
└── index.ts             # Application entry point
```

## Components and Interfaces

### 1. Authentication Service

**Responsibilities:**
- User registration with password hashing
- Login with credential verification
- JWT token generation (access + refresh)
- Token refresh without re-authentication
- Logout handling

**Key Interfaces:**
```typescript
interface AuthCredentials {
  email: string;
  password: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
}
```

**Implementation Details:**
- Access tokens: 15-minute expiration
- Refresh tokens: 7-day expiration
- Passwords hashed with bcrypt (salt rounds: 12)
- JWT signed with HS256 algorithm
- Tokens stored in HTTP-only cookies (optional) or Authorization header

### 2. Project & API Key Management

**Responsibilities:**
- Project CRUD operations
- API key generation and hashing
- API key validation middleware
- API key rotation and deletion

**Key Interfaces:**
```typescript
interface Project {
  id: string;
  userId: string;
  name: string;
  apiKeyHash: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ApiKey {
  id: string;
  projectId: string;
  keyHash: string;
  createdAt: Date;
  rotatedAt?: Date;
}
```

**Implementation Details:**
- API keys: UUID v4 format
- Keys hashed with bcrypt before storage
- Unhashed key returned only once during creation
- Middleware validates key against project
- Rate limits applied per API key

### 3. LLM Request Logging Service

**Responsibilities:**
- Validate incoming LLM requests
- Compute risk scores
- Store requests in database
- Track metrics (latency, tokens, errors)

**Key Interfaces:**
```typescript
interface LLMRequest {
  id: string;
  projectId: string;
  prompt: string;
  response: string;
  model: string;
  latency: number;
  tokens: number;
  riskScore: number;
  createdAt: Date;
}

interface RiskScoreInput {
  prompt: string;
  response: string;
  model: string;
}
```

**Risk Scoring Algorithm:**
- Base score: 0
- Prompt length > 5000 chars: +10
- Response length > 10000 chars: +10
- Sensitive keywords detected: +20
- High token count (>4000): +15
- Error in response: +25
- Model-specific risk adjustments: ±5
- Final score: clamped to 0-100

### 4. Incident Detection & RCA Service

**Responsibilities:**
- Detect anomalies through multiple methods
- Generate root cause analysis using OpenAI
- Store incident records
- Track incident status and resolution

**Detection Methods:**

**Rule-Based Triggers:**
- Latency > 5000ms (configurable)
- Error rate > 10% in last hour
- Risk score > 80 for 3+ consecutive requests
- Cost spike > 50% above daily average

**Webhook-Based (Datadog):**
- Receive alerts via POST /webhooks/datadog
- Validate webhook signature
- Create incident from alert metadata

**Scheduled Detection (Cron):**
- Runs hourly
- Analyzes last hour of requests
- Detects statistical anomalies (3-sigma rule)
- Creates incidents for significant deviations

**RCA Generation:**
```typescript
interface IncidentRCA {
  severity: 'low' | 'medium' | 'high' | 'critical';
  rootCause: string;
  recommendedFix: string;
  affectedRequests: number;
  metadata: Record<string, any>;
}
```

**OpenAI Integration:**
- Fetch last 20 related LLM requests
- Send to GPT-4 with structured prompt
- Parse response for RCA components
- Store in incident record

### 5. Auto-Remediation Engine

**Responsibilities:**
- Apply remediation actions to incidents
- Enforce action constraints on requests
- Log remediation history
- Support multiple action types

**Supported Actions:**
```typescript
type RemediationActionType = 
  | 'switch_model'
  | 'increase_safety_threshold'
  | 'disable_endpoint'
  | 'reset_settings'
  | 'change_system_prompt'
  | 'rate_limit_user';

interface RemediationAction {
  id: string;
  incidentId: string;
  actionType: RemediationActionType;
  parameters: Record<string, any>;
  executed: boolean;
  executedAt?: Date;
  metadata: Record<string, any>;
}
```

**Implementation Details:**
- Actions logged with full audit trail
- Constraints enforced in LLM request validation
- Mocked execution (no actual model switching)
- Reversible actions with rollback support

### 6. Metrics Service

**Responsibilities:**
- Aggregate LLM request statistics
- Calculate daily summaries
- Generate cost estimates
- Provide time-series data

**Key Metrics:**
```typescript
interface ProjectMetrics {
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  averageLatency: number;
  totalTokens: number;
  estimatedCost: number;
  modelBreakdown: Record<string, number>;
  dailySummary: DailySummary[];
}

interface DailySummary {
  date: string;
  requests: number;
  errors: number;
  avgLatency: number;
  tokens: number;
  cost: number;
}
```

**Calculation Details:**
- Cost: tokens × model_rate (GPT-4: $0.03/1K, o3-mini: $0.001/1K)
- Error rate: errors / total_requests
- Latency: average of all request latencies
- Time-series: daily aggregation for 30 days

### 7. Logs Search Service

**Responsibilities:**
- Query LLM requests with filters
- Support full-text search
- Provide pagination and sorting
- Return formatted results

**Query Interface:**
```typescript
interface LogQuery {
  projectId: string;
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

interface LogResult {
  id: string;
  prompt: string;
  response: string;
  timestamp: Date;
  latency: number;
  model: string;
  riskScore: number;
  metadata: Record<string, any>;
}
```

### 8. Settings Service

**Responsibilities:**
- Manage user profile settings
- Manage project configuration
- Store model preferences and safety thresholds

**Key Interfaces:**
```typescript
interface UserSettings {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

interface ProjectSettings {
  id: string;
  projectId: string;
  preferredModel: string;
  safetyThreshold: number;
  rateLimit: number;
  systemPrompt?: string;
  metadata: Record<string, any>;
}
```

### 9. Billing Service

**Responsibilities:**
- Manage subscription plans
- Handle Stripe integration
- Track usage and costs
- Generate invoices

**Billing Plans:**
```typescript
type BillingPlan = 'free' | 'pro' | 'enterprise';

interface BillingInfo {
  userId: string;
  plan: BillingPlan;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  usage: number;
  monthlyLimit: number;
  nextBillingDate: Date;
}
```

**Plan Limits:**
- Free: 10K requests/month
- Pro: 1M requests/month
- Enterprise: Custom

## Data Models

### Prisma Schema Overview

**Core Entities:**
- User: Authentication and account management
- Project: Logical grouping of LLM requests
- ApiKey: Project-specific API credentials
- LLMRequest: Individual LLM interactions
- Incident: Detected anomalies and issues
- RemediationAction: Applied fixes to incidents
- Billing: Subscription and usage tracking
- UserSettings: Profile customization
- ProjectSettings: Project configuration

**Key Relationships:**
- User → Projects (1:N)
- Project → ApiKeys (1:N)
- Project → LLMRequests (1:N)
- Project → Incidents (1:N)
- Incident → RemediationActions (1:N)
- User → Billing (1:1)

**Indexes:**
- LLMRequest: (projectId, createdAt), (projectId, riskScore)
- Incident: (projectId, status), (projectId, createdAt)
- User: (email) - unique

## Error Handling

**Error Categories:**

1. **Authentication Errors (401)**
   - Invalid credentials
   - Expired token
   - Missing authorization header

2. **Authorization Errors (403)**
   - Invalid API key
   - Insufficient permissions
   - Resource not owned by user

3. **Validation Errors (400)**
   - Invalid input format
   - Missing required fields
   - Constraint violations

4. **Rate Limit Errors (429)**
   - Exceeded request limit
   - Exceeded API key limit

5. **Not Found Errors (404)**
   - Resource not found
   - Project not found

6. **Server Errors (500)**
   - Database errors
   - External API failures
   - Unexpected exceptions

**Error Response Format:**
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
  };
}
```

## Testing Strategy

**Unit Tests:**
- Service layer logic (risk scoring, metrics calculation)
- Validator schemas (Zod validation)
- Utility functions (JWT, crypto operations)

**Integration Tests:**
- API endpoints with mock database
- Authentication flow (register, login, refresh)
- LLM request logging and storage
- Incident detection triggers

**Mock Integrations:**
- OpenAI API: Return mock RCA responses
- Stripe API: Mock checkout and webhook handling
- Datadog: Mock webhook validation

**Test Coverage:**
- Core business logic: 80%+
- API endpoints: 70%+
- Error handling: 90%+

## Deployment Considerations

**Environment Variables:**
- DATABASE_URL: Neon PostgreSQL connection
- JWT_SECRET: Secret for signing tokens
- REFRESH_TOKEN_SECRET: Secret for refresh tokens
- OPENAI_API_KEY: OpenAI API key
- STRIPE_SECRET_KEY: Stripe API key
- STRIPE_WEBHOOK_SECRET: Stripe webhook signature
- DATADOG_WEBHOOK_SECRET: Datadog webhook signature
- NODE_ENV: production/development
- PORT: Server port (default: 3000)

**Database Migrations:**
- Prisma migrations for schema changes
- Seed script for initial data
- Backup strategy for production

**Monitoring & Logging:**
- Pino structured logging to stdout
- Request/response logging
- Error tracking and alerting
- Performance metrics collection

**Scalability:**
- Stateless design for horizontal scaling
- Connection pooling for database
- Caching layer for metrics (optional)
- Queue system for async tasks (optional)

## Security Considerations

1. **Authentication:**
   - JWT tokens with short expiration
   - Refresh token rotation
   - Secure password hashing (bcrypt)

2. **API Keys:**
   - Hashed storage
   - Rotation capability
   - Per-project isolation

3. **Data Protection:**
   - HTTPS only in production
   - CORS configuration
   - Input validation with Zod
   - SQL injection prevention (Prisma)

4. **Rate Limiting:**
   - Per-user limits
   - Per-API-key limits
   - Sliding window algorithm

5. **Webhook Security:**
   - Signature validation
   - Timestamp verification
   - Replay attack prevention

## Integration Points

**OpenAI:**
- GPT-4 for RCA generation
- Structured prompt for analysis
- Error handling for API failures

**Stripe:**
- Checkout session creation
- Webhook event handling
- Billing portal access

**Datadog:**
- Webhook signature validation
- Alert parsing
- Incident creation from alerts

**PostgreSQL (Neon):**
- Connection pooling
- Transaction management
- Backup and recovery
