/// <reference types="vitest/config" />
// Runs only the generator below: `npx vitest run --config tools/e2e/vitest.config.ts`
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: r('../..'),
  resolve: {
    alias: { '@core': r('../../src/core'), '@editor': r('../../src/editor'), '@ui': r('../../src/ui'), '@storage': r('../../src/storage') },
  },
  test: { include: ['tools/e2e/*.gen.ts'] },
});
