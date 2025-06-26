import type { fastify, FastifyPluginAsync } from 'fastify'
// import websocket from '@fastify/websocket'
import type { WebSocket } from '@fastify/websocket' // <-- use 'import type'

// WebSocket echo endpoint
export const wsRoute: FastifyPluginAsync = async fastify => {
	fastify.get('/ws', { websocket: true }, (socket: WebSocket, req) => {
		socket.on('message', (message: Buffer) => {
			// Echo the received message back to the client
			socket.send('[BACK-END PART] Server received: ' + message.toString())
		})
	})
}
