import path from 'path' // <-- Required for path.resolve
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'game_shared'),
      '@': path.resolve(__dirname, 'client'), // optional but useful for client code
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true
      },
      '/game': {
        target: 'ws://localhost:3000',
        ws: true
      }
    }
  }
})


