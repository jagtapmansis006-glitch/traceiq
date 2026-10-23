import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In development, forward backend calls so the browser never makes a
// cross-origin request (no CORS setup needed).
// Override the targets with BACKEND_URL / N8N_URL if they run elsewhere.
const backend = process.env.BACKEND_URL ?? 'http://localhost:8000'
const n8n = process.env.N8N_URL ?? 'http://localhost:5678'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/health': { target: backend, changeOrigin: true },
      '/webhook': { target: n8n, changeOrigin: true },
    },
  },
})