import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

config({ path: '.env.test', quiet: true });

export default defineConfig({
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
  test: {
    environment: 'node',
    globalSetup: ['./tests/global-setup.ts'],
    fileParallelism: false,
    include: ['tests/**/*.test.ts'],
  },
});
