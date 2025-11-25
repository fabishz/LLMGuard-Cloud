import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import env from '../config/env.js';
import { InvalidTokenError, ExpiredTokenError } from './errors.js';
import { logger } from './logger.js';

/**
 * JWT payload interface
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

/**
 * Token pair interface
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Generate JWT access token (15-minute expiration)
 * @param payload - JWT payload containing user information
 * @returns Signed access token
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  try {
    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRATION,
      algorithm: 'HS256',
    } as SignOptions);
    logger.debug({ userId: payload.userId }, 'Access token generated');
    return token;
  } catch (error) {
    logger.error({ error, userId: payload.userId }, 'Failed to generate access token');
    throw new Error('Failed to generate access token');
  }
}

/**
 * Generate JWT refresh token (7-day expiration)
 * @param payload - JWT payload containing user information
 * @returns Signed refresh token
 */
export function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  try {
    const token = jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
      expiresIn: env.REFRESH_TOKEN_EXPIRATION,
      algorithm: 'HS256',
    } as SignOptions);
    logger.debug({ userId: payload.userId }, 'Refresh token generated');
    return token;
  } catch (error) {
    logger.error({ error, userId: payload.userId }, 'Failed to generate refresh token');
    throw new Error('Failed to generate refresh token');
  }
}

/**
 * Generate both access and refresh tokens
 * @param payload - JWT payload containing user information
 * @returns Token pair with both access and refresh tokens
 */
export function generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenPair {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Parse access token to get expiration time
  const decoded = jwt.decode(accessToken) as JWTPayload;
  const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 900; // 15 minutes default

  logger.debug({ userId: payload.userId }, 'Token pair generated');

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}

/**
 * Verify JWT access token
 * @param token - Token to verify
 * @returns Decoded token payload
 * @throws InvalidTokenError if token is invalid
 * @throws ExpiredTokenError if token has expired
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    const options: VerifyOptions = {
      algorithms: ['HS256'],
    };
    const decoded = jwt.verify(token, env.JWT_SECRET, options) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.debug({ error: error.message }, 'Access token expired');
      throw new ExpiredTokenError();
    }
    if (error instanceof jwt.JsonWebTokenError) {
      logger.debug({ error: error.message }, 'Invalid access token');
      throw new InvalidTokenError();
    }
    logger.error({ error }, 'Unexpected error verifying access token');
    throw new InvalidTokenError();
  }
}

/**
 * Verify JWT refresh token
 * @param token - Token to verify
 * @returns Decoded token payload
 * @throws InvalidTokenError if token is invalid
 * @throws ExpiredTokenError if token has expired
 */
export function verifyRefreshToken(token: string): JWTPayload {
  try {
    const options: VerifyOptions = {
      algorithms: ['HS256'],
    };
    const decoded = jwt.verify(token, env.REFRESH_TOKEN_SECRET, options) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.debug({ error: error.message }, 'Refresh token expired');
      throw new ExpiredTokenError();
    }
    if (error instanceof jwt.JsonWebTokenError) {
      logger.debug({ error: error.message }, 'Invalid refresh token');
      throw new InvalidTokenError();
    }
    logger.error({ error }, 'Unexpected error verifying refresh token');
    throw new InvalidTokenError();
  }
}

/**
 * Decode token without verification (for inspection only)
 * @param token - Token to decode
 * @returns Decoded token payload or null if invalid
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload | null;
  } catch (error) {
    logger.debug({ error }, 'Failed to decode token');
    return null;
  }
}

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token string or null if not found
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}
