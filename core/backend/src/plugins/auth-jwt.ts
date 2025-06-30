// backend/src/plugins/auth-jwt.ts
import fp from 'fastify-plugin'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import 'dotenv/config'                 // loads JWT_SECRET & COOKIE_SECRET from .env

export default fp(async (app) => {
	// parses & signs cookies
	await app.register(cookie, {
		secret: process.env.COOKIE_SECRET!,
		parseOptions: {}
	})

	// adds reply.jwtSign   +   request.jwtVerify
	await app.register(jwt, {
		secret: process.env.JWT_SECRET!,
		cookie: { cookieName: 'token', signed: false }
	})

  // reusable guard for protected routes
	app.decorate('auth', async (req, reply) => {
		try {
			await req.jwtVerify()
		} catch {
			reply.code(401).send({ error: 'login required' })
		}
	})
})
