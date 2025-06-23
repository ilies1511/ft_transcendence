// import fastify from 'fastify'
// import {GameServer} from './game/game_server';
// import websocket from '@fastify/websocket'
// import type { WebSocket } from '@fastify/websocket' // <-- use 'import type'

// const server = fastify()

// // server.get('/api/ping', async (request, reply)

// server.get('/ping', async (request, reply) => {
//   return 'pong\n'
// })

// const game_server = new GameServer(server);

// server.listen({ port: 3000, host: '0.0.0.0'}, (err, address) => {
//   if (err) {
//     console.error(err)
//     process.exit(1)
//   }
//   console.log(`Server listening at ${address}`)
// })




import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import type { WebSocket } from '@fastify/websocket' // <-- use 'import type'
import {GameServer} from './game/game_server';

const fastify = Fastify({ logger: true })

// Register the websocket plugin BEFORE routes
fastify.register(websocket)

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

// // HTTP API endpoint
// fastify.get('/api/game', async (request, reply) => {
//   return { hello: 'Alooooo' }
// })

const game_server = new GameServer(fastify);

// Start the server
try {
  fastify.listen({ port: 3000 })
  console.log('[BACK-END PART] Fastify WebSocket server running on ws://localhost:3000/ws')
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}

//game_server.start();

