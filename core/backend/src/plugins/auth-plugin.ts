import fp from 'fastify-plugin'
import fastify, { type FastifyInstance } from 'fastify'
import authJwt from '../functions/auth-jwt.ts';
import authRoutes from '../routes/auth.ts';

export default fp(async(fastify: FastifyInstance) => {
	await fastify.register(authJwt);
})
