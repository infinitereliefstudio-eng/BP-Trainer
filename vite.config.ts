/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// The build is a single self-contained index.html: it can be served from
// GitHub Pages under any sub-path and previewed anywhere without a server.
export default defineConfig({
  base: './',
  plugins: [preact(), viteSingleFile()],
  resolve: {
    alias: {
      '@core': r('./src/core'),
      '@editor': r('./src/editor'),
      '@ui': r('./src/ui'),
      '@storage': r('./src/storage'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
