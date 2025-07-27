import fp from 'fastify-plugin'
import { type FastifyInstance } from 'fastify'
import { fpSqlitePlugin } from 'fastify-sqlite-typed'
import { runMigrations } from '../db/db_init.ts'

export default fp(async (fastify: FastifyInstance) => {
	await fastify.register(fpSqlitePlugin, {
		dbFilename: './data/24_07.db',     // DB-Datei
		// driverSettings: { /* optional: verbose, cache, trace */ }
	})
	await runMigrations(fastify);
})
