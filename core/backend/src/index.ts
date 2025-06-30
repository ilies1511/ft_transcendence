// backend/src/index.ts
import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import type { WebSocket } from '@fastify/websocket' // <-- use 'import type'
// import {GameServer} from './game/game_server.ts';
// import sqlitePlugin from './plugins/sqlite.ts'
// import authRoutes from './auth.ts'
import sqlitePlugin from './plugins/sqlite.js'
import authRoutes from './auth.js'
import usersRoute from './routes/users.js'
import authJwtPlugin from './plugins/auth-jwt.js'
import multipart from '@fastify/multipart' // for uploading images/avatars

import staticPlugin from '@fastify/static'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// const fastify = Fastify({ logger: true })
const fastify = Fastify({
	logger: { level: 'warn' }   // or 'error' / 'fatal'
})


await fastify.register(websocket)
await fastify.register(sqlitePlugin)
await fastify.register(authJwtPlugin)

await fastify.register(multipart, {
	limits: { fileSize: 1 * 1024 * 1024 }
	// 1MB TODO: Not sure if this the case, need to retest
})

await fastify.register(authRoutes, { prefix: '/api' })
await fastify.register(usersRoute, { prefix: '/api' })



// might to redo, kinda wierd thing is happening. Its for servig avatars files for users.
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

fastify.register(staticPlugin, {
	root: path.join(__dirname, '../public/avatars'),
	prefix: '/avatars/'
})

// WebSocket echo endpoint
fastify.get('/ws', { websocket: true }, (socket: WebSocket, req) => {
	socket.on('message', (message: Buffer) => {
		// Echo the received message back to the client
		socket.send('[BACK-END PART] Server received: ' + message.toString())
	})
})

// HTTP API endpoint
fastify.get('/api/hello', async (request, reply) => {
	return { hello: 'world' }
})


// const game_server = new GameServer(fastify);

// Start the server

//game_server.start();

await fastify.listen({ port: 3000, host: '0.0.0.0' })
