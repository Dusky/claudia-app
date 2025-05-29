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
      'src/test/security.test.ts',
      'src/utils/*.test.ts',
      'src/config/*.test.ts',
      'src/**/*security*.test.{ts,tsx}'
    ],
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/utils/contentSanitizer.ts',
        'src/utils/inputValidation.ts',
        'src/utils/csp.ts',
        'src/config/security.ts',
        'src/terminal/SecureContentRenderer.tsx'
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    },
    alias: {
      '@': resolve(__dirname, './src'),
      '@utils': resolve(__dirname, './src/utils'),
      '@config': resolve(__dirname, './src/config')
    }
  }
});