import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    include: [
      'src/test/integration.test.ts',
      'src/**/*.integration.test.{ts,tsx}'
    ],
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: [
        'src/App.tsx',
        'src/commands/**/*.ts',
        'src/providers/**/*.ts',
        'src/storage/**/*.ts',
        'src/utils/**/*.ts'
      ],
      exclude: [
        'src/**/*.test.*',
        'src/test/**/*',
        'src/**/*.d.ts',
        'src/setupTests.ts'
      ],
      thresholds: {
        global: {
          branches: 60,
          functions: 60,
          lines: 60,
          statements: 60
        }
      }
    },
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});