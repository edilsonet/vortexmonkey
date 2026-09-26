import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/libs/util-aeronautics',
  resolve: {
    alias: {
      '@vortex/shared-dto': resolve(__dirname, '../shared-dto/src/index.ts'),
    },
  },
  test: {
    name: 'util-aeronautics',
    watch: false,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts,mjs,mts,cjs,cts,jsx,tsx}'],
    reporters: ['default'],
  },
});
