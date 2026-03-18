import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.{ts,js,mjs}'],
    testTimeout: 15000
  }
});
