import type { FastifyInstance } from 'fastify'

/**
 * Führt beim Serverstart alle notwendigen CREATE-TABLE-Statements aus.
 */
export async function runMigrations(fastify: FastifyInstance): Promise<void> {
	await fastify.db.exec(`
		ALTER TABLE users
		ADD COLUMN live INTEGER NOT NULL DEFAULT 0;
		`).catch(() => {
	})
	// User-table
	await fastify.db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT    NOT NULL UNIQUE,
      password    TEXT    NOT NULL,      -- hier speichern wir den Hash
      email       TEXT    UNIQUE,
      live        INTEGER NOT NULL DEFAULT 0,  -- 0 = offline, 1 = online
      created_at  INTEGER NOT NULL       -- Timestamp als Zahl
    );
  `)

	// more tables:
	// await fastify.db.exec(`CREATE TABLE IF NOT EXISTS games ( … );`)
}
