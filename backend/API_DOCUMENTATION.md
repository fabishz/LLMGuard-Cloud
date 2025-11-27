# LLMGuard Cloud Backend API Documentation

## Overview

LLMGuard Cloud is a production-ready SaaS backend for monitoring, logging, and managing Large Language Model requests in real-time. This document provides comprehensive API documentation including all endpoints, authentication requirements, request/response examples, and error codes.

**API Base URL:** `https://api.llmguard.io/api/v1`  
**Development URL:** `http://localhost:3000/api/v1`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Error Handling](#error-handling)
3. [Rate Limiting](#rate-limiting)
4. [Endpoints](#endpoints)
   - [Authentication](#authentication-endpoints)
   - [Projects](#projects-endpoints)
   - [LLM Requests](#llm-requests-endpoints)
   - [Incidents](#incidents-endpoints)
   - [Remediation](#remediation-endpoints)
   - [Metrics](#metrics-endpoints)
   - [Logs](#logs-endpoints)
   - [Settings](#settings-endpoints)
   - [Billing](#billing-endpoints)
   - [Webhooks](#webhooks-endpoints)

---

## Authentication

### JWT Bearer Token

Most endpoints require authentication using JWT bearer tokens. Include the token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

**Token Details:**
- **Access Token:** 15-minute expiration
- **Refresh Token:** 7-day expiration
- **Algorithm:** HS256

### API Key Authentication

Project-specific endpoints can use API key authentication via the `X-API-Key` header:

```
X-API-Key: <api_key>
```

**API Key Details:**
- Generated per project
- Hashed and stored securely
- Can be rotated at any time
- Returned only once during creation

### Example: Getting Tokens

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

Response:
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### HTTP Status Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | BAD_REQUEST | Invalid input or validation error |
| 401 | UNAUTHORIZED | Missing or invalid authentication |
| 403 | FORBIDDEN | Insufficient permissions or invalid API key |
| 404 | NOT_FOUND | Resource not found |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_SERVER_ERROR | Server error |

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_CREDENTIALS | 401 | Email or password is incorrect |
| TOKEN_EXPIRED | 401 | JWT token has expired |
| INVALID_TOKEN | 401 | JWT token is invalid or malformed |
| INVALID_API_KEY | 403 | API key is invalid or revoked |
| INSUFFICIENT_PERMISSIONS | 403 | User lacks required permissions |
| RESOURCE_NOT_FOUND | 404 | Requested resource does not exist |
| VALIDATION_ERROR | 400 | Request validation failed |
| RATE_LIMIT_EXCEEDED | 429 | Rate limit exceeded |
| INTERNAL_SERVER_ERROR | 500 | Unexpected server error |

### Example Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "email": "Invalid email format",
      "password": "Password must be at least 8 characters"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

## Rate Limiting

Rate limits are enforced per user and per API key based on billing plan:

| Plan | Requests/Hour | Requests/Month |
|------|---------------|-----------------|
| Free | 100 | 10,000 |
| Pro | 1,000 | 1,000,000 |
| Enterprise | Unlimited | Unlimited |

### Rate Limit Headers

Responses include rate limit information:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705318200
```

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 3600 seconds",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

HTTP Status: `429 Too Many Requests`  
Header: `Retry-After: 3600`

---

## Endpoints

### Authentication Endpoints

#### Register User

**POST** `/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

**Validation Rules:**
- Email must be valid format
- Password must be at least 8 characters
- Name is optional

**Error Codes:** `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`

---

#### Login

**POST** `/auth/login`

Authenticate user and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

**Error Codes:** `INVALID_CREDENTIALS`, `VALIDATION_ERROR`

---

#### Refresh Token

**POST** `/auth/refresh-token`

Get a new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

**Error Codes:** `INVALID_TOKEN`, `TOKEN_EXPIRED`

---

#### Logout

**POST** `/auth/logout`

Invalidate current session.

**Authentication:** Required (Bearer Token)

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

---

### Projects Endpoints

#### Create Project

**POST** `/projects`

Create a new project with API key.

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "name": "My LLM Project"
}
```

**Response:** `201 Created`
```json
{
  "project": {
    "id": "proj_123",
    "name": "My LLM Project",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "apiKey": "llmg_abc123def456ghi789jkl012mno345"
}
```

**Note:** API key is returned only once. Store it securely.

**Error Codes:** `VALIDATION_ERROR`, `UNAUTHORIZED`

---

#### List Projects

**GET** `/projects`

List all projects for authenticated user.

**Authentication:** Required (Bearer Token)

**Query Parameters:**
- `limit` (optional): Max results (default: 50, max: 100)
- `page` (optional): Page number (default: 1)

**Response:** `200 OK`
```json
{
  "projects": [
    {
      "id": "proj_123",
      "name": "My LLM Project",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 50
  }
}
```

---

#### Get Project

**GET** `/projects/{projectId}`

Get project details.

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `projectId` (required): Project ID

**Response:** `200 OK`
```json
{
  "id": "proj_123",
  "name": "My LLM Project",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Error Codes:** `NOT_FOUND`, `UNAUTHORIZED`

---

#### Delete Project

**DELETE** `/projects/{projectId}`

Delete a project and all associated data.

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `projectId` (required): Project ID

**Response:** `200 OK`
```json
{
  "message": "Project deleted successfully"
}
```

**Error Codes:** `NOT_FOUND`, `UNAUTHORIZED`

---

#### Create API Key

**POST** `/projects/{projectId}/api-keys/create`

Generate a new API key for project.

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `projectId` (required): Project ID

**Response:** `201 Created`
```json
{
  "apiKey": {
    "id": "key_123",
    "key": "llmg_abc123def456ghi789jkl012mno345",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

#### Rotate API Key

**POST** `/projects/{projectId}/api-keys/rotate`

Rotate existing API key.

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `projectId` (required): Project ID

**Response:** `200 OK`
```json
{
  "apiKey": {
    "id": "key_123",
    "key": "llmg_new123def456ghi789jkl012mno345",
    "rotatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

#### Delete API Key

**DELETE** `/projects/{projectId}/api-keys/{keyId}`

Delete an API key.

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `projectId` (required): Project ID
- `keyId` (required): API Key ID

**Response:** `200 OK`
```json
{
  "message": "API key deleted successfully"
}
```

---

### LLM Requests Endpoints

#### Log LLM Request

**POST** `/llm/request`

Log an LLM request with automatic risk scoring.

**Authentication:** Required (API Key via X-API-Key header)

**Request Body:**
```json
{
  "prompt": "What is machine learning?",
  "response": "Machine learning is a subset of artificial intelligence...",
  "model": "gpt-4",
  "latency": 1250,
  "tokens": 150,
  "error": null
}
```

**Response:** `201 Created`
```json
{
  "id": "req_123",
  "prompt": "What is machine learning?",
  "response": "Machine learning is a subset of artificial intelligence...",
  "model": "gpt-4",
  "latency": 1250,
  "tokens": 150,
  "riskScore": 15,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Validation Rules:**
- Prompt: 1-50,000 characters
- Response: 1-100,000 characters
- Model: 1-255 characters
- Latency: 0-600,000 ms
- Tokens: 0-1,000,000

**Error Codes:** `INVALID_API_KEY`, `VALIDATION_ERROR`, `RATE_LIMIT_EXCEEDED`

---

### Incidents Endpoints

#### List Incidents

**GET** `/projects/{projectId}/incidents`

List incidents for a project.

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `projectId` (required): Project ID

**Query Parameters:**
- `status` (optional): Filter by status (open, resolved)
- `limit` (optional): Max results (default: 50, max: 100)
- `page` (optional): Page number (default: 1)

**Response:** `200 OK`
```json
{
  "incidents": [
    {
      "id": "inc_123",
      "severity": "high",
      "triggerType": "latency_spike",
      "status": "open",
      "rootCause": "Database connection pool exhausted",
      "recommendedFix": "Increase connection pool size",
      "affectedRequests": 45,
      "createdAt": "2024-01-15T10:30:00Z",
      "resolvedAt": null
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 50
  }
}
```

---

#### Get Incident Details

**GET** `/projects/{projectId}/incidents/{incidentId}`

Get detailed information about an incident.

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `projectId` (required): Project ID
- `incidentId` (required): Incident ID

**Response:** `200 OK`
```json
{
  "id": "inc_123",
  "severity": "high",
  "triggerType": "latency_spike",
  "status": "open",
  "rootCause": "Database connection pool exhausted",
  "recommendedFix": "Increase connection pool size",
  "affectedRequests": 45,
  "metadata": {
    "avgLatency": 5200,
    "maxLatency": 8500
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "resolvedAt": null
}
```

---

#### Resolve Incident

**POST** `/projects/{projectId}/incidents/{incidentId}/resolve`

Mark an incident as resolved.

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `projectId` (required): Project ID
- `incidentId` (required): Incident ID

**Response:** `200 OK`
```json
{
  "id": "inc_123",
  "status": "resolved",
  "resolvedAt": "2024-01-15T10:35:00Z"
}
```

---

### Remediation Endpoints

#### Apply Remediation Action

**POST** `/projects/{projectId}/incidents/{incidentId}/remediation`

Apply a remediation action to an incident.

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `projectId` (required): Project ID
- `incidentId` (required): Incident ID

**Request Body:**
```json
{
  "actionType": "switch_model",
  "parameters": {
    "newModel": "gpt-3.5-turbo"
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "rem_123",
  "actionType": "switch_model",
  "parameters": {
    "newModel": "gpt-3.5-turbo"
  },
  "executed": true,
  "executedAt": "2024-01-15T10:30:00Z",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Supported Action Types:**
- `switch_model`: Change LLM model
- `increase_safety_threshold`: Raise safety threshold
- `disable_endpoint`: Disable risky endpoint
- `reset_settings`: Reset project settings
- `change_system_prompt`: Update system prompt
- `rate_limit_user`: Apply rate limiting

---

#### Get Remediation History

**GET** `/projects/{projectId}/incidents/{incidentId}/remediation`

Get all remediation actions for an incident.

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `projectId` (required): Project ID
- `incidentId` (required): Incident ID

**Query Parameters:**
- `limit` (optional): Max results (default: 50)
- `offset` (optional): Offset (default: 0)

**Response:** `200 OK`
```json
{
  "actions": [
    {
      "id": "rem_123",
      "actionType": "switch_model",
      "parameters": {
        "newModel": "gpt-3.5-turbo"
      },
      "executed": true,
      "executedAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### Metrics Endpoints

#### Get Project Metrics

**GET** `/metrics`

Get aggregated metrics for a project.

**Authentication:** Required (Bearer Token)

**Query Parameters:**
- `projectId` (required): Project ID
- `startDate` (optional): Start date (ISO 8601)
- `endDate` (optional): End date (ISO 8601)

**Response:** `200 OK`
```json
{
  "totalRequests": 5000,
  "errorCount": 50,
  "errorRate": 1.0,
  "averageLatency": 1200,
  "totalTokens": 500000,
  "estimatedCost": 15.50,
  "modelBreakdown": {
    "gpt-4": 3000,
    "gpt-3.5-turbo": 2000
  },
  "dailySummary": [
    {
      "date": "2024-01-15",
      "requests": 500,
      "errors": 5,
      "avgLatency": 1200,
      "tokens": 50000,
      "cost": 1.55
    }
  ]
}
```

---

### Logs Endpoints

#### Search Logs

**GET** `/projects/{projectId}/logs`

Search and filter LLM request logs.

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `projectId` (required): Project ID

**Query Parameters:**
- `search` (optional): Full-text search on prompt/response
- `model` (optional): Filter by model name
- `minRiskScore` (optional): Minimum risk score (0-100)
- `maxRiskScore` (optional): Maximum risk score (0-100)
- `startDate` (optional): Start date (ISO 8601)
- `endDate` (optional): End date (ISO 8601)
- `sortBy` (optional): Sort field (timestamp, latency, riskScore)
- `sortOrder` (optional): Sort order (asc, desc)
- `limit` (optional): Max results (default: 100, max: 1000)
- `page` (optional): Page number (default: 1)

**Response:** `200 OK`
```json
{
  "logs": [
    {
      "id": "req_123",
      "prompt": "What is machine learning?",
      "response": "Machine learning is a subset of artificial intelligence...",
      "model": "gpt-4",
      "latency": 1250,
      "tokens": 150,
      "riskScore": 15,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 1000,
    "page": 1,
    "limit": 100
  }
}
```

---

### Settings Endpoints

#### Get User Profile

**GET** `/settings/profile`

Get authenticated user's profile settings.

**Authentication:** Required (Bearer Token)

**Response:** `200 OK`
```json
{
  "id": "user_123",
  "name": "John Doe",
  "email": "user@example.com",
  "role": "user",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

#### Update User Profile

**POST** `/settings/profile`

Update user profile settings.

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "name": "Jane Doe"
}
```

**Response:** `200 OK`
```json
{
  "id": "user_123",
  "name": "Jane Doe",
  "email": "user@example.com",
  "role": "user",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

---

#### Get Project Settings

**GET** `/settings/project/{projectId}`

Get project configuration settings.

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `projectId` (required): Project ID

**Response:** `200 OK`
```json
{
  "id": "proj_123",
  "preferredModel": "gpt-4",
  "safetyThreshold": 80,
  "rateLimit": 100,
  "systemPrompt": "You are a helpful assistant",
  "metadata": {}
}
```

---

#### Update Project Settings

**POST** `/settings/project/{projectId}`

Update project configuration settings.

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `projectId` (required): Project ID

**Request Body:**
```json
{
  "preferredModel": "gpt-3.5-turbo",
  "safetyThreshold": 75,
  "rateLimit": 200,
  "systemPrompt": "You are a helpful assistant"
}
```

**Response:** `200 OK`
```json
{
  "id": "proj_123",
  "preferredModel": "gpt-3.5-turbo",
  "safetyThreshold": 75,
  "rateLimit": 200,
  "systemPrompt": "You are a helpful assistant",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

---

### Billing Endpoints

#### Create Checkout Session

**POST** `/billing/checkout`

Create a Stripe checkout session for plan upgrade.

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "plan": "pro",
  "successUrl": "https://app.example.com/billing/success",
  "cancelUrl": "https://app.example.com/billing/cancel"
}
```

**Response:** `201 Created`
```json
{
  "sessionId": "cs_test_123",
  "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_123"
}
```

**Supported Plans:** `pro`, `enterprise`

---

#### Get Billing Portal

**POST** `/billing/portal`

Create a Stripe billing portal session.

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "returnUrl": "https://app.example.com/settings"
}
```

**Response:** `200 OK`
```json
{
  "portalUrl": "https://billing.stripe.com/session/test_123"
}
```

---

#### Get Invoices

**GET** `/billing/invoices`

Get billing invoices for user.

**Authentication:** Required (Bearer Token)

**Query Parameters:**
- `limit` (optional): Max results (default: 10, max: 100)

**Response:** `200 OK`
```json
{
  "invoices": [
    {
      "id": "in_123",
      "amount": 2900,
      "currency": "usd",
      "status": "paid",
      "date": "2024-01-15",
      "pdfUrl": "https://invoices.stripe.com/i/acct_123/test_123"
    }
  ]
}
```

---

### Webhooks Endpoints

#### Datadog Webhook

**POST** `/webhooks/datadog`

Receive alerts from Datadog monitoring.

**Headers:**
- `DD-SIGNATURE`: Datadog webhook signature

**Request Body:**
```json
{
  "alert": {
    "id": "123456",
    "title": "High error rate detected",
    "status": "alert",
    "severity": "high"
  }
}
```

**Response:** `200 OK`
```json
{
  "message": "Webhook processed successfully"
}
```

**Error Codes:** `INVALID_SIGNATURE`, `INTERNAL_SERVER_ERROR`

---

#### Stripe Webhook

**POST** `/webhooks/stripe`

Receive events from Stripe billing.

**Headers:**
- `Stripe-Signature`: Stripe webhook signature

**Supported Events:**
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Response:** `200 OK`
```json
{
  "message": "Webhook processed successfully"
}
```

**Error Codes:** `INVALID_SIGNATURE`, `INTERNAL_SERVER_ERROR`

---

## Best Practices

### 1. Token Management

- Store refresh tokens securely (e.g., HTTP-only cookies)
- Refresh access tokens before expiration
- Implement token rotation for enhanced security
- Never expose tokens in logs or error messages

### 2. API Key Security

- Treat API keys like passwords
- Rotate keys regularly
- Use separate keys for different environments
- Never commit keys to version control
- Use environment variables for key storage

### 3. Error Handling

- Always check HTTP status codes
- Parse error responses for detailed information
- Implement exponential backoff for retries
- Log errors for debugging

### 4. Rate Limiting

- Monitor rate limit headers
- Implement client-side rate limiting
- Use exponential backoff for retries
- Consider upgrading plan if limits are insufficient

### 5. Data Validation

- Validate all input before sending
- Use appropriate data types
- Respect field length limits
- Handle validation errors gracefully

---

## Code Examples

### Python

```python
import requests
import json

BASE_URL = "http://localhost:3000/api/v1"

# Login
response = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "user@example.com",
    "password": "securepassword123"
})
tokens = response.json()
access_token = tokens["accessToken"]

# Log LLM Request
headers = {"X-API-Key": "your_api_key"}
response = requests.post(f"{BASE_URL}/llm/request", 
    headers=headers,
    json={
        "prompt": "What is AI?",
        "response": "AI is artificial intelligence...",
        "model": "gpt-4",
        "latency": 1250,
        "tokens": 150
    }
)
print(response.json())
```

### JavaScript

```javascript
const BASE_URL = "http://localhost:3000/api/v1";

// Login
const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user@example.com",
    password: "securepassword123"
  })
});
const { accessToken } = await loginResponse.json();

// Log LLM Request
const logResponse = await fetch(`${BASE_URL}/llm/request`, {
  method: "POST",
  headers: {
    "X-API-Key": "your_api_key",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    prompt: "What is AI?",
    response: "AI is artificial intelligence...",
    model: "gpt-4",
    latency: 1250,
    tokens: 150
  })
});
console.log(await logResponse.json());
```

### cURL

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'

# Log LLM Request
curl -X POST http://localhost:3000/api/v1/llm/request \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is AI?",
    "response": "AI is artificial intelligence...",
    "model": "gpt-4",
    "latency": 1250,
    "tokens": 150
  }'
```

---

## Support

For API support and questions:
- Email: support@llmguard.io
- Documentation: https://docs.llmguard.io
- Status Page: https://status.llmguard.io

---

**Last Updated:** January 2024  
**API Version:** 1.0.0
