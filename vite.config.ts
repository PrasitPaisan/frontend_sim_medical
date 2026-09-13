import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forwards any /api/* request from the Vite dev server to backend-sim
      // (port from backend-sim/.env's PORT, defaults to 3001 there) —
      // stripping the /api prefix since backend-sim's own routes have none
      // (e.g. /prescriptions, /machine/...). Keeps frontend/backend on the
      // same origin in dev so no CORS round-trip is needed at all.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
