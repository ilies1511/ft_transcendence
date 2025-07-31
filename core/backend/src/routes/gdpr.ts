import type { FastifyPluginAsync } from 'fastify';
import { anonymizeUser, deleteUserAndData, getUserData } from '../functions/gdpr.ts';

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
};
