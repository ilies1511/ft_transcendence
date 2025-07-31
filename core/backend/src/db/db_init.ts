import type { FastifyInstance } from 'fastify'

export async function runMigrations(fastify: FastifyInstance): Promise<void> {

	const alters = [
		`ALTER TABLE users ADD COLUMN twofa_secret TEXT;`,
		`ALTER TABLE users ADD COLUMN twofa_enabled INTEGER NOT NULL DEFAULT 0;`
	];
	for (const sql of alters) {
		try {
			await fastify.db.exec(sql);
			fastify.log.info(`Migration success: ${sql}`);
		} catch (err) {
			fastify.log.warn(`Migration skipped or failed: ${sql}`, err);
		}
	}
	await fastify.db.exec(`
		CREATE TABLE IF NOT EXISTS users (
		id          INTEGER PRIMARY KEY AUTOINCREMENT,
		username    TEXT    NOT NULL UNIQUE,
		nickname    TEXT    NOT NULL,
		password    TEXT    NOT NULL,      -- hier speichern wir den Hash
		email       TEXT    UNIQUE,
		live        INTEGER NOT NULL DEFAULT 0,  -- 0 = offline, 1 = online
		avatar      TEXT NOT NULL,
		twofa_secret TEXT NOT NULL DEFAULT '0',
		twofa_enabled INTEGER NOT NULL DEFAULT 0,
		is_deleted INTEGER NOT NULL DEFAULT 0,
		created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
	);
	`)
	// vor created_at // status         TEXT    NOT NULL DEFAULT 'pending',  -- 'pending' now only option
	await fastify.db.exec(`
		CREATE TABLE IF NOT EXISTS friend_requests (
		id             INTEGER PRIMARY KEY AUTOINCREMENT,
		requester_id   INTEGER NOT NULL,
		recipient_id   INTEGER NOT NULL,
		created_at     INTEGER NOT NULL DEFAULT (strftime('%s','now')),
		responded_at   INTEGER,

		FOREIGN KEY(requester_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY(recipient_id) REFERENCES users(id) ON DELETE CASCADE,
		UNIQUE(requester_id, recipient_id)            -- nur eine offene/ever-Anfrage pro Paar
		);
	`)
	// await fastify.db.exec(`
	// 	CREATE TABLE IF NOT EXISTS friend_requests (
	// 	id             INTEGER PRIMARY KEY AUTOINCREMENT,
	// 	requester_id   INTEGER NOT NULL,
	// 	recipient_id   INTEGER NOT NULL,
	// 	status         TEXT    NOT NULL DEFAULT 'pending',  -- 'pending' now only option
	// 	created_at     INTEGER NOT NULL DEFAULT (strftime('%s','now')),
	// 	responded_at   INTEGER,

	// 	FOREIGN KEY(requester_id) REFERENCES users(id) ON DELETE CASCADE,
	// 	FOREIGN KEY(recipient_id) REFERENCES users(id) ON DELETE CASCADE,
	// 	UNIQUE(requester_id, recipient_id)            -- nur eine offene/ever-Anfrage pro Paar
	// 	);
	// `)

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

	// BEGIN -- Blocked Users
	await fastify.db.exec(`
		CREATE TABLE IF NOT EXISTS user_blocks(
			blocker_id INTEGER NOT NULL,
			blocked_id INTEGER NOT NULL,
			PRIMARY KEY(blocker_id, blocked_id),
			FOREIGN KEY(blocker_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY(blocked_id) REFERENCES users(id) ON DELETE CASCADE
			);
	`);
	// END -- Blocked Users
}

// // https://www.octans-solutions.fr/en/articles/sqlite-typescript
