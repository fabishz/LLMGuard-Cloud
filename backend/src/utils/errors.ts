/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Validation error - 400 Bad Request
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error - 401 Unauthorized
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error - 403 Forbidden
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super('FORBIDDEN', message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error - 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('RESOURCE_NOT_FOUND', `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error - 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit error - 429 Too Many Requests
 */
export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(
      'RATE_LIMIT_EXCEEDED',
      'Too many requests, please try again later',
      429,
      retryAfter ? { retryAfter } : undefined
    );
    this.name = 'RateLimitError';
  }
}

/**
 * Invalid API key error - 403 Forbidden
 */
export class InvalidApiKeyError extends AppError {
  constructor() {
    super('INVALID_API_KEY', 'Invalid or expired API key', 403);
    this.name = 'InvalidApiKeyError';
  }
}

/**
 * Invalid credentials error - 401 Unauthorized
 */
export class InvalidCredentialsError extends AppError {
  constructor() {
    super('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    this.name = 'InvalidCredentialsError';
  }
}

/**
 * Expired token error - 401 Unauthorized
 */
export class ExpiredTokenError extends AppError {
  constructor() {
    super('EXPIRED_TOKEN', 'Token has expired', 401);
    this.name = 'ExpiredTokenError';
  }
}

/**
 * Invalid token error - 401 Unauthorized
 */
export class InvalidTokenError extends AppError {
  constructor() {
    super('INVALID_TOKEN', 'Invalid token', 401);
    this.name = 'InvalidTokenError';
  }
}
