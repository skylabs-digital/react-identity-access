import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: false,
    host: 'localhost',
    port: 5173
  },
  resolve: {
    alias: {
      // Alias to use the local library source
      'react-identity-access': '../src'
    }
  }
})
