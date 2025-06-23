import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	plugins: [tailwindcss()],
  server: {
	host: "0.0.0.0",
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
		rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
