import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3737',
    headless: true,
  },
  webServer: {
    command: 'node server/index.js',
    port: 3737,
    reuseExistingServer: true,
  },
});
