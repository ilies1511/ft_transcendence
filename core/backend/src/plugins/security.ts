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

	// // BEGIN -- Very strict
	// await fastify.register(rateLimit, {
	// 	max: 160,
	// 	timeWindow: '1 minute',
	// 	ban: 0,
	// 	hook: 'onRequest',
	// 	allowList: ['127.0.0.1', '::1']
	// })
	// // END -- Very strict

	await fastify.register(rateLimit, {
		max: 600,
		timeWindow: '300000',
		hook: 'onRequest',
		// keyGenerator: (req) => (req.user as any).id as number ? `uid:${(req.user as any).id as number}` : req.ip
	})

	// // POST Cookie PlugIn !
	// await fastify.register(csrfProtection, {
	// 	cookieOpts: {
	// 		signed: false,
	// 		sameSite: 'lax',
	// 		path: '/',
	// 		secure: process.env.NODE_ENV === 'production',
	// 		httpOnly: true
	// 	},
	// 	getToken: (req: FastifyRequest) => req.headers['x-csrf-token'] as string
	// })
})

