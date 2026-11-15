import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward /api requests to the Express backend (../server.js)
    proxy: {
      '/api': 'http://localhost:5001',
    },
  },
})
