// backend/src/auth.ts
import bcrypt from 'bcrypt'
// import { fastify, type FastifyInstance } from 'fastify'
import type { FastifyInstance } from 'fastify'
import { DEFAULT_AVATARS } from '../constants/avatars.ts'
// backend/src/auth.ts

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
				'INSERT INTO users (email, password, username, nickname, avatar, live, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
				[email, hash, username, username, avatar, false, Date.now()] // password stored as hash
			)
			reply.code(201).send({ userId: lastID })
		} catch (err: any) {
			if (err.code === 'SQLITE_CONSTRAINT') {
				return reply.code(409).send({ error: 'That e-mail address or username is already taken!' })
			}
			throw err
		}
	})
	app.post<{
		Body: { email: string; password: string }
		Reply: { ok: true } | { error: string }
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
			}>(
				'SELECT id, password, username FROM users WHERE email = ?',
				[email]
			)

			if (!user || !(await bcrypt.compare(password, user.password))) {
				return reply.code(401).send({ error: 'invalid credentials' })
			}

			const token = await reply.jwtSign({ id: user.id, name: user.username })

			reply.setCookie('token', token, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: false // in prod auf true setzen, wenn HTTPS aktiv
			})

			return reply.send({ ok: true })
		}
	)
	// logout
	app.post('/api/logout', async (_req, reply) => {
		reply.clearCookie('token', { path: '/' })
		reply.send({ ok: true })
	})

	// TODO: When logging out, getting console log error: GET http://localhost:5173/api/me 401 (Unauthorized)
	app.get('/api/me', { preHandler: app.auth }, async (req) => {
		const user = await app.db.get(
			'SELECT id, username, nickname, avatar FROM users WHERE id = ?',
			[(req.user as any).id]
		)
		return user
	})
}
