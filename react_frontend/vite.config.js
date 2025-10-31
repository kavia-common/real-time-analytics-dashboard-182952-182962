import { defineConfig } from 'vite'

export default defineConfig(() => {
  return {
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
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          ws: false
        },
        '/socket.io': {
          target: 'http://localhost:3001',
          ws: true,
          changeOrigin: true
        }
      }
    },

    // ✅ Automatically injects all VITE_ variables into the client bundle
    envPrefix: 'VITE_'
  }
})
