import type { FastifyPluginAsync } from 'fastify';
import { anonymizeUser, deleteUserAndData, getUserData } from '../functions/gdpr.ts';
import { type UpdateProfile, updateMyProfile } from '../functions/gdpr.ts';

export const gdprRoutes: FastifyPluginAsync = async fastify => {

	fastify.get('/api/me/data', { preHandler: [fastify.auth] }, async (req, reply) => {
		const userId = (req.user as any).id;
		const data = await getUserData(fastify, userId);
		return reply.send(data);
	});

	fastify.post('/api/me/anonymize', { preHandler: [fastify.auth] },
		async (req, reply) => {
			const userId = (req.user as any).id;
			await anonymizeUser(fastify, userId);
			return reply.send({ message: 'Your personal data has been anonymized.' });
		});

	fastify.delete('/api/me', { preHandler: [fastify.auth] }, async (req, reply) => {
		const userId = (req.user as any).id;
		await deleteUserAndData(fastify, userId);
		reply.clearCookie('token', { path: '/' });
		return reply.send({ message: 'Your account and all associated data have been permanently deleted.' });
	});

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
			const ok = await updateMyProfile(fastify, userId, req.body)
			if (!ok) return reply.code(400).send({ error: 'No valid fields to update' })
			return { ok: true }
		}
	)
};
