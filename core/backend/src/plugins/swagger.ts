import fp from 'fastify-plugin'
import { type FastifyInstance } from 'fastify'

export default fp(async (fastify: FastifyInstance) => {
	await fastify.register(import('@fastify/swagger'), {
		openapi: {
			openapi: '3.0.0',
			info: {
				title: 'Test swagger',
				description: 'Testing the Fastify swagger API',
				version: '0.1.0'
			},
			servers: [
				{
					url: 'http://localhost:3000',
					description: 'Development server'
				}
			],
			tags: [
				// { name: 'user', description: 'User related end-points' },
				// { name: 'code', description: 'Code related end-points' }
			],
			//   components: {
			// 	securitySchemes: {
			// 	  apiKey: {
			// 		type: 'apiKey',
			// 		name: 'apiKey',
			// 		in: 'header'
			// 	  }
			// 	}
			//   },
			externalDocs: {
				url: 'https://swagger.io',
				description: 'Find more info here'
			}
		}
	})

	await fastify.register(import('@fastify/swagger-ui'), {
		routePrefix: '/documentation',
		uiConfig: {
			docExpansion: 'full',
			deepLinking: false
		},
		uiHooks: {
			onRequest: function (request, reply, next) { next() },
			preHandler: function (request, reply, next) { next() }
		},
		staticCSP: true,
		transformStaticCSP: (header) => header,
		transformSpecification: (swaggerObject, request, reply) => { return swaggerObject },
		transformSpecificationClone: true
	})
})
