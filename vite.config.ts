/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// The build is a single self-contained index.html: it can be served from
// GitHub Pages under any sub-path and previewed anywhere without a server.
const pkg = JSON.parse(readFileSync(r('./package.json'), 'utf8')) as { version: string };

const buildDate = new Date().toISOString().slice(0, 10);

/** Writes version.json next to index.html: the running app compares it with its own (src/updates.ts). */
const versionFile = (): Plugin => ({
  name: 'bp-trainer-version-file',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: pkg.version, built: buildDate }) });
  },
});

export default defineConfig({
  base: './',
  // Shown in Home › Sauvegarde and in Aide et gestes (src/version.ts).
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  plugins: [preact(), viteSingleFile(), versionFile()],
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
