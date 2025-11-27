import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine which .env file to load based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = path.resolve(__dirname, `../../.env.${nodeEnv}`);

// Load environment variables from the appropriate .env file
dotenv.config({ path: envFile });

// Define the base environment schema
const baseEnvSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  REFRESH_TOKEN_SECRET: z.string().min(32, 'REFRESH_TOKEN_SECRET must be at least 32 characters'),
  JWT_EXPIRATION: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRATION: z.string().default('7d'),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1, 'STRIPE_PUBLISHABLE_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),

  // Datadog
  DATADOG_WEBHOOK_SECRET: z.string().min(1, 'DATADOG_WEBHOOK_SECRET is required'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // API Configuration
  API_VERSION: z.string().default('v1'),
  API_BASE_URL: z.string().min(1, 'API_BASE_URL is required'),

  // Incident Detection
  LATENCY_THRESHOLD_MS: z.coerce.number().default(5000),
  ERROR_RATE_THRESHOLD: z.coerce.number().default(0.1),
  RISK_SCORE_THRESHOLD: z.coerce.number().default(80),
  COST_SPIKE_THRESHOLD: z.coerce.number().default(1.5),

  // Model Pricing (per 1K tokens)
  GPT4_PRICE: z.coerce.number().default(0.03),
  O3_MINI_PRICE: z.coerce.number().default(0.001),
});

// Environment-specific validation schemas
const productionEnvSchema = baseEnvSchema.refine(
  (data) => {
    // In production, ensure critical values are not defaults
    const isDefaultSecret = data.JWT_SECRET.includes('prod_secret_key_minimum_32_characters_long_change_in_production');
    const isDefaultRefreshSecret = data.REFRESH_TOKEN_SECRET.includes('prod_refresh_token_secret_minimum_32_characters_long_change_in_production');
    return !isDefaultSecret && !isDefaultRefreshSecret;
  },
  {
    message: 'Production environment requires non-default JWT secrets. Update .env.production with real values.',
  }
);

const developmentEnvSchema = baseEnvSchema;
const testEnvSchema = baseEnvSchema;

// Select the appropriate schema based on environment
const getEnvSchema = (env: string) => {
  switch (env) {
    case 'production':
      return productionEnvSchema;
    case 'test':
      return testEnvSchema;
    case 'development':
    default:
      return developmentEnvSchema;
  }
};

// Parse and validate environment variables
let env: z.infer<typeof baseEnvSchema>;

try {
  const schema = getEnvSchema(nodeEnv);
  env = schema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export default env;
