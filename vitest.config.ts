import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/__tests__.disabled/**', '**/example/**'],
    watch: false, // Disable watch mode by default
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Use single fork to reduce memory usage
      },
    },
    testTimeout: 10000, // 10 second timeout
    hookTimeout: 5000, // 5 second hook timeout
    teardownTimeout: 5000,
    isolate: false, // Disable test isolation to reduce memory usage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts', '**/*.config.*', 'dist/'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
