import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: [],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
