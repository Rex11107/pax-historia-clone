import { defineConfig } from 'vitest/config';

// base relativo: lo stesso build funziona su GitHub Pages (/<repo>/) e dentro l'APK.
export default defineConfig({
  base: './',
  build: { outDir: 'dist', target: 'es2020', chunkSizeWarningLimit: 1500 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
