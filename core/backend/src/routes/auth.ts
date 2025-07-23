// backend/src/auth.ts
import bcrypt from 'bcrypt'
// import { fastify, type FastifyInstance } from 'fastify'
import { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { DEFAULT_AVATARS } from '../constants/avatars.ts'
// backend/src/auth.ts
import { setUserLive } from '../functions/user.ts'
import { error } from 'console'
import { validateCredentials } from '../functions/2fa.ts';
import { verify2FaToken } from '../functions/2fa.ts';

const COST = 12  // bcrypt cost factor (2^12 ≈ 400 ms on laptop)

export default async function authRoutes(app: FastifyInstance) {

	app.post('/api/register', {
		schema: {
			body: {
				type: 'object',
				required: ['email', 'password', 'username'],
				properties: {
					email: { type: 'string', format: 'email' },
					password: { type: 'string', minLength: 1 }, //TODO: update minLength on production
					username: { type: 'string', minLength: 1 } //TODO: update minLength on production
				}
			}
		}
	}, async (req, reply) => {
		const { email, password, username } = req.body as {
			email: string; password: string; username: string
		}

		const hash = await bcrypt.hash(password, COST) // ← salt + hash

		const avatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)]
		// const avatar = '../../public/default_01.png';
		try {
			const { lastID } = await app.db.run(
				'INSERT INTO users (email, password, username, nickname, avatar, live) VALUES (?, ?, ?, ?, ?, ?)',
				[email, hash, username, username, avatar, false] // password stored as hash
			)
			reply.code(201).send({ userId: lastID })
		} catch (err: any) {
			// if (err.code === 'SQLITE_CONSTRAINT') {
			// 	return reply.code(409).send({ error: 'That e-mail address or username is already taken!' })
			console.error('INSERT-ERROR:', {
				code: err.code, // 'SQLITE_CONSTRAINT'
				errno: err.errno, // 19 or 1299 etc..
				message: err.message, // 'SQLITE_CONSTRAINT_NOTNULL: NOT NULL constraint failed: users.twofa_secret'
				stack: err.stack
			});
			if (err.code === 'SQLITE_CONSTRAINT') {
				if (err.message.includes('UNIQUE')) {
					return reply.code(409).send({ error: 'That e-mail address or username is already taken!' });
				}
				if (err.message.includes('NOT NULL')) {
					return reply.code(400).send({ error: 'A required field is missing: ' + err.message });
				}
			}
			throw err
		}
	})
	app.post<{
		// Body: { email: string; password: string; token: string }
		Body: { email: string; password: string }
		Reply: { ok: true } | { error: string } | { twofa_required: true }
	}>(
		'/api/login',
		{
			schema: {
				description: 'Loggt einen Benutzer ein und liefert ein HTTP-Only Cookie',
				tags: ['auth'],
				body: {
					type: 'object',
					required: ['email', 'password'],
					properties: {
						email: { type: 'string', format: 'email' },
						password: { type: 'string', minLength: 1 }
						// token: { type: 'string'}
					}
				},
				response: {
					200: {
						description: 'Erfolgreicher Login',
						type: 'object',
						properties: {
							ok: { type: 'boolean', const: true }
						}
					},
					401: {
						description: 'Invalid credentials',
						type: 'object',
						properties: {
							error: { type: 'string' }
						}
					}
				}
			}
		},
		async (req, reply) => {
			const { email, password } = req.body
			const user = await app.db.get<{
				id: number
				password: string
				username: string
				twofa_enabled: string
			}>(
				'SELECT id, password, username, twofa_enabled FROM users WHERE email = ?',
				[email]
			)

			if (!user || !(await bcrypt.compare(password, user.password))) {
				return reply.code(401).send({ error: 'invalid credentials' })
			}

			if (user.twofa_enabled) {
				// const { email, password, token } = req.body
				// const user = await validateCredentials(app, email, password)
				// if (!user) {
				// 	return reply.code(401).send({ error: 'Invalid credentials' })
				// }
				// try {
				// 	const ok = verify2FaToken(user, token)
				// 	if (!ok) {
				// 		return reply.code(401).send({ error: 'Invalid 2FA code' })
				// 	}
				// } catch (err: any) {
				// 	if (err.message === '2FA_NOT_SETUP') {
				// 		return reply.code(400).send({ error: '2FA not set up' })
				// 	}
				// 	app.log.error(err)
				// 	return reply.code(500).send({ error: 'Internal Server Error' })
				// }
				return reply.send({ twofa_required: true })
			}

			const token = await reply.jwtSign({ id: user.id, name: user.username })

			reply.setCookie('token', token, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: false // in prod auf true setzen, wenn HTTPS aktiv
			})
			setUserLive(app, user.id, true);
			return reply.send({ ok: true })
		}
	)
	// logout
	// app.post('/api/logout', async (req, reply) => {

	// 	console.log("Request LogOut: " + req);
	// 	const userId = (req.user as { id: number }).id;
	// 	// const temp_id =  parseInt(_req.body.id, 10);
	// 	setUserLive(app, userId, false);
	// 	reply.clearCookie('token', { path: '/' })
	// 	reply.send({ ok: true })
	// })
	app.post('/api/logout', async (request: FastifyRequest, reply: FastifyReply) => {
		const token = request.cookies.token;
		if (token === undefined)
			throw (error);
		try {
			const payload = await app.jwt.verify<{ id: number }>(token);
			await setUserLive(app, payload.id, false);
		} catch (err) {
			//AUth missing --> do nothing
		}
		reply.clearCookie('token', { path: '/' });
		return reply.send({ ok: true });
	});
	// TODO: When logging out, getting console log error: GET http://localhost:5173/api/me 401 (Unauthorized)
	app.get('/api/me', { preHandler: [app.auth] }, async (req: FastifyRequest) => {
		const user = await app.db.get(
			'SELECT id, username, nickname, avatar FROM users WHERE id = ?',
			[(req.user as any).id]
		)
		return user
	})

	app.post<{
		Body: { email: string; password: string; token: string }
	}>(
		'/api/login/2fa',
		{
			schema: {
				tags: ['auth'],
				body: {
					type: 'object',
					required: ['email', 'password', 'token'],
					properties: {
						email: { type: 'string', format: 'email' },
						password: { type: 'string' },
						token: { type: 'string' }
					}
				}
			}
		},
		async (req, reply) => {
			const { email, password, token } = req.body
			const user = await validateCredentials(app, email, password)
			if (!user) {
				return reply.code(401).send({ error: 'Invalid credentials' })
			}
			try {
				const ok = verify2FaToken(user, token)
				if (!ok) {
					return reply.code(401).send({ error: 'Invalid 2FA code' })
				}
			} catch (err: any) {
				if (err.message === '2FA_NOT_SETUP') {
					return reply.code(400).send({ error: '2FA not set up' })
				}
				app.log.error(err)
				return reply.code(500).send({ error: 'Internal Server Error' })
			}
			const jwt = await reply.jwtSign({ id: user.id, name: user.username })
			reply.setCookie('token', jwt, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: false // in prod auf true setzen, wenn HTTPS aktiv
			})
			setUserLive(app, user.id, true);
			return reply.send({ ok: true });
		}
	)

}
