import type { FastifyInstance } from 'fastify'

/**
 * Führt beim Serverstart alle notwendigen CREATE-TABLE-Statements aus.
 */
export async function runMigrations(fastify: FastifyInstance): Promise<void> {
	await fastify.db.exec(`
		ALTER TABLE users
		ADD COLUMN live INTEGER NOT NULL DEFAULT 0;
		ADD COLUMN avatar TEXT NOT NULL '' ;
		`).catch(() => {
	})
	await fastify.db.exec(`
		CREATE TABLE IF NOT EXISTS users (
		id          INTEGER PRIMARY KEY AUTOINCREMENT,
		username    TEXT    NOT NULL UNIQUE,
		nickname    TEXT    NOT NULL,
		password    TEXT    NOT NULL,      -- hier speichern wir den Hash
		email       TEXT    UNIQUE,
		live        INTEGER NOT NULL DEFAULT 0,  -- 0 = offline, 1 = online
		avatar      TEXT NOT NULL,
		created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
	);
	`)

	// created_at DATETIME DEFAULT CURRENT_TIMESTAMP (Thats how it should look like.)
	// more tables:
	// await fastify.db.exec(`CREATE TABLE IF NOT EXISTS games ( … );`)

	await fastify.db.exec(`
		CREATE TABLE IF NOT EXISTS friend_requests (
		id             INTEGER PRIMARY KEY AUTOINCREMENT,
		requester_id   INTEGER NOT NULL,
		recipient_id   INTEGER NOT NULL,
		status         TEXT    NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted' | 'rejected'
		created_at     INTEGER NOT NULL,
		responded_at   INTEGER,

		FOREIGN KEY(requester_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY(recipient_id) REFERENCES users(id) ON DELETE CASCADE,
		UNIQUE(requester_id, recipient_id)            -- nur eine offene/ever-Anfrage pro Paar
		);
	  `)

	await fastify.db.exec(`
		CREATE TABLE IF NOT EXISTS friendships(
		user_id    INTEGER NOT NULL,
		friend_id  INTEGER NOT NULL,
		PRIMARY KEY(user_id, friend_id),
		FOREIGN KEY(user_id)   REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY(friend_id) REFERENCES users(id)
		);`
	)

	// BEGIN -- Match History and User Statistics
	await fastify.db.exec(`
		CREATE TABLE IF NOT EXISTS matches (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			mode        INTEGER NOT NULL,
			duration    INTEGER NOT NULL,
			created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
		);
	`);
	await fastify.db.exec(`
		CREATE TABLE IF NOT EXISTS match_participants (
			match_id   INTEGER NOT NULL,
			user_id    INTEGER NOT NULL,
			score      INTEGER NOT NULL,
			result     TEXT    NOT NULL,
			PRIMARY KEY (match_id, user_id),
			FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
			FOREIGN KEY (user_id)  REFERENCES users(id)   ON DELETE CASCADE
		);
	`);
	// END -- Match History and User Statistics
}

// // https://www.octans-solutions.fr/en/articles/sqlite-typescript
