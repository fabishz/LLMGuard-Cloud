import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Define the environment schema
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().url('Invalid DATABASE_URL'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  REFRESH_TOKEN_SECRET: z.string().min(32, 'REFRESH_TOKEN_SECRET must be at least 32 characters'),
  JWT_EXPIRATION: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRATION: z.string().default('7d'),

  // OpenAI
  OPENAI_API_KEY: z.string().startsWith('sk-', 'Invalid OPENAI_API_KEY'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'Invalid STRIPE_SECRET_KEY'),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_', 'Invalid STRIPE_PUBLISHABLE_KEY'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', 'Invalid STRIPE_WEBHOOK_SECRET'),

  // Datadog
  DATADOG_WEBHOOK_SECRET: z.string(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // API Configuration
  API_VERSION: z.string().default('v1'),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),

  // Incident Detection
  LATENCY_THRESHOLD_MS: z.coerce.number().default(5000),
  ERROR_RATE_THRESHOLD: z.coerce.number().default(0.1),
  RISK_SCORE_THRESHOLD: z.coerce.number().default(80),
  COST_SPIKE_THRESHOLD: z.coerce.number().default(1.5),

  // Model Pricing (per 1K tokens)
  GPT4_PRICE: z.coerce.number().default(0.03),
  O3_MINI_PRICE: z.coerce.number().default(0.001),
});

// Parse and validate environment variables
const env = envSchema.parse(process.env);

export default env;
