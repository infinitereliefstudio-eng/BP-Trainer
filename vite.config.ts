/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// The build is a single self-contained index.html: it can be served from
// GitHub Pages under any sub-path and previewed anywhere without a server.
const pkg = JSON.parse(readFileSync(r('./package.json'), 'utf8')) as { version: string };

export default defineConfig({
  base: './',
  // Shown in Home › Sauvegarde and in Aide et gestes (src/version.ts).
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
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
