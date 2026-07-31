import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      reportsDirectory: './coverage',
      // Scope: only the modules we have explicit unit tests for, so the
      // thresholds below act as a regression guard on the modules we own.
      // Components and pages are excluded until render tests land.
      include: [
        'src/lib/**/*.{ts,tsx}',
        'src/hooks/useLocalStorage.ts',
      ],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/lib/**/*.test.ts',
        'src/hooks/**/*.test.ts',
        'src/lib/api/index.ts',
        'src/test-setup.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },
});
