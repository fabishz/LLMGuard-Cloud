import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { logger } from './logger.js';

/**
 * Password strength validation result
 */
export interface PasswordStrengthResult {
  isValid: boolean;
  score: number; // 0-100
  feedback: string[];
}

/**
 * Password strength requirements
 */
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

/**
 * Hash a password using bcrypt
 * @param password - Plain text password to hash
 * @returns Hashed password
 * @throws Error if hashing fails
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    logger.debug('Password hashed successfully');
    return hashedPassword;
  } catch (error) {
    logger.error({ error }, 'Failed to hash password');
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against its hash
 * @param password - Plain text password to verify
 * @param hash - Hashed password to compare against
 * @returns True if password matches hash, false otherwise
 * @throws Error if verification fails
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const isMatch = await bcrypt.compare(password, hash);
    logger.debug({ isMatch }, 'Password verification completed');
    return isMatch;
  } catch (error) {
    logger.error({ error }, 'Failed to verify password');
    throw new Error('Failed to verify password');
  }
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Validation result with score and feedback
 */
export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length >= PASSWORD_REQUIREMENTS.minLength) {
    score += 20;
  } else {
    feedback.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  }

  // Check for uppercase letters
  if (PASSWORD_REQUIREMENTS.requireUppercase && /[A-Z]/.test(password)) {
    score += 20;
  } else if (PASSWORD_REQUIREMENTS.requireUppercase) {
    feedback.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letters
  if (PASSWORD_REQUIREMENTS.requireLowercase && /[a-z]/.test(password)) {
    score += 20;
  } else if (PASSWORD_REQUIREMENTS.requireLowercase) {
    feedback.push('Password must contain at least one lowercase letter');
  }

  // Check for numbers
  if (PASSWORD_REQUIREMENTS.requireNumbers && /\d/.test(password)) {
    score += 20;
  } else if (PASSWORD_REQUIREMENTS.requireNumbers) {
    feedback.push('Password must contain at least one number');
  }

  // Check for special characters
  if (PASSWORD_REQUIREMENTS.requireSpecialChars && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 20;
  } else if (PASSWORD_REQUIREMENTS.requireSpecialChars) {
    feedback.push('Password must contain at least one special character (!@#$%^&*...)');
  }

  // Bonus for length
  if (password.length >= 16) {
    score = Math.min(100, score + 10);
  }

  const isValid = feedback.length === 0;

  logger.debug({ score, isValid, feedbackCount: feedback.length }, 'Password strength validated');

  return {
    isValid,
    score,
    feedback,
  };
}

/**
 * Generate a unique API key (UUID v4 format)
 * @returns Generated API key
 */
export function generateApiKey(): string {
  const apiKey = randomUUID();
  logger.debug('API key generated');
  return apiKey;
}

/**
 * Hash an API key using bcrypt
 * @param apiKey - Plain text API key to hash
 * @returns Hashed API key
 * @throws Error if hashing fails
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  try {
    const saltRounds = 12;
    const hashedKey = await bcrypt.hash(apiKey, saltRounds);
    logger.debug('API key hashed successfully');
    return hashedKey;
  } catch (error) {
    logger.error({ error }, 'Failed to hash API key');
    throw new Error('Failed to hash API key');
  }
}

/**
 * Verify an API key against its hash
 * @param apiKey - Plain text API key to verify
 * @param hash - Hashed API key to compare against
 * @returns True if API key matches hash, false otherwise
 * @throws Error if verification fails
 */
export async function verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
  try {
    const isMatch = await bcrypt.compare(apiKey, hash);
    logger.debug({ isMatch }, 'API key verification completed');
    return isMatch;
  } catch (error) {
    logger.error({ error }, 'Failed to verify API key');
    throw new Error('Failed to verify API key');
  }
}
