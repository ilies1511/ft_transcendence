// backend/src/plugins/auth-jwt.ts
import fp from 'fastify-plugin'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import 'dotenv/config'                 // loads JWT_SECRET & COOKIE_SECRET from .env
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import csrfProtection from '@fastify/csrf-protection'
import { CSRF } from '../index.ts'

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

	// POST Cookie PlugIn !
	if (CSRF) {
		await app.register(csrfProtection, {
			// cookieOpts: {
			// 	signed: false,
			// 	sameSite: 'lax',
			// 	path: '/',
			// 	secure: process.env.NODE_ENV === 'production',
			// 	httpOnly: true
			// },
			getToken: (req: FastifyRequest) => req.headers['x-csrf-token'] as string
		})
	}

	// adds reply.jwtSign   +   request.jwtVerify
	await app.register(jwt, {
		secret: process.env.JWT_SECRET!,
		cookie: { cookieName: 'token', signed: false }
	})



	// BEGIN -- HELPERS
	const openPrefixes = [
		// BEGIN -- prod
		'/api/register',
		'/api/login',
		'/api/auth/google',
		'/api/auth/google/callback',
		'/api/csrf',
		// END -- prod

		// BEGIN -- dev
		'/documentation',
		'/api/matches',
		'/api/matches_test',
		// '/api/me',
		// END -- dev
	]

	const isOpen = (url: string) => {
		const path = url.split('?')[0]
		for (const p of openPrefixes) if (path.startsWith(p)) {
			return true
		}
		return false
	}
	const isUnsafe = (m: string) => m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE'
	// END -- HELPERS

	// Tool: reusable guard for protected routes --> Singel/Individual checks by adding to schema (preHandler: [fastify.auth])
	app.decorate('auth', async (req: FastifyRequest, reply: FastifyReply) => {
		try {
			await req.jwtVerify()
		} catch {
			reply.code(401).send({ error: 'Not authenticated' })
		}
	}),
	{
		dependencies: ['@fastify/cookie']
	}

	// BEGIN -- global Hooks
	app.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
		const path = req.url.split('?')[0]

		if (openPrefixes.some(p => path.startsWith(p))) {
			return
		}
		await req.jwtVerify().catch(() => reply.code(401).send({ error: 'Not authenticated' }))
	})

	app.addHook('onRequest', async (req, reply) => {
		if (isOpen(req.url)) {
			return
		}
		await req.jwtVerify().catch(() => reply.code(401).send({ error: 'Not authenticated' }))
	})
	if (CSRF) {
		app.addHook('onRequest', (req, reply, done) => {
			if (isOpen(req.url) || !isUnsafe(req.method)) {
				return done();
			}
			app.csrfProtection(req, reply, done)
		})
	}
	// END -- global Hooks
	if (CSRF) {
		app.get('/api/csrf', async (req, reply) => {
			const token = await reply.generateCsrf()
			return { token }
		})
	}
})


/*
Back-Up: FIX(auth): remove /api/me from whitelist
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
			// BEGIN -- prod
			'/api/register',
			'/api/login',
			'/api/auth/google',
			'/api/auth/google/callback',
			// END -- prod

			// BEGIN -- dev
			'/documentation',
			'/api/matches',
			'/api/matches_test',
			// '/api/me',
			// END -- dev
		]
		const path = req.url.split('?')[0]

		if (openPrefixes.some(p => path.startsWith(p))) {
			return
		}
		await req.jwtVerify()
	})
})
	*/
