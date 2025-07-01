import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  define: {
    'process.env.VITE_SERVER_URL': JSON.stringify(process.env.VITE_SERVER_URL || 'http://localhost:3000')
  }
})
