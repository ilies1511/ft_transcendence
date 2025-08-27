import fp from 'fastify-plugin'
import { type FastifyInstance } from 'fastify'
import { fpSqlitePlugin } from 'fastify-sqlite-typed'
import { runMigrations } from '../db/db_init.js'
import path from "node:path";

const dbPath = "/app/core/backend/data/32_07.db";

export default fp(async (fastify: FastifyInstance) => {
	await fastify.register(fpSqlitePlugin, {
		// dbFilename: './data/32_07.db',     // DB-Datei
		dbFilename: dbPath,     // DB-Datei
		// driverSettings: { /* optional: verbose, cache, trace */ }
	})

	await fastify.db.exec('PRAGMA foreign_keys = ON;')
	const row = await fastify.db.get<{ foreign_keys: number }>('PRAGMA foreign_keys;')
	fastify.log.info(`SQLite foreign_keys = ${row?.foreign_keys}`)

	const fkCheck = await fastify.db.all('PRAGMA foreign_key_check;')
	if (fkCheck.length > 0) {
		fastify.log.warn({ fkCheck }, 'foreign_key_check reported issues')
	}


	await runMigrations(fastify);
})
