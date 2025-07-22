import type { FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
	interface FastifyInstance {
		auth(req: FastifyRequest, reply: FastifyReply): Promise<void>
	}
}
