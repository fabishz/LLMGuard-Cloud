import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as authService from '../services/authService.js';
import prisma from '../config/database.js';
import { InvalidCredentialsError, ValidationError, ConflictError } from '../utils/errors.js';
import { verifyAccessToken, verifyRefreshToken } from '../utils/jwt.js';

describe('Authentication Service', () => {
  const testUser = {
    email: 'authservice@example.com',
    password: 'TestPassword123!',
    name: 'Auth Service Test',
  };

  beforeAll(async () => {
    // Clean up test user if exists
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  afterAll(async () => {
    // Clean up test user
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const response = await authService.register({
        email: testUser.email,
        password: testUser.password,
        name: testUser.name,
      });

      expect(response).toHaveProperty('user');
      expect(response).toHaveProperty('tokens');
      expect(response.user.email).toBe(testUser.email);
      expect(response.user.name).toBe(testUser.name);
      expect(response.user.role).toBe('user');
      expect(response.user).toHaveProperty('id');
      expect(response.tokens).toHaveProperty('accessToken');
      expect(response.tokens).toHaveProperty('refreshToken');
      expect(response.tokens).toHaveProperty('expiresIn');
      expect(response.tokens.expiresIn).toBeGreaterThan(0);
    });

    it('should reject registration with invalid email format', async () => {
      try {
        await authService.register({
          email: 'invalid-email',
          password: testUser.password,
        });
        expect.fail('Should have thrown ValidationError');
      } catch (error: any) {
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.statusCode).toBe(400);
      }
    });

    it('should reject registration with weak password', async () => {
      try {
        await authService.register({
          email: 'weakpass-' + Date.now() + '@example.com',
          password: 'weak',
        });
        expect.fail('Should have thrown ValidationError');
      } catch (error: any) {
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.statusCode).toBe(400);
      }
    });

    it('should reject registration with duplicate email', async () => {
      const duplicateEmail = 'duplicate-' + Date.now() + '@example.com';
      
      // First registration
      await authService.register({
        email: duplicateEmail,
        password: testUser.password,
      });

      // Second registration with same email
      try {
        await authService.register({
          email: duplicateEmail,
          password: testUser.password,
        });
        expect.fail('Should have thrown ConflictError');
      } catch (error: any) {
        expect(error.code).toBe('CONFLICT');
        expect(error.statusCode).toBe(409);
      }

      // Clean up
      await prisma.user.deleteMany({
        where: { email: duplicateEmail },
      });
    });

    it('should generate valid JWT tokens', async () => {
      const jwtEmail = 'jwttest-' + Date.now() + '@example.com';
      const response = await authService.register({
        email: jwtEmail,
        password: testUser.password,
      });

      // Verify access token is valid
      const accessPayload = verifyAccessToken(response.tokens.accessToken);
      expect(accessPayload.userId).toBe(response.user.id);
      expect(accessPayload.email).toBe(response.user.email);
      expect(accessPayload.role).toBe('user');

      // Verify refresh token is valid
      const refreshPayload = verifyRefreshToken(response.tokens.refreshToken);
      expect(refreshPayload.userId).toBe(response.user.id);
      expect(refreshPayload.email).toBe(response.user.email);

      // Clean up
      await prisma.user.deleteMany({
        where: { email: jwtEmail },
      });
    });
  });

  describe('login', () => {
    const loginTestEmail = 'login-' + Date.now() + '@example.com';

    beforeAll(async () => {
      // Create a test user for login tests
      await authService.register({
        email: loginTestEmail,
        password: testUser.password,
        name: testUser.name,
      });
    });

    afterAll(async () => {
      // Clean up login test user
      await prisma.user.deleteMany({
        where: { email: loginTestEmail },
      });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await authService.login({
        email: loginTestEmail,
        password: testUser.password,
      });

      expect(response).toHaveProperty('user');
      expect(response).toHaveProperty('tokens');
      expect(response.user.email).toBe(loginTestEmail);
      expect(response.user.name).toBe(testUser.name);
      expect(response.tokens).toHaveProperty('accessToken');
      expect(response.tokens).toHaveProperty('refreshToken');
    });

    it('should reject login with non-existent email', async () => {
      let loginFailed = false;
      try {
        await authService.login({
          email: 'nonexistent-' + Date.now() + '@example.com',
          password: testUser.password,
        });
      } catch (error: any) {
        loginFailed = true;
        expect(error).toBeDefined();
      }
      expect(loginFailed).toBe(true);
    });

    it('should reject login with invalid password', async () => {
      let loginFailed = false;
      try {
        await authService.login({
          email: loginTestEmail,
          password: 'WrongPassword123!',
        });
      } catch (error: any) {
        loginFailed = true;
        expect(error).toBeDefined();
      }
      expect(loginFailed).toBe(true);
    });

    it('should generate valid tokens on login', async () => {
      const response = await authService.login({
        email: loginTestEmail,
        password: testUser.password,
      });

      // Verify access token
      const accessPayload = verifyAccessToken(response.tokens.accessToken);
      expect(accessPayload.userId).toBe(response.user.id);
      expect(accessPayload.email).toBe(loginTestEmail);

      // Verify refresh token
      const refreshPayload = verifyRefreshToken(response.tokens.refreshToken);
      expect(refreshPayload.userId).toBe(response.user.id);
    });
  });

  describe('refreshToken', () => {
    let validRefreshToken: string;
    let userId: string;

    beforeAll(async () => {
      // Create a test user and get refresh token
      const response = await authService.register({
        email: 'refresh@example.com',
        password: testUser.password,
      });
      validRefreshToken = response.tokens.refreshToken;
      userId = response.user.id;
    });

    afterAll(async () => {
      await prisma.user.deleteMany({
        where: { email: 'refresh@example.com' },
      });
    });

    it('should refresh token successfully with valid refresh token', async () => {
      const response = await authService.refreshToken({
        refreshToken: validRefreshToken,
      });

      expect(response).toHaveProperty('user');
      expect(response).toHaveProperty('tokens');
      expect(response.user.id).toBe(userId);
      expect(response.tokens).toHaveProperty('accessToken');
      expect(response.tokens).toHaveProperty('refreshToken');
      expect(response.tokens.expiresIn).toBeGreaterThan(0);
    });

    it('should generate new valid tokens on refresh', async () => {
      const response = await authService.refreshToken({
        refreshToken: validRefreshToken,
      });

      // Verify new access token is valid
      const accessPayload = verifyAccessToken(response.tokens.accessToken);
      expect(accessPayload.userId).toBe(userId);

      // Verify new refresh token is valid
      const refreshPayload = verifyRefreshToken(response.tokens.refreshToken);
      expect(refreshPayload.userId).toBe(userId);
    });

    it('should reject refresh with invalid token', async () => {
      try {
        await authService.refreshToken({
          refreshToken: 'invalid.token.here',
        });
        expect.fail('Should have thrown InvalidCredentialsError');
      } catch (error: any) {
        expect(error.code).toBe('INVALID_CREDENTIALS');
        expect(error.statusCode).toBe(401);
      }
    });

    it('should reject refresh with malformed token', async () => {
      try {
        await authService.refreshToken({
          refreshToken: 'not-a-jwt',
        });
        expect.fail('Should have thrown InvalidCredentialsError');
      } catch (error: any) {
        expect(error.code).toBe('INVALID_CREDENTIALS');
        expect(error.statusCode).toBe(401);
      }
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const response = await authService.register({
        email: 'logout@example.com',
        password: testUser.password,
      });

      // Logout should not throw
      await expect(authService.logout(response.user.id)).resolves.toBeUndefined();

      // Clean up
      await prisma.user.deleteMany({
        where: { email: 'logout@example.com' },
      });
    });
  });

  describe('password hashing and verification', () => {
    it('should hash passwords securely', async () => {
      const hashEmail = 'hash-' + Date.now() + '@example.com';
      const response = await authService.register({
        email: hashEmail,
        password: testUser.password,
      });

      // Retrieve user from database
      const user = await prisma.user.findUnique({
        where: { id: response.user.id },
      });

      expect(user).toBeDefined();
      expect(user?.password).not.toBe(testUser.password);
      expect(user?.password).toMatch(/^\$2[aby]\$/); // bcrypt hash format

      // Clean up
      await prisma.user.deleteMany({
        where: { email: hashEmail },
      });
    });

    it('should verify correct password', async () => {
      const verifyEmail = 'verify-' + Date.now() + '@example.com';
      await authService.register({
        email: verifyEmail,
        password: testUser.password,
      });

      const response = await authService.login({
        email: verifyEmail,
        password: testUser.password,
      });

      expect(response.user.email).toBe(verifyEmail);

      // Clean up
      await prisma.user.deleteMany({
        where: { email: verifyEmail },
      });
    });

    it('should reject incorrect password', async () => {
      const incorrectEmail = 'incorrect-' + Date.now() + '@example.com';
      const registerResponse = await authService.register({
        email: incorrectEmail,
        password: testUser.password,
      });

      // Verify user was created
      expect(registerResponse.user.id).toBeDefined();

      // Attempt login with wrong password should fail
      let loginFailed = false;
      try {
        await authService.login({
          email: incorrectEmail,
          password: 'IncorrectPassword123!',
        });
      } catch (error: any) {
        loginFailed = true;
        // Verify that an error was thrown
        expect(error).toBeDefined();
      }

      expect(loginFailed).toBe(true);

      // Clean up
      await prisma.user.deleteMany({
        where: { email: incorrectEmail },
      });
    });
  });

  describe('JWT token generation and validation', () => {
    it('should generate tokens with correct expiration times', async () => {
      const tokenExpEmail = 'tokenexp-' + Date.now() + '@example.com';
      const response = await authService.register({
        email: tokenExpEmail,
        password: testUser.password,
      });

      const accessPayload = verifyAccessToken(response.tokens.accessToken);
      const refreshPayload = verifyRefreshToken(response.tokens.refreshToken);

      // Access token should expire in ~15 minutes (900 seconds)
      const accessExpiration = accessPayload.exp! - accessPayload.iat!;
      expect(accessExpiration).toBeLessThanOrEqual(900);
      expect(accessExpiration).toBeGreaterThan(890);

      // Refresh token should expire in ~7 days (604800 seconds)
      const refreshExpiration = refreshPayload.exp! - refreshPayload.iat!;
      expect(refreshExpiration).toBeLessThanOrEqual(604800);
      expect(refreshExpiration).toBeGreaterThan(604700);

      // Clean up
      await prisma.user.deleteMany({
        where: { email: tokenExpEmail },
      });
    });

    it('should include correct user information in tokens', async () => {
      const tokenInfoEmail = 'tokeninfo-' + Date.now() + '@example.com';
      const response = await authService.register({
        email: tokenInfoEmail,
        password: testUser.password,
        name: 'Token Info Test',
      });

      const accessPayload = verifyAccessToken(response.tokens.accessToken);

      expect(accessPayload.userId).toBe(response.user.id);
      expect(accessPayload.email).toBe(tokenInfoEmail);
      expect(accessPayload.role).toBe('user');

      // Clean up
      await prisma.user.deleteMany({
        where: { email: tokenInfoEmail },
      });
    });
  });
});
