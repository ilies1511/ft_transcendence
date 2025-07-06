// backend/src/auth.ts
import bcrypt from 'bcrypt'
// import { fastify, type FastifyInstance } from 'fastify'
import type { FastifyInstance } from 'fastify'
// import { DEFAULT_AVATARS } from './constants/avatars.js'
// backend/src/auth.ts

const COST = 12  // bcrypt cost factor (2^12 ≈ 400 ms on laptop)

export default async function authRoutes(app: FastifyInstance) {

	app.post('/register', {
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

		// const avatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)]

		try {
			const { lastID } = await app.db.run(
				'INSERT INTO users (email, password, username, live) VALUES (?, ?, ?, ?)',
				// 'INSERT INTO users (email, password, username, nickname, avatar) VALUES (?, ?, ?, ?, ?)',
				[email, hash, username, false] // password stored as hash
			)
			reply.code(201).send({ userId: lastID })
		} catch (err: any) {
			if (err.code === 'SQLITE_CONSTRAINT') {
				return reply.code(409).send({ error: 'That e-mail address or username is already taken!' })
			}
			throw err
		}
	})

	//GET makes more sense
	// app.get('/login', async (req, reply) => {
	// 	const { email, password } = req.body as { email: string; password: string }

	// 	const user = await app.db.get(
	// 		'SELECT id, password, username FROM users WHERE email = ?',
	// 		[email]
	// 	)

	// 	if (!user || !(await bcrypt.compare(password, user.password))) {
	// 		return reply.code(401).send({ error: 'invalid credentials' })
	// 	}

	// 	const token = await reply.jwtSign({ id: user.id, name: user.username })

	// 	reply.setCookie('token', token, {
	// 		path: '/',
	// 		httpOnly: true,
	// 		sameSite: 'lax',
	// 		secure: false // set true when you enable HTTPS
	// 	})

	// 	reply.send({ ok: true })
	// })
	app.post<{
		Body: { email: string; password: string }
		Reply: { ok: true } | { error: string }
	}>(
		'/login',
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
	app.post('/logout', async (_req, reply) => {
		reply.clearCookie('token', { path: '/' })
		reply.send({ ok: true })
	})

	// TODO: When logging out, getting console log error: GET http://localhost:5173/api/me 401 (Unauthorized)
	app.get('/me', { preHandler: app.auth }, async (req) => {
		const user = await app.db.get(
			'SELECT id, username, nickname, avatar FROM users WHERE id = ?',
			[(req.user as any).id]
		)
		return user
	})
}

// interface ExtendedWebSocket extends WebSocket {
// 	userId?: number
// 	isAlive?: boolean
// }

// export const wsRoute = async function (app: FastifyInstance) {
// 	app.get('/ws', { websocket: true }, async (socket, req) => {
// 		// 1) Token aus dem Cookie auslesen
// 		const raw = req.headers.cookie || ''
// 		const { token } = cookie.parse(raw)

// 		// 2) Token validieren und Payload holen
// 		let payload: any
// 		try {
// 			if (token === undefined)
// 				throw error
// 			// fastify.jwt.verify wirft, wenn ungültig
// 			payload = app.jwt.verify(token)
// 		} catch (err) {
// 			socket.close(1008, 'Invalid token')
// 			return
// 		}

// 		// 3) User-ID speichern
// 		const extSocket = socket as ExtendedWebSocket
// 		extSocket.userId = payload.id
// 		extSocket.isAlive = true

// 		// Setze user „live“ in der DB
// 		if (extSocket.userId === undefined) {
// 			throw error
// 		}
// 		await setUserLive(app, extSocket.userId, true)
// 		// 4) Nachrichten-Handler
// 		extSocket.on('message', (msg: Buffer) => {
// 			extSocket.send(
// 				`[BACK-END PART] Server received: ${msg.toString()}`
// 			)
// 		})

// 		// 5) Clean-up und Broadcast beim Schließen
// 		extSocket.on('close', async () => {
// 			// User als offline markieren
// 			await setUserLive(app, extSocket.userId!, false)

// 			// Freunde laden
// 			const friends = await findUserWithFriends(app, extSocket.userId!)
// 			if (!friends) {
// 				throw error(friends);
// 			}
// 			for (const client of app.websocketServer.clients) {
// 				const c = client as ExtendedWebSocket
// 				if (
// 					c.readyState === WebSocket.OPEN &&
// 					friends.friends.some(
// 						f =>
// 							(f === extSocket.userId && f === c.userId) ||
// 							(f === c.userId && f === extSocket.userId)
// 					)
// 				) {
// 					c.send(
// 						JSON.stringify({
// 							type: 'friend_status_update',
// 							friendId: extSocket.userId,
// 							online: false
// 						})
// 					)
// 				}
// 			}
// 		})
// 	})
// }


