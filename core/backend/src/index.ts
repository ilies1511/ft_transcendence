import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import { fpSqlitePlugin } from 'fastify-sqlite-typed'
import { GameServer } from './game/game_server.ts';
import { wsRoute } from './routes/game.ts';
import { userRoutes } from './routes/users.ts';
import { runMigrations } from './db/db_init.ts';
import authRoutes from './routes/auth.ts';
import authJwt from './functions/auth-jwt.ts';
//Mit namespace
import * as testRoutes from './routes/test_route.ts'

async function main() {
	const fastify = Fastify({ logger: true })

	await fastify.register(websocket);

	// 2) SQLite-Typed Plugin
	await fastify.register(fpSqlitePlugin, {
		dbFilename: './data/nick.db',     // DB-Datei
		// driverSettings: { /* optional: verbose, cache, trace */ }
	})
	await runMigrations(fastify);

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

	// 3) Routen & Game-Server
	await fastify.register(authJwt);
	await fastify.register(wsRoute);
	// await fastify.register(testRoutes.helloRoute);
	// await fastify.register(testRoutes.randomRoute);
	// await fastify.register(testRoutes.test);
	await fastify.register(userRoutes);
	await fastify.register(authRoutes);

	const game_server = new GameServer(fastify);

	await fastify.listen({ port: 3000, host: '0.0.0.0' })
	console.log('[BACK-END PART] Fastify WebSocket server running on ws://localhost:3000/ws')
}

main().catch(err => {
	// fastify.log.error(err)
	console.error(err)
	process.exit(1)
})

