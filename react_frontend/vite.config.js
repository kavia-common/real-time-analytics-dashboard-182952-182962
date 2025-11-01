import { defineConfig } from 'vite'

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
        ws: false
      },
      // Socket.io WebSocket proxy
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
