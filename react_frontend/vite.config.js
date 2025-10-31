import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Load the environment variables from .env.production or .env
  const env = loadEnv(mode, process.cwd(), 'VITE_')

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
