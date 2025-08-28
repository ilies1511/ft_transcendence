import fp from 'fastify-plugin'
import fastify, { type FastifyInstance } from 'fastify'
import authJwt from '../functions/auth-jwt.js';
import authRoutes from '../routes/auth.js';

export default fp(async(fastify: FastifyInstance) => {
	await fastify.register(authJwt);
})
