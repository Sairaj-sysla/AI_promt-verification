// playwright.config.ts
import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir:   './tests',
  testMatch: ['**/*.spec.ts'],   // ← ensures VS Code finds test files
  timeout:   300000,
  retries:   0,
  workers:   1,

  reporter: [
    ['list'],
    ['html', { open: 'on-failure' }],
  ],

  use: {
    headless:   false,
    screenshot: 'only-on-failure',
    trace:      'retain-on-failure',
    video:      'retain-on-failure',
  },
});