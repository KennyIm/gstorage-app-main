import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(), 
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://192.168.4.65:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
