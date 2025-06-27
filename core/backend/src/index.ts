// import Fastify from 'fastify'
// import websocket from '@fastify/websocket'
// import type { WebSocket } from '@fastify/websocket' // <-- use 'import type'
// import {GameServer} from './game/game_server.ts';
// import sqlitePlugin from './plugins/sqlite.ts'
// import authRoutes from './auth.ts'

// const fastify = Fastify({ logger: true })

// // Register the websocket plugin BEFORE routes
// await fastify.register(websocket)

// // WebSocket echo endpoint
// fastify.get('/ws', { websocket: true }, (socket: WebSocket, req) => {
//   socket.on('message', (message: Buffer) => {
//     // Echo the received message back to the client
//     socket.send('[BACK-END PART] Server received: ' + message.toString())
//   })
// })

// // HTTP API endpoint
// fastify.get('/api/hello', async (request, reply) => {
//   return { hello: 'world' }
// })


// const game_server = new GameServer(fastify);

// // Start the server

// //game_server.start();


import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import type { WebSocket } from '@fastify/websocket'
import { GameServer } from './game/game_server.js'
import sqlitePlugin from './plugins/sqlite.js'
import authRoutes from './auth.js'

const fastify = Fastify({ logger: true })

// Register plugins
await fastify.register(websocket)
await fastify.register(sqlitePlugin)
await fastify.register(authRoutes, { prefix: '/api' })

// WebSocket echo endpoint
fastify.get('/ws', { websocket: true }, (socket: WebSocket, req) => {
	socket.on('message', (message: Buffer) => {
		socket.send('[BACK-END PART] Server received: ' + message.toString())
	})
})

// HTTP API endpoint
fastify.get('/api/hello', async (request, reply) => {
  return { hello: 'world' }
})

const game_server = new GameServer(fastify)

// Start the server
await fastify.listen({ port: 3000, host: '0.0.0.0' })

