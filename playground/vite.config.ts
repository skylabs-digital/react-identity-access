import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3010,
  },
  resolve: {
    alias: {
      '@skylabs-digital/react-identity-access': path.resolve(__dirname, '../src/index.ts'),
    },
  },
});
