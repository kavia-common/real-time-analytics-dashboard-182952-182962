import { defineConfig } from 'vite'

/**
 * Vite dev server configuration
 * - In development (vite dev on port 3000), use relative '/api/*' and '/socket.io' paths.
 *   These are proxied to the Express backend running on port 3001 to avoid CORS issues.
 * - In production, keep using VITE_API_BASE_URL from env wherever the app consumes it.
 */
export default defineConfig({
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.kavia.ai'],
    port: 3000,
    strictPort: true,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    watch: {
      usePolling: true
    },
    proxy: {
      // REST API proxy to backend (dev only)
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: false,
        // Set secure:false to support local HTTPS tunnels/self-signed certs if used
        secure: false,
      },
      // Socket.io WebSocket proxy (dev only)
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
