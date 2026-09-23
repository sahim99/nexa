import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['e2e/**/*.spec.ts', 'packages/**/*.spec.ts', 'apps/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'research/**'],
    testTimeout: 20000
  }
});
