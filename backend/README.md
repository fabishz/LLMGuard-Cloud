# LLMGuard Cloud Backend

A production-grade Node.js + TypeScript backend for monitoring, logging, and managing Large Language Model (LLM) requests in real-time.

## Features

- **LLM Request Logging**: Log and track all LLM interactions with automatic risk scoring
- **Incident Detection**: Multi-method anomaly detection (rule-based, statistical, webhook-based)
- **Root Cause Analysis**: AI-powered RCA generation using OpenAI
- **Auto-Remediation**: Automated incident response with multiple action types
- **Metrics & Analytics**: Comprehensive usage statistics and cost tracking
- **Billing Integration**: Stripe integration for subscription management
- **API Key Management**: Secure project-specific API credentials
- **Rate Limiting**: Per-user and per-API-key rate limiting

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon) with Prisma ORM
- **Authentication**: JWT (access + refresh tokens)
- **Validation**: Zod schemas
- **Security**: bcrypt for password hashing, API key hashing
- **Logging**: Pino structured logging
- **External APIs**: OpenAI, Stripe, Datadog webhooks
- **Scheduling**: node-cron for background jobs

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)
- OpenAI API key
- Stripe API keys
- Datadog webhook secret (optional)

### Installation

1. Clone the repository and navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### Development

Start the development server:
```bash
npm run dev
```

The server will run on `http://localhost:3000` by default.

### Building

Build the TypeScript code:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Project Structure

```
src/
├── config/              # Configuration management
├── middleware/          # Express middleware
├── controllers/         # HTTP request handlers
├── routes/              # Route definitions
├── services/            # Business logic
├── integrations/        # External API integrations
├── validators/          # Zod schemas
├── utils/               # Utility functions
├── db/                  # Database operations
├── cron/                # Scheduled jobs
├── types/               # TypeScript type definitions
└── index.ts             # Application entry point
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user

### Projects
- `GET /api/v1/projects` - List user projects
- `POST /api/v1/projects` - Create new project
- `GET /api/v1/projects/:id` - Get project details
- `DELETE /api/v1/projects/:id` - Delete project

### LLM Requests
- `POST /api/v1/llm/request` - Log LLM request

### Incidents
- `GET /api/v1/incidents` - List incidents
- `GET /api/v1/incidents/:id` - Get incident details
- `POST /api/v1/incidents/:id/resolve` - Resolve incident

### Metrics
- `GET /api/v1/metrics` - Get project metrics

### Logs
- `GET /api/v1/logs` - Search and filter LLM logs

### Settings
- `GET /api/v1/settings/profile` - Get user profile
- `POST /api/v1/settings/profile` - Update user profile
- `GET /api/v1/settings/project` - Get project settings
- `POST /api/v1/settings/project` - Update project settings

### Billing
- `POST /api/v1/billing/checkout` - Create checkout session
- `POST /api/v1/billing/portal` - Create billing portal session
- `GET /api/v1/billing/invoices` - Get invoices

### Webhooks
- `POST /api/v1/webhooks/datadog` - Datadog alert webhook
- `POST /api/v1/webhooks/stripe` - Stripe event webhook

## Code Quality

### Linting
```bash
npm run lint
npm run lint:fix
```

### Formatting
```bash
npm run format
```

### Testing
```bash
npm test
npm run test:watch
```

## Environment Variables

See `.env.example` for all available configuration options.

## Database Migrations

Create a new migration:
```bash
npm run prisma:migrate
```

Generate Prisma client:
```bash
npm run prisma:generate
```

Seed the database:
```bash
npm run prisma:seed
```

## Deployment

1. Build the application:
```bash
npm run build
```

2. Set production environment variables

3. Run database migrations:
```bash
npm run prisma:migrate
```

4. Start the server:
```bash
npm start
```

## License

MIT
