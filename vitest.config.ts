import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/__tests__.disabled/**',
      '**/example/**',
      'qa/**',
    ],
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
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90,
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
