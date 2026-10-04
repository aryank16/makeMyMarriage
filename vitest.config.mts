import { resolve } from 'node:path';
import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

config({ path: '.env.test', quiet: true });

export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    globalSetup: ['./tests/global-setup.ts'],
    fileParallelism: false,
    include: ['tests/**/*.test.ts'],
  },
});
