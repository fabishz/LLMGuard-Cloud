import prisma from '../config/database.js';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/crypto.js';
import { generateTokenPair, TokenPair, verifyRefreshToken } from '../utils/jwt.js';
import { InvalidCredentialsError, ValidationError, ConflictError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Registration request payload
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Refresh token request payload
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
  tokens: TokenPair;
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns True if email is valid
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Register a new user
 * @param request - Registration request with email, password, and optional name
 * @returns Authentication response with user and tokens
 * @throws ValidationError if input is invalid
 * @throws ConflictError if email already exists
 */
export async function register(request: RegisterRequest): Promise<AuthResponse> {
  const { email, password, name } = request;

  // Validate email format
  if (!isValidEmail(email)) {
    logger.warn({ email }, 'Invalid email format');
    throw new ValidationError('Invalid email format', { field: 'email' });
  }

  // Validate password strength
  const passwordStrength = validatePasswordStrength(password);
  if (!passwordStrength.isValid) {
    logger.warn({ email, feedback: passwordStrength.feedback }, 'Password does not meet strength requirements');
    throw new ValidationError('Password does not meet strength requirements', {
      field: 'password',
      feedback: passwordStrength.feedback,
    });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    logger.warn({ email }, 'User already exists');
    throw new ConflictError('Email already registered');
  }

  try {
    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        role: 'user',
      },
    });

    // Create billing record for new user
    await prisma.billing.create({
      data: {
        userId: user.id,
        plan: 'free',
        monthlyLimit: 10000,
      },
    });

    // Create user settings
    await prisma.userSettings.create({
      data: {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    logger.info({ userId: user.id, email: user.email }, 'User registered successfully');

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role as 'user' | 'admin',
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role,
      },
      tokens,
    };
  } catch (error) {
    if (error instanceof ConflictError || error instanceof ValidationError) {
      throw error;
    }
    logger.error({ error, email }, 'Failed to register user');
    throw new Error('Failed to register user');
  }
}

/**
 * Login user with email and password
 * @param request - Login request with email and password
 * @returns Authentication response with user and tokens
 * @throws InvalidCredentialsError if credentials are invalid
 */
export async function login(request: LoginRequest): Promise<AuthResponse> {
  const { email, password } = request;

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      logger.warn({ email }, 'Login attempt with non-existent email');
      throw new InvalidCredentialsError();
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      logger.warn({ userId: user.id, email }, 'Login attempt with invalid password');
      throw new InvalidCredentialsError();
    }

    logger.info({ userId: user.id, email }, 'User logged in successfully');

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role as 'user' | 'admin',
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role,
      },
      tokens,
    };
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      throw error;
    }
    logger.error({ error, email }, 'Failed to login user');
    throw new Error('Failed to login user');
  }
}

/**
 * Refresh access token using refresh token
 * @param request - Refresh token request
 * @returns Authentication response with new tokens
 * @throws InvalidCredentialsError if refresh token is invalid or expired
 */
export async function refreshToken(request: RefreshTokenRequest): Promise<AuthResponse> {
  const { refreshToken } = request;

  try {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      logger.warn({ userId: payload.userId }, 'Refresh token for non-existent user');
      throw new InvalidCredentialsError();
    }

    logger.info({ userId: user.id }, 'Token refreshed successfully');

    // Generate new token pair
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role as 'user' | 'admin',
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role,
      },
      tokens,
    };
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      throw error;
    }
    logger.error({ error }, 'Failed to refresh token');
    throw new InvalidCredentialsError();
  }
}

/**
 * Logout user (invalidate session)
 * Note: In a stateless JWT system, logout is typically handled on the client side
 * by discarding tokens. This function can be used for logging purposes or
 * to implement token blacklisting if needed in the future.
 * @param userId - User ID to logout
 */
export async function logout(userId: string): Promise<void> {
  try {
    logger.info({ userId }, 'User logged out');
    // In a stateless JWT system, logout is handled client-side
    // This function is here for future token blacklisting implementation
  } catch (error) {
    logger.error({ error, userId }, 'Failed to logout user');
    throw new Error('Failed to logout user');
  }
}
