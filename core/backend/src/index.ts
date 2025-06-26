import Fastify from 'fastify'
import websocket from '@fastify/websocket'
// import type { WebSocket } from '@fastify/websocket' // <-- use 'import type'
import {GameServer} from './game/game_server.ts';
import { wsRoute } from './routes/game.ts';
// import { db } from './db/db.ts';
//Mit namespace
import * as testRoutes from './routes/test_route.ts'


async function main() {
	const fastify = Fastify({ logger: true })

	await fastify.register(websocket);
	await fastify.register(wsRoute);

	await fastify.register(testRoutes.helloRoute);
	await fastify.register(testRoutes.randomRoute);
	await fastify.register(testRoutes.test);

	const game_server = new GameServer(fastify);

	await fastify.listen({ port: 3000, host: '0.0.0.0' })
	console.log('[BACK-END PART] Fastify WebSocket server running on ws://localhost:3000/ws')
}

main().catch(err => {
	// fastify.log.error(err)
	console.error(err)
	process.exit(1)
})

