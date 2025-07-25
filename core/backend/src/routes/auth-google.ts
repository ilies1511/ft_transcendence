import { type FastifyPluginAsync } from 'fastify'
import { createUser, /* Vielleicht updateUser */ } from '../functions/user.js'
import { DEFAULT_AVATARS } from '../constants/avatars.ts'
import { setUserLive } from '../functions/user.ts'

export const googleAuthRoutes: FastifyPluginAsync = async fastify => {
	// 1 /api/auth/google -> automatic redirect to GOogle (Plugin)

	// 2, Callback after Google Login --> see callbackUri in google-oauth.ts
	fastify.get('/api/auth/google/callback', async (request, reply) => {
		const tokenSet = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request)
		const userinfo = await fastify.googleOAuth2.userinfo(tokenSet.token.access_token)

		interface GoogleUser {
			sub: string;
			email: string;
			email_verified: boolean;
			name: string;
			picture: string;
		}
		const profile = userinfo as GoogleUser;

		const avatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)]

		let user = await fastify.db.get('SELECT * FROM users WHERE email = ?', profile.email)
		if (!user) {
			try {
				const info = await fastify.db.run(
					`INSERT INTO users
					(email, password, username, nickname, avatar, live)
					VALUES (?, ?, ?, ?, ?, ?)`,
					profile.email,
					// null, // no password to set since google sign in but will cause problems since in user table, column password not NULL
					'null', // TODO: no password to set since google sign in but will cause problems since in user table, column password not NULL
					profile.name,
					profile.name,
					profile.picture, // or default avatar
					0
				)
				user = { id: info.lastID, username: profile.name, email: profile.email }
			} catch (err: any) {
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
		}
		const idToken = tokenSet.token.id_token! // TODO: JWT from Google --> later
		const token = await reply.jwtSign({ id: user.id, name: user.username })
		setUserLive(fastify, user.id, true);
		return reply
			.setCookie('token', token, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: false // TODO: in prod auf true setzen, wenn HTTPS aktiv
			})
			// .redirect('/') // TODO: to be decided with Maksim
			.redirect(`http://localhost:5173/profile/${user.id}`) // TODO: to be decided with Maksim
			// .send({ ok: true })
	})
}
