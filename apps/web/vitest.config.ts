import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    // middleware.ts импортирует сгенерированный lib/generated/product-slugs.ts,
    // а его в git нет. Сетап пишет его до того, как воркеры начнут
    // импортировать файлы тестов, поэтому globalSetup, а не setupFiles.
    globalSetup: './vitest.global-setup.ts',
    setupFiles: './vitest.setup.ts',
    globals: true,
    exclude: [
      'e2e/**',
      'gradient-archive/**',
      'node_modules/**',
      'dist/**',
      '.next/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
});
