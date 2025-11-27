# API Documentation Guide

This directory contains comprehensive API documentation for the LLMGuard Cloud Backend.

## Files

### 1. **API_DOCUMENTATION.md**
Complete markdown documentation with:
- Authentication methods (JWT Bearer tokens and API keys)
- Error handling and HTTP status codes
- Rate limiting information
- Detailed endpoint documentation with request/response examples
- Best practices for API usage
- Code examples in Python, JavaScript, and cURL

**Use this file for:**
- Human-readable API reference
- Understanding authentication flows
- Learning best practices
- Quick lookup of endpoints and parameters

### 2. **openapi.json**
OpenAPI 3.0.0 specification file with:
- Complete API schema definition
- All endpoints with request/response schemas
- Security schemes (JWT Bearer and API Key)
- Reusable component schemas
- Server definitions for development and production

**Use this file for:**
- Generating API client libraries
- Importing into API documentation tools (Swagger UI, ReDoc)
- Automated testing and validation
- IDE integration and code generation

## Quick Start

### View API Documentation

1. **Markdown Format** (Recommended for reading):
   ```bash
   cat API_DOCUMENTATION.md
   ```

2. **Interactive Swagger UI** (Recommended for testing):
   - Use an online Swagger editor: https://editor.swagger.io/
   - Upload or paste the contents of `openapi.json`
   - Test endpoints directly from the UI

3. **ReDoc** (Recommended for beautiful documentation):
   - Use an online ReDoc viewer: https://redoc.ly/
   - Upload or paste the contents of `openapi.json`

### Generate API Client

Using OpenAPI Generator:

```bash
# Generate TypeScript client
openapi-generator-cli generate -i openapi.json -g typescript-axios -o ./generated-client

# Generate Python client
openapi-generator-cli generate -i openapi.json -g python -o ./generated-client

# Generate Go client
openapi-generator-cli generate -i openapi.json -g go -o ./generated-client
```

## API Overview

### Base URL
- **Development:** `http://localhost:3000/api/v1`
- **Production:** `https://api.llmguard.io/api/v1`

### Authentication Methods

1. **JWT Bearer Token** (for user-authenticated endpoints)
   ```
   Authorization: Bearer <access_token>
   ```

2. **API Key** (for project-specific endpoints)
   ```
   X-API-Key: <api_key>
   ```

### Main Endpoint Categories

| Category | Purpose | Auth |
|----------|---------|------|
| Authentication | User registration, login, token refresh | None/Bearer |
| Projects | Project and API key management | Bearer |
| LLM Requests | Log and track LLM requests | API Key |
| Incidents | Detect and manage incidents | Bearer |
| Remediation | Apply automated fixes | Bearer |
| Metrics | View usage analytics | Bearer |
| Logs | Search and filter requests | Bearer |
| Settings | User and project configuration | Bearer |
| Billing | Subscription management | Bearer |
| Webhooks | External integrations | Signature |

## Error Handling

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {},
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid credentials)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Rate Limited
- `500` - Server Error

## Rate Limiting

Rate limits vary by billing plan:

| Plan | Requests/Hour | Requests/Month |
|------|---------------|-----------------|
| Free | 100 | 10,000 |
| Pro | 1,000 | 1,000,000 |
| Enterprise | Unlimited | Unlimited |

Rate limit headers in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705318200
```

## Common Workflows

### 1. User Registration and Login

```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "name": "John Doe"
  }'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

### 2. Create Project and Get API Key

```bash
# Create project (requires Bearer token)
curl -X POST http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Project"}'

# Response includes API key - store it securely!
```

### 3. Log LLM Request

```bash
# Log request (requires API key)
curl -X POST http://localhost:3000/api/v1/llm/request \
  -H "X-API-Key: <api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is AI?",
    "response": "AI is artificial intelligence...",
    "model": "gpt-4",
    "latency": 1250,
    "tokens": 150
  }'
```

### 4. View Metrics

```bash
# Get metrics (requires Bearer token)
curl -X GET "http://localhost:3000/api/v1/metrics?projectId=<project_id>" \
  -H "Authorization: Bearer <access_token>"
```

## Integration Examples

### Python

```python
import requests

BASE_URL = "http://localhost:3000/api/v1"

# Login
response = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "user@example.com",
    "password": "password123"
})
access_token = response.json()["accessToken"]

# Create project
response = requests.post(
    f"{BASE_URL}/projects",
    headers={"Authorization": f"Bearer {access_token}"},
    json={"name": "My Project"}
)
api_key = response.json()["apiKey"]

# Log LLM request
response = requests.post(
    f"{BASE_URL}/llm/request",
    headers={"X-API-Key": api_key},
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
const loginRes = await fetch(`${BASE_URL}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user@example.com",
    password: "password123"
  })
});
const { accessToken } = await loginRes.json();

// Create project
const projectRes = await fetch(`${BASE_URL}/projects`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ name: "My Project" })
});
const { apiKey } = await projectRes.json();

// Log LLM request
const logRes = await fetch(`${BASE_URL}/llm/request`, {
  method: "POST",
  headers: {
    "X-API-Key": apiKey,
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
console.log(await logRes.json());
```

## Tools and Resources

### API Testing
- **Postman:** Import `openapi.json` for pre-built requests
- **Insomnia:** Import `openapi.json` for API testing
- **Thunder Client:** VS Code extension for API testing

### Documentation Viewers
- **Swagger UI:** https://editor.swagger.io/
- **ReDoc:** https://redoc.ly/
- **Stoplight:** https://stoplight.io/

### Code Generation
- **OpenAPI Generator:** https://openapi-generator.tech/
- **Swagger Codegen:** https://swagger.io/tools/swagger-codegen/

## Support

For questions or issues:
- Email: support@llmguard.io
- Documentation: https://docs.llmguard.io
- Status Page: https://status.llmguard.io

---

**Last Updated:** January 2024  
**API Version:** 1.0.0  
**OpenAPI Version:** 3.0.0
