import { type FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { wsRoute } from './websocket.js';
import authRoutes from './auth.js';
import { userRoutes } from './users.js';
import { friendRoutes } from './friends.js';
import { matchRoutes } from './match.js';
import { blockRoutes } from './block.js';
import { twoFaRoutes } from './2fa.js';
import { googleAuthRoutes } from './auth-google.js';
import { gdprRoutes } from './gdpr.js';

export default fp(async(fastify: FastifyInstance) => {
	await fastify.register(wsRoute);
	await fastify.register(authRoutes);
	await fastify.register(googleAuthRoutes);
	await fastify.register(userRoutes);
	await fastify.register(friendRoutes);
	await fastify.register(matchRoutes);
	await fastify.register(blockRoutes);
	await fastify.register(twoFaRoutes);
	await fastify.register(gdprRoutes);
})
