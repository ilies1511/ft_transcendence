// import { defineConfig } from 'vite';

// export default defineConfig({
//   plugins: [],
//   server: {
// 	host: "0.0.0.0",
//     port: 3001,
//     proxy: {
//       '/api': {
//         target: 'http://localhost:3000',
//         changeOrigin: true,
//         secure: false,
// 		rewrite: (path) => path.replace(/^\/api/, '')
//       }
//     }
//   }
// });


import path from 'path' // <-- Required for path.resolve
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client'), // optional but useful for client code
    }
  },
  server: {
    // host: "0.0.0.0",
	host: true,
    port: 5173,
	// allowedHosts: ['2-i-4.42heilbronn.de', ],
    proxy: {
      '/api': {
			target: 'http://localhost:3000',
	  		changeOrigin: true,
           secure: false
	  },
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


