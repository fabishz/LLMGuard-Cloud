# Environment Configuration Guide

## Overview

LLMGuard Backend uses environment-specific configuration files to manage settings across different environments (development, production, and testing). The application automatically loads the appropriate `.env` file based on the `NODE_ENV` variable.

## Environment Files

### `.env.development`
Used for local development. Contains relaxed security requirements and verbose logging.

**Key characteristics:**
- `NODE_ENV=development`
- `LOG_LEVEL=debug` for detailed logging
- Higher rate limits (1000 requests)
- Local database connection
- Test API keys and secrets

**Usage:**
```bash
NODE_ENV=development npm run dev
```

### `.env.production`
Used for production deployment. Contains strict security requirements and minimal logging.

**Key characteristics:**
- `NODE_ENV=production`
- `LOG_LEVEL=info` for minimal logging
- Lower rate limits (100 requests)
- Production database connection (Neon)
- Real API keys and secrets (must be set)
- HTTPS URLs and production domains

**Usage:**
```bash
NODE_ENV=production npm start
```

**Important:** Before deploying to production, ensure all secrets are updated:
- `JWT_SECRET` - Change from default value
- `REFRESH_TOKEN_SECRET` - Change from default value
- `OPENAI_API_KEY` - Set to real OpenAI key
- `STRIPE_SECRET_KEY` - Set to real Stripe key
- `STRIPE_WEBHOOK_SECRET` - Set to real Stripe webhook secret
- `DATADOG_WEBHOOK_SECRET` - Set to real Datadog secret
- `DATABASE_URL` - Set to production database URL
- `CORS_ORIGIN` - Set to production domain
- `API_BASE_URL` - Set to production API URL

### `.env.test`
Used for automated testing. Contains test-specific configurations.

**Key characteristics:**
- `NODE_ENV=test`
- `LOG_LEVEL=error` to minimize test output
- Very high rate limits (10000 requests) for test scenarios
- Test database connection
- Test API keys and secrets
- Separate port (3001) to avoid conflicts

**Usage:**
```bash
NODE_ENV=test npm test
```

## Environment Variables

### Application Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NODE_ENV` | enum | development | Environment: development, production, or test |
| `PORT` | number | 3000 | Server port |

### Database

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `DATABASE_URL` | string | Yes | PostgreSQL connection string (Neon) |

### Authentication

| Variable | Type | Min Length | Description |
|----------|------|-----------|-------------|
| `JWT_SECRET` | string | 32 chars | Secret for signing access tokens |
| `REFRESH_TOKEN_SECRET` | string | 32 chars | Secret for signing refresh tokens |
| `JWT_EXPIRATION` | string | - | Access token expiration (default: 15m) |
| `REFRESH_TOKEN_EXPIRATION` | string | - | Refresh token expiration (default: 7d) |

### External APIs

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `OPENAI_API_KEY` | string | Yes | OpenAI API key for RCA generation |
| `STRIPE_SECRET_KEY` | string | Yes | Stripe secret key for billing |
| `STRIPE_PUBLISHABLE_KEY` | string | Yes | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | string | Yes | Stripe webhook signature secret |
| `DATADOG_WEBHOOK_SECRET` | string | Yes | Datadog webhook signature secret |

### Rate Limiting

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | number | 900000 | Rate limit window in milliseconds (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | number | 100 | Max requests per window |

### Logging

| Variable | Type | Default | Options |
|----------|------|---------|---------|
| `LOG_LEVEL` | enum | info | trace, debug, info, warn, error, fatal |

### CORS & API

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `CORS_ORIGIN` | string | http://localhost:5173 | Allowed CORS origin |
| `API_VERSION` | string | v1 | API version prefix |
| `API_BASE_URL` | string | http://localhost:3000 | Base URL for API |

### Incident Detection

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `LATENCY_THRESHOLD_MS` | number | 5000 | Latency threshold for incident detection (ms) |
| `ERROR_RATE_THRESHOLD` | number | 0.1 | Error rate threshold (0-1) |
| `RISK_SCORE_THRESHOLD` | number | 80 | Risk score threshold (0-100) |
| `COST_SPIKE_THRESHOLD` | number | 1.5 | Cost spike multiplier (1.5 = 50% increase) |

### Model Pricing

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `GPT4_PRICE` | number | 0.03 | GPT-4 price per 1K tokens |
| `O3_MINI_PRICE` | number | 0.001 | o3-mini price per 1K tokens |

## Setup Instructions

### 1. Initial Setup (Development)

```bash
# Copy the example file
cp backend/.env.example backend/.env.development

# Edit with your local settings
nano backend/.env.development

# Start development server
NODE_ENV=development npm run dev
```

### 2. Production Setup

```bash
# Create production config
cp backend/.env.example backend/.env.production

# Edit with production values
nano backend/.env.production

# Ensure all secrets are set to real values (not defaults)
# Build and start
npm run build
NODE_ENV=production npm start
```

### 3. Testing Setup

```bash
# The .env.test file is already configured
# Run tests
NODE_ENV=test npm test
```

## Validation

The application validates environment variables on startup using Zod schemas. Validation includes:

### All Environments
- Required variables are present
- JWT secrets are at least 32 characters
- Database URL is valid
- API keys are non-empty

### Production Only
- JWT secrets are not default values
- Ensures production-specific security requirements

### Validation Errors

If validation fails, the application will exit with a detailed error message:

```
❌ Environment validation failed:
  - DATABASE_URL: Invalid DATABASE_URL
  - JWT_SECRET: JWT_SECRET must be at least 32 characters
```

## Best Practices

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Use `.env.example`** - Keep as template for new developers
3. **Rotate secrets regularly** - Especially in production
4. **Use strong secrets** - At least 32 characters for JWT secrets
5. **Environment-specific values** - Don't use development values in production
6. **Validate on startup** - The app validates all variables before starting
7. **Document changes** - Update `.env.example` when adding new variables

## Troubleshooting

### "DATABASE_URL is required"
- Ensure `DATABASE_URL` is set in the appropriate `.env` file
- Check the connection string format: `postgresql://user:password@host:port/database`

### "JWT_SECRET must be at least 32 characters"
- Generate a strong secret: `openssl rand -base64 32`
- Update both `JWT_SECRET` and `REFRESH_TOKEN_SECRET`

### "Production environment requires non-default JWT secrets"
- In production, change the default JWT secrets to real values
- Don't use the template values from `.env.production`

### Wrong environment loading
- Check `NODE_ENV` is set correctly before starting the app
- Verify the `.env.{NODE_ENV}` file exists
- Check file permissions

## Environment-Specific Behavior

### Development
- Verbose logging (debug level)
- CORS allows localhost:5173
- Higher rate limits for testing
- Local database

### Production
- Minimal logging (info level)
- CORS restricted to production domain
- Lower rate limits for security
- Production database (Neon)
- Strict validation of secrets

### Test
- Error-level logging only
- Very high rate limits
- Test database
- Separate port to avoid conflicts

## Adding New Environment Variables

1. Add to all `.env.*` files with appropriate values
2. Update `.env.example` with the new variable
3. Update `backend/src/config/env.ts` schema
4. Add environment-specific validation if needed
5. Update this documentation

Example:
```typescript
// In env.ts
const baseEnvSchema = z.object({
  // ... existing variables
  NEW_VARIABLE: z.string().min(1, 'NEW_VARIABLE is required'),
});
```
