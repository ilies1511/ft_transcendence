// backend/src/plugins/auth-jwt.ts
import fp from 'fastify-plugin'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import 'dotenv/config'                 // loads JWT_SECRET & COOKIE_SECRET from .env
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

export default fp(async (app: FastifyInstance) => {
	// parses & signs cookies
	await app.register(cookie, {
		secret: process.env.COOKIE_SECRET!,
		parseOptions: {}
		// parseOptions: {
		// 	httpOnly: true,
		// 	secure: process.env.NODE_ENV === 'production',
		// 	sameSite: 'lax',
		// 	path: '/'
		// }
	})

	// adds reply.jwtSign   +   request.jwtVerify
	await app.register(jwt, {
		secret: process.env.JWT_SECRET!,
		cookie: { cookieName: 'token', signed: false }
	})

	// reusable guard for protected routes
	app.decorate('auth', async (req: FastifyRequest, reply: FastifyReply) => {
		try {
			await req.jwtVerify()
		} catch {
			// reply.code(401).send({ error: 'login required' })
			reply.code(401).send({ error: 'Not authenticated' })
		}
	}),
	{
		dependencies: ['@fastify/cookie']
	}
	app.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
		const openPrefixes = [
			'/api/register',
			'/api/login',
			'/api/auth/google',
			'/api/auth/google/callback',
			'/api/matches',
			'/documentation',
			'/terms',
			'/privacy'
		]
		const path = req.url.split('?')[0]

		if (openPrefixes.some(p => path.startsWith(p))) {
			return
		}
		await req.jwtVerify()
	})
})
