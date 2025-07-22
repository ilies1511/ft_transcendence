import { type FastifyInstance } from "fastify";
import fp from 'fastify-plugin'
import multipart from '@fastify/multipart'

export default fp(async (fastify: FastifyInstance) => {
	await fastify.register(multipart, {
		limits: { fileSize: 1_000_000 }, // z.B. max. 1 MB
	})
})
