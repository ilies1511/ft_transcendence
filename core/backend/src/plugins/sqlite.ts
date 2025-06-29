// backend/src/plugins/sqlite.ts
import fp from 'fastify-plugin'
import { fpSqlitePlugin } from 'fastify-sqlite-typed'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(import.meta.url)         // ESM-safe “__dirname”
const DB_DIR  = join(here, '../', 'data')
const DB_FILE = join(DB_DIR, 'pong.db')

// 1-liner: create folder if missing
mkdirSync(DB_DIR, { recursive: true })

// Fastify plugin
export default fp(async (app) => {
  await app.register(fpSqlitePlugin, { dbFilename: DB_FILE })

  await app.db.run(`
	CREATE TABLE IF NOT EXISTS users (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		email      TEXT UNIQUE NOT NULL,
		username   TEXT UNIQUE NOT NULL,
		nickname   TEXT NOT NULL,
		password   TEXT NOT NULL,
		avatar     TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
  `)
})


