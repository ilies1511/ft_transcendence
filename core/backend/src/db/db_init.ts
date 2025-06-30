import type { FastifyInstance } from 'fastify'

/**
 * Führt beim Serverstart alle notwendigen CREATE-TABLE-Statements aus.
 */
export async function runMigrations(fastify: FastifyInstance): Promise<void> {
	// User-table
	await fastify.db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT    NOT NULL UNIQUE,
      password    TEXT    NOT NULL,      -- hier speichern wir den Hash
      email       TEXT    UNIQUE,
      created_at  INTEGER NOT NULL       -- Timestamp als Zahl
    );
  `)

	// more tables:
	// await fastify.db.exec(`CREATE TABLE IF NOT EXISTS games ( … );`)
}
