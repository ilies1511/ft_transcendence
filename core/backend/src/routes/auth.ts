// backend/src/auth.ts
import bcrypt from 'bcrypt';
// import { fastify, type FastifyInstance } from 'fastify'
import { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { DEFAULT_AVATARS } from '../constants/avatars.ts';
// backend/src/auth.ts
import { error } from 'console';
import { validateCredentials, verify2FaToken } from '../functions/2fa.ts';
import { setUserLive } from '../functions/user.ts';
import { login2FASchema, loginSchema, logoutSchema, RegisterBodySchema } from '../schemas/auth.ts';

const COST = 12  // bcrypt cost factor (2^12 ≈ 400 ms on laptop)

export default async function authRoutes(app: FastifyInstance) {

	app.post('/api/register', {
		// schema: {
		// 	body: {
		// 		type: 'object',
		// 		required: ['email', 'password', 'username'],
		// 		properties: {
		// 			email: { type: 'string', format: 'email' },
		// 			password: { type: 'string', minLength: 1 }, //TODO: update minLength on production
		// 			username: { type: 'string', minLength: 1 } //TODO: update minLength on production
		// 		}
		// 	}
		// }
		schema: RegisterBodySchema
	}, async (req, reply) => {
		const { email, password, username } = req.body as {
			email: string; password: string; username: string
		}

		const hash = await bcrypt.hash(password, COST) // ← salt + hash

		const avatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)]
		// const avatar = '../../public/default_01.png';
		try {
			const { lastID } = await app.db.run(
				'INSERT INTO users (email, password, username, nickname, avatar, live, is_oauth) VALUES (?, ?, ?, ?, ?, ?, ?)',
				[email, hash, username, username, avatar, false, 0] // password stored as hash
			)

			if (!lastID) {
				app.log.error('User creation succeeded but no lastID was returned.');
				return reply.code(500).send({ error: 'Internal server error during account creation.' });
			}

			//NEW REGISTERED USERS WS NOTIFICATON
			const payload = {
				type: 'user_registered',
				user: {
					id: lastID,
					username: username,
					avatar: avatar
				}
			};
			for (const client of app.websocketServer.clients) {
				if (client.readyState === WebSocket.OPEN) {
					client.send(JSON.stringify(payload));
				}
			}

			// Auto-login after registration
			const token = await reply.jwtSign({ id: lastID, name: username })
			reply.setCookie('token', token, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: false // in prod auf true setzen, wenn HTTPS aktiv
			})
			await setUserLive(app, lastID, true);
			return reply.code(201).send({ ok: true, userId: lastID })

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
			// schema: {
			// 	description: 'Loggt einen Benutzer ein und liefert ein HTTP-Only Cookie',
			// 	tags: ['auth'],
			// 	body: {
			// 		type: 'object',
			// 		required: ['email', 'password'],
			// 		properties: {
			// 			email: { type: 'string', format: 'email' },
			// 			password: { type: 'string', minLength: 1 }
			// 			// token: { type: 'string'}
			// 		}
			// 	},
			// 	response: {
			// 		200: {
			// 			description: 'Successful login or 2FA required',
			// 			type: 'object',
			// 			properties: {
			// 				ok: { type: 'boolean', const: true },
			// 				twofa_required: { type: 'boolean' }
			// 			}
			// 		},
			// 		401: {
			// 			description: 'Invalid credentials',
			// 			type: 'object',
			// 			properties: {
			// 				error: { type: 'string' }
			// 			}
			// 		}
			// 	}
			// }
			schema: loginSchema
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
				return reply.send({ twofa_required: true }) // IF true, then redirect to '/api/login/2fa'
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
	app.post('/api/logout',
		{
			schema: logoutSchema
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
		const token = request.cookies.token;
		// if (token === undefined) // ISt dieser Case sowieso nicht unmoeglich ?
		// {
		// 	console.log('TOKEN UNDIFINED!!! In /api/logout in verify Block');
		// 	throw (error);
		// }
		// try {
		// 	const payload = await app.jwt.verify<{ id: number }>(token);
		// 	console.log('TOKEN THERE !!! In /api/logout in verify Block');
		// 	console.log('TOKEN THERE !!! In /api/logout in verify Block');
		// 	console.log('TOKEN THERE !!! In /api/logout in verify Block');
		// 	await setUserLive(app, payload.id, false); // TODO: 22.08 Add ws notification to other friends
		// } catch (err) {
		// 	//AUth missing --> do nothing
		// 	console.log('ERROR Block!!! In /api/logout in verify Block');
		// }
		if (token) {
			try {
				const payload = await app.jwt.verify<{ id: number }>(token);
				console.log('TOKEN THERE !!! In /api/logout in verify Block');
				console.log('TOKEN THERE !!! In /api/logout in verify Block');
				console.log('TOKEN THERE !!! In /api/logout in verify Block');
				await setUserLive(app, payload.id, false); // TODO: 22.08 Add ws notification to other friends
			}
			catch (error) {
			}
		}
		// reply.clearCookie('token', { path: '/' }); // Needs to be replaced -> see below
		reply.clearCookie('token', {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: false
		})
		return reply.code(200).send({ ok: true });
	});
	// TODO: 22.08 When logging out, getting console log error: GET http://localhost:5173/api/me 401 (Unauthorized)
	app.get('/api/me', { preHandler: [app.auth] }, async (req: FastifyRequest) => {
		const user = await app.db.get(
			'SELECT id, username, nickname, avatar FROM users WHERE id = ?',
			[(req.user as any).id]
		)
		return user
	})

	app.post<{
		Body: { email: string; password?: string; token: string }
		Reply: { ok: true } | { error: string }
	}>(
		'/api/login/2fa',
		{
			// schema: {
			// 	tags: ['auth'],
			// 	body: {
			// 		type: 'object',
			// 		required: ['email', 'token'],
			// 		properties: {
			// 			email: { type: 'string', format: 'email' },
			// 			password: { type: 'string' },
			// 			token: { type: 'string' }
			// 		}
			// 	}
			// }
			schema: login2FASchema
		},
		async (req, reply) => {
			const { email, password, token } = req.body

			// Explicit empty string must be rejected early
			if (password === '') {
				return reply.code(401).send({ error: 'Invalid credentials' })
			}

			const user = await validateCredentials(app, email, password)
			if (!user) {
				return reply.code(401).send({ error: 'Invalid credentials or user not found' })
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
	// 		const jwt = await reply.jwtSign({ id: user.id, name: user.username })
	// 		setUserLive(app, user.id, true);
	// 		return reply
	// 			.setCookie('token', jwt, {
	// 				path: '/',
	// 				httpOnly: true,
	// 				sameSite: 'lax',
	// 				secure: false // TODO: in prod auf true setzen, wenn HTTPS aktiv
	// 			})
	// 			// .redirect('/') // TODO: to be decided with Maksim
	// 			.redirect(`http://localhost:5173/profile/${user.id}`) // TODO: to be decided with Maksim
	// 			// .send({ ok: true })
		}
	)
}
