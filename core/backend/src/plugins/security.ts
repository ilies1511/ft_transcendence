import fp from 'fastify-plugin'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import csrfProtection from '@fastify/csrf-protection'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import 'dotenv/config'

export default fp(async (fastify: FastifyInstance) => {

	await fastify.register(helmet)

	// await fastify.register(cors, {
	// 	// origin: ['http://localhost:5173', 'http://localhost:3000'],
	// 	origin: '*',
	// 	credentials: true,
	// 	allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Authorization']
	// })

	// await fastify.register(rateLimit, {
	// 	max: 600,
	// 	// timeWindow: '300000',
	// 	// timeWindow: '300000',
	// 	timeWindow: '1 minute',
	// 	hook: 'onRequest',
	// })
})

