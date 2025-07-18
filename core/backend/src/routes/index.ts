import { type FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { wsRoute } from './websocket.ts';
import authRoutes from './auth.ts';
import { userRoutes } from './users.ts';
import { friendRoutes } from './friends.ts';
import { matchRoutes } from './match.ts';
import { blockRoutes } from './block.ts';
import friendsInviteNotificationRoute from './friends_invitation.ts';
import { twoFaRoutes } from './2fa.ts';

export default fp(async(fastify: FastifyInstance) => {
	await fastify.register(wsRoute);
	await fastify.register(authRoutes);
	await fastify.register(userRoutes);
	await fastify.register(friendRoutes);
	await fastify.register(matchRoutes);
	await fastify.register(blockRoutes);
	await fastify.register(friendsInviteNotificationRoute);
	await fastify.register(twoFaRoutes);
})
