import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/ErrorBoundary.tsx'],
      reporter: ['text', 'json-summary'],
      thresholds: { lines: 85 },
    },
  },
});
