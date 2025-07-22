import { type FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import websocket from '@fastify/websocket'
import { wsRoute } from '../routes/websocket.ts'

export default fp(async (fastify: FastifyInstance) => {
	await fastify.register(websocket)
	// await fastify.register(wsRoute);
})
