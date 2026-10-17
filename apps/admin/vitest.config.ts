import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// `@/*` taqsimi tsconfig.json bilan bir xil bo'lishi shart (apps/web/vitest.config.ts kabi).
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
