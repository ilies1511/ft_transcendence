import Fastify from 'fastify'
import { GameServer } from './game/new/GameServer.ts';
import plugins from './plugins/index.ts';
import routes from './routes/index.ts';

//Mit namespace
import * as testRoutes from './routes/test_route.ts'

async function main() {

	// const fastify = Fastify({ logger: true })
	const fastify = Fastify({logger: { level: 'debug' }})

	await fastify.register(plugins);
	await fastify.register(routes);
	/*
		curl -i http://localhost:3000/api/users/1/matches
		curl -i http://localhost:3000/api/users/1/stats
	 */
	// // to live ping/notify (via ws) a user, that we got friend request
	GameServer.init(fastify);

	await fastify.listen({ port: 3000, host: '0.0.0.0' })
	console.log('[BACK-END PART] Fastify WebSocket server running on ws://localhost:3000/ws')
}

main().catch(err => {
	// fastify.log.error(err)
	console.error(err)
	process.exit(1)
})
