import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/ops-mro-e2e',
  test: {
    name: 'ops-mro-e2e',
    watch: false,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    globalSetup: ['src/support/global-setup.ts'],
    setupFiles: ['src/support/test-setup.ts'],
    reporters: ['default'],
  },
});
