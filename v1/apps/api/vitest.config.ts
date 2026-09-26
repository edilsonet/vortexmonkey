import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: [
        'src/modules/identity/identity.policy.ts',
        'src/modules/ledger/ledger.integrity.ts',
        'src/modules/protocol/protocol.access-policy.ts',
        'src/platform/http/api-response.interceptor.ts',
        'src/platform/http/idempotency.interceptor.ts',
      ],
      reporter: ['text', 'json-summary'],
      thresholds: { lines: 85 },
    },
  },
});
