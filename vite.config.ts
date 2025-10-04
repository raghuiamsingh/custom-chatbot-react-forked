import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/chat': 'http://localhost:3001',
      '/suggestions': 'http://localhost:3001',
      '/test-structured': 'http://localhost:3001',
      '/debug-botdojo': 'http://localhost:3001',
      '/health': 'http://localhost:3001'
    }
  }
})
