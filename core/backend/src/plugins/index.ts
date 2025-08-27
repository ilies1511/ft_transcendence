import fp from 'fastify-plugin'
import authPlugin from './auth-plugin.js'
import multipartPlugin from './multipart.js'
import websocketPlugin from './websocket.js'
import databasePlugin from './db.js'
import swaggerPlugin from './swagger.js'
import type { FastifyInstance } from 'fastify'
import googleOauth from './google-oauth.js'
import security from './security.js'

export default fp(async (fastify: FastifyInstance) => {
	await fastify.register(security);
	await fastify.register(authPlugin);
	await fastify.register(googleOauth);
	await fastify.register(multipartPlugin);
	await fastify.register(websocketPlugin);
	await fastify.register(databasePlugin);
	await fastify.register(swaggerPlugin);
})
