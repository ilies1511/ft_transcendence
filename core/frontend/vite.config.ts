import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
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
