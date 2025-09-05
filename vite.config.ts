import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      exclude: ['**/*.test.ts', '**/*.test.tsx', 'src/test/**/*', 'examples/**/*'],
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ReactIdentityAccess',
      formats: ['es', 'cjs'],
      fileName: format => `index.${format === 'cjs' ? '' : format + '.'}js`,
    },
    rollupOptions: {
      external: id => {
        return (
          id === 'react' ||
          id === 'react-dom' ||
          id === 'react-router' ||
          id === 'react/jsx-runtime' ||
          id === 'react/jsx-dev-runtime' ||
          id.startsWith('react/') ||
          id.startsWith('react-dom/') ||
          id.startsWith('react-router/')
        );
      },
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-router': 'ReactRouter',
          'react/jsx-runtime': 'React',
          'react/jsx-dev-runtime': 'React',
        },
      },
    },
    sourcemap: true,
    minify: 'esbuild',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
