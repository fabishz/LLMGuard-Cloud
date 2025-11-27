import { describe, it, expect } from 'vitest';
import env from '../config/env.js';

describe('Environment Configuration', () => {
  it('should have NODE_ENV set', () => {
    expect(env.NODE_ENV).toBeDefined();
    expect(['development', 'production', 'test']).toContain(env.NODE_ENV);
  });

  it('should have PORT defined', () => {
    expect(env.PORT).toBeDefined();
    expect(typeof env.PORT).toBe('number');
    expect(env.PORT).toBeGreaterThan(0);
  });

  it('should have all required authentication variables', () => {
    expect(env.JWT_SECRET).toBeDefined();
    expect(env.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
    
    expect(env.REFRESH_TOKEN_SECRET).toBeDefined();
    expect(env.REFRESH_TOKEN_SECRET.length).toBeGreaterThanOrEqual(32);
    
    expect(env.JWT_EXPIRATION).toBe('15m');
    expect(env.REFRESH_TOKEN_EXPIRATION).toBe('7d');
  });

  it('should have all required database variables', () => {
    expect(env.DATABASE_URL).toBeDefined();
    expect(typeof env.DATABASE_URL).toBe('string');
    expect(env.DATABASE_URL.length).toBeGreaterThan(0);
  });

  it('should have all required external API keys', () => {
    expect(env.OPENAI_API_KEY).toBeDefined();
    expect(env.STRIPE_SECRET_KEY).toBeDefined();
    expect(env.STRIPE_PUBLISHABLE_KEY).toBeDefined();
    expect(env.STRIPE_WEBHOOK_SECRET).toBeDefined();
    expect(env.DATADOG_WEBHOOK_SECRET).toBeDefined();
  });

  it('should have correct default values', () => {
    expect(env.JWT_EXPIRATION).toBe('15m');
    expect(env.REFRESH_TOKEN_EXPIRATION).toBe('7d');
    expect(env.LATENCY_THRESHOLD_MS).toBe(5000);
    expect(env.ERROR_RATE_THRESHOLD).toBe(0.1);
    expect(env.RISK_SCORE_THRESHOLD).toBe(80);
    expect(env.COST_SPIKE_THRESHOLD).toBe(1.5);
  });

  it('should have rate limiting configuration', () => {
    expect(env.RATE_LIMIT_WINDOW_MS).toBeDefined();
    expect(typeof env.RATE_LIMIT_WINDOW_MS).toBe('number');
    expect(env.RATE_LIMIT_WINDOW_MS).toBeGreaterThan(0);
    
    expect(env.RATE_LIMIT_MAX_REQUESTS).toBeDefined();
    expect(typeof env.RATE_LIMIT_MAX_REQUESTS).toBe('number');
    expect(env.RATE_LIMIT_MAX_REQUESTS).toBeGreaterThan(0);
  });

  it('should have logging configuration', () => {
    expect(env.LOG_LEVEL).toBeDefined();
    expect(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).toContain(env.LOG_LEVEL);
  });

  it('should have CORS configuration', () => {
    expect(env.CORS_ORIGIN).toBeDefined();
    expect(typeof env.CORS_ORIGIN).toBe('string');
  });

  it('should have API configuration', () => {
    expect(env.API_VERSION).toBeDefined();
    expect(env.API_BASE_URL).toBeDefined();
    expect(typeof env.API_BASE_URL).toBe('string');
  });

  it('should have model pricing configuration', () => {
    expect(env.GPT4_PRICE).toBeDefined();
    expect(typeof env.GPT4_PRICE).toBe('number');
    expect(env.GPT4_PRICE).toBeGreaterThan(0);
    
    expect(env.O3_MINI_PRICE).toBeDefined();
    expect(typeof env.O3_MINI_PRICE).toBe('number');
    expect(env.O3_MINI_PRICE).toBeGreaterThan(0);
  });
});
