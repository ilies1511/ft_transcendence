import path from 'path' // <-- Required for path.resolve
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
	plugins: [tailwindcss()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'client'), // optional but useful for client code
		}
	},
	build: {
		target: 'es2022',
	},
	esbuild: { // REMOVES CONSOLE, DEBUGGER LOGS FROM PRODUCTION
		drop: mode === 'production' ? ['console', 'debugger'] : [],
		// pure: mode === 'production' ? ['console.log'] : [],
	},
	server: {
		// host: "0.0.0.0",
		headers: {
			// never cache anything during dev
			'Cache-Control': 'no-store',
		},
		host: true,
		port: 5173,
		allowedHosts: ['2-h-5.42heilbronn.de', '2-h-9.42heilbronn.de'],
		proxy: {
			'/api': { target: 'http://localhost:3000', changeOrigin: true, secure: false },

			'/ws':         { target: 'ws://localhost:3000', ws: true, changeOrigin: true },
			'/game':       { target: 'ws://localhost:3000', ws: true, changeOrigin: true },
			'/tournament': { target: 'ws://localhost:3000', ws: true, changeOrigin: true },

			'/avatars': 'http://localhost:3000',
		}
		//proxy: {
		//	'/api': {
		//		target: 'http://localhost:3000',
		//		changeOrigin: true,
		//		secure: false
		//	},
		//	'/ws': {
		//		target: 'ws://localhost:3000',
		//		ws: true
		//	},
		//	'/game': {
		//		target: 'ws://localhost:3000',
		//		ws: true
		//	},
		//	'/tournament': {
		//		target: 'ws://localhost:3000',
		//		ws: true
		//	},
		//	'/friends': {
		//		target: 'ws://localhost:3000',
		//		ws: true
		//	},
		//	'/avatars': 'http://localhost:3000',
		//}
	}
}))



