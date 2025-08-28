import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance, FastifyRequest } from 'fastify'

export default fp(async (fastify: FastifyInstance) => {
	await fastify.register(rateLimit, {
		hook: 'preHandler',
		timeWindow: '1 minute',
		max: 600,

		keyGenerator: (req: FastifyRequest) => {
			const u = (req as any).user
			if (u && u.id != null) return `uid:${u.id}`
			return `ip:${req.ip}`
		},
	})
})

// await fastify.register(rateLimit, {
// 	max: 600,
// 	// timeWindow: '300000',
// 	// timeWindow: '300000',
// 	timeWindow: '1 minute',
// 	hook: 'onRequest',
// 	// keyGenerator: (req) => (req.user as any).id as number ? `uid:${(req.user as any).id as number}` : req.ip
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

