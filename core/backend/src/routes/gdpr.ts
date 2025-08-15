import type { FastifyPluginAsync } from 'fastify';
import { type UpdateProfile, anonymizeUser, deleteUserAndData, getUserData, updateMyProfile } from '../functions/gdpr.ts';

export const gdprRoutes: FastifyPluginAsync = async fastify => {

	fastify.get('/api/me/data', { preHandler: [fastify.auth] }, async (req, reply) => {
		const userId = (req.user as any).id;
		const data = await getUserData(fastify, userId);
		return reply.send(data);
	});

	// fastify.get('/api/me', { preHandler: [fastify.auth] }, async (req, reply) => {
	// 	const userId = (req.user as any).id;
	// 	const data = await getUserData(fastify, userId);
	// 	return reply.send(data);
	// });

	// fastify.post('/api/me/anonymize', { preHandler: [fastify.auth] },
	fastify.post('/api/me/anonymize',
		{
			schema: {
				tags: ['gdpr'],
			}
		},
		async (req, reply) => {
			const userId = (req.user as any).id;
			await anonymizeUser(fastify, userId);
			return reply.send({ message: 'Your personal data has been anonymized.' });
		});

	// fastify.delete('/api/me',
	// 	{
	// 		preHandler: [fastify.auth],
	// 		schema: {
	// 			tags: ['gdpr'],
	// 		}
	// 	},
	// 	async (req, reply) => {
	// 		const userId = (req.user as any).id;
	// 		await deleteUserAndData(fastify, userId);
	// 		reply.clearCookie('token', { path: '/' });
	// 		return reply.send({ message: 'Your account and all associated data have been permanently deleted.' });
	// 	});

	fastify.delete('/api/me',
		{
			// preHandler: [fastify.auth],
			schema: {
				tags: ['gdpr'],
				response: {
					200: { type: 'object', properties: { message: { type: 'string' } } },
					404: { type: 'object', properties: { error: { type: 'string' } } },
					409: { type: 'object', properties: { error: { type: 'string' } } }
				}
			}
		},
		async (req, reply) => {
			const userId = (req.user as any).id
			try {
				// await deleteUserAndData(fastify, userId)
				reply.clearCookie('token', {
						path: '/',
						httpOnly: true,
						sameSite: 'lax',
						secure: false
					})
				await deleteUserAndData(fastify, userId);
				return reply.send({ message: 'Your account and all associated data have been permanently deleted.' })
			} catch (error: any) {
				if (error?.statusCode) {
					return reply.code(error.statusCode).send({ error: error.message ?? 'Error' })
				}
				throw error
			}
		}
	)

	//TODO: edit user Profile --> Add Endpoints for single changes + one for global change
	// fastify.patch('/api/me', async(req, reply)=> {

	// });
	fastify.patch<{
		Body: UpdateProfile
	}>(
		'/api/me',
		{
			schema: {
				tags: ['gdpr'],
				body: {
					type: 'object',
					minProperties: 1,
					properties: {
						username: { type: 'string', minLength: 1 },
						nickname: { type: 'string', minLength: 1 },
						email: { type: 'string', format: 'email' },
						password: { type: 'string', minLength: 8 }
					}
				},
				response: {
					200: { type: 'object', properties: { ok: { type: 'boolean' } } },
					400: { type: 'object', properties: { error: { type: 'string' } } }
				}
			}
		},
		async (req, reply) => {
			const userId = (req.user as any).id
			try {
				const ok = await updateMyProfile(fastify, userId, req.body)
				if (!ok) return reply.code(400).send({ error: 'No valid fields to update or user not found' })
				return { ok: true }
			} catch (err: any) {
				if (err.code === 'SQLITE_CONSTRAINT' && err.message.includes('users.username')) {
					return reply.code(409).send({ error: 'Username is already taken.' })
				}
				// For other potential errors, fall back to a generic 500
				fastify.log.error(err, 'Error updating profile for user ' + userId)
				return reply.code(500).send({ error: 'An internal server error occurred.' })
			}
		}
	)
};
