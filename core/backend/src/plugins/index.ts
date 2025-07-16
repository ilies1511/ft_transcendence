import fp from 'fastify-plugin'
import authPlugin from './auth-plugin.ts'
import multipartPlugin from './multipart.ts'
import websocketPlugin from './websocket.ts'
import databasePlugin from './db.ts'
import swaggerPlugin from './swagger.ts'
import type { FastifyInstance } from 'fastify'

export default fp(async (fastify: FastifyInstance) => {
	await fastify.register(authPlugin);
	await fastify.register(multipartPlugin);
	await fastify.register(websocketPlugin);
	await fastify.register(databasePlugin);
	await fastify.register(swaggerPlugin);
})
