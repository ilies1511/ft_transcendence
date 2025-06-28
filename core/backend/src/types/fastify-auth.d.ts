import 'fastify'
import type { FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    /**
     * Guards routes that require a valid JWT cookie.
     * Resolves normally when the token is valid,
     * otherwise the handler should have sent 401.
     */
    auth(this: FastifyInstance,
         req: FastifyRequest,
         reply: FastifyReply): Promise<void>
  }
}
