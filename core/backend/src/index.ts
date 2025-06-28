import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import { fpSqlitePlugin } from 'fastify-sqlite-typed'
import {GameServer} from './game/game_server.ts';
import { wsRoute } from './routes/game.ts';
import { userRoutes } from './routes/users.ts';
//Mit namespace
import * as testRoutes from './routes/test_route.ts'

async function main() {
	const fastify = Fastify({ logger: true })

	await fastify.register(websocket);

	// 2) SQLite-Typed Plugin
	await fastify.register(fpSqlitePlugin, {
		dbFilename: './data/alo.db',     // DB-Datei
		// driverSettings: { /* optional: verbose, cache, trace */ }
	  })
	await fastify.db.exec(`
		CREATE TABLE IF NOT EXISTS users (
		  id          INTEGER PRIMARY KEY AUTOINCREMENT,
		  username    TEXT    NOT NULL UNIQUE,
		  password    TEXT    NOT NULL,        -- hier speichern wir den Hash
		  email       TEXT    UNIQUE,
		  created_at  INTEGER NOT NULL         -- Timestamp als Zahl
		);
	  `)
	// 3) Routen & Game-Server
	await fastify.register(wsRoute);
	await fastify.register(testRoutes.helloRoute);
	await fastify.register(testRoutes.randomRoute);
	await fastify.register(testRoutes.test);
	await fastify.register(userRoutes);

	const game_server = new GameServer(fastify);

	await fastify.listen({ port: 3000, host: '0.0.0.0' })
	console.log('[BACK-END PART] Fastify WebSocket server running on ws://localhost:3000/ws')
}

main().catch(err => {
	// fastify.log.error(err)
	console.error(err)
	process.exit(1)
})

