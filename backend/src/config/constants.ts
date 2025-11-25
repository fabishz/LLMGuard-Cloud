// Token expiration times
export const TOKEN_EXPIRATION = {
  ACCESS: '15m',
  REFRESH: '7d',
};

// Rate limiting
export const RATE_LIMIT = {
  WINDOW_MS: 900000, // 15 minutes
  MAX_REQUESTS: 100,
};

// Incident detection thresholds
export const INCIDENT_THRESHOLDS = {
  LATENCY_MS: 5000,
  ERROR_RATE: 0.1, // 10%
  RISK_SCORE: 80,
  COST_SPIKE: 1.5, // 50% above average
  CONSECUTIVE_HIGH_RISK: 3,
};

// Risk scoring
export const RISK_SCORING = {
  MIN_SCORE: 0,
  MAX_SCORE: 100,
  PROMPT_LENGTH_THRESHOLD: 5000,
  RESPONSE_LENGTH_THRESHOLD: 10000,
  TOKEN_COUNT_THRESHOLD: 4000,
  WEIGHTS: {
    PROMPT_LENGTH: 10,
    RESPONSE_LENGTH: 10,
    SENSITIVE_KEYWORDS: 20,
    HIGH_TOKEN_COUNT: 15,
    ERROR: 25,
    MODEL_ADJUSTMENT: 5,
  },
};

// Billing plans
export const BILLING_PLANS = {
  FREE: {
    name: 'free',
    monthlyLimit: 10000,
    price: 0,
  },
  PRO: {
    name: 'pro',
    monthlyLimit: 1000000,
    price: 99,
  },
  ENTERPRISE: {
    name: 'enterprise',
    monthlyLimit: -1, // Unlimited
    price: -1, // Custom pricing
  },
};

// Model pricing (per 1K tokens)
export const MODEL_PRICING = {
  'gpt-4': 0.03,
  'gpt-4-turbo': 0.01,
  'gpt-3.5-turbo': 0.0005,
  'o3-mini': 0.001,
};

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Error codes
export const ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  EXPIRED_TOKEN: 'EXPIRED_TOKEN',
  INVALID_API_KEY: 'INVALID_API_KEY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
};

// Incident severity levels
export const INCIDENT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// Incident trigger types
export const INCIDENT_TRIGGER_TYPES = {
  LATENCY: 'latency',
  ERROR_RATE: 'error_rate',
  RISK_SCORE: 'risk_score',
  COST_SPIKE: 'cost_spike',
  WEBHOOK: 'webhook',
};

// Remediation action types
export const REMEDIATION_ACTION_TYPES = {
  SWITCH_MODEL: 'switch_model',
  INCREASE_SAFETY_THRESHOLD: 'increase_safety_threshold',
  DISABLE_ENDPOINT: 'disable_endpoint',
  RESET_SETTINGS: 'reset_settings',
  CHANGE_SYSTEM_PROMPT: 'change_system_prompt',
  RATE_LIMIT_USER: 'rate_limit_user',
};

// User roles
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
};

// Incident status
export const INCIDENT_STATUS = {
  OPEN: 'open',
  RESOLVED: 'resolved',
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1,
};

// Cron job schedules
export const CRON_SCHEDULES = {
  INCIDENT_DETECTION: '0 * * * *', // Every hour
  METRICS_AGGREGATION: '0 0 * * *', // Every day at midnight
};
