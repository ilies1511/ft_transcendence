import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt'

export async function getUserData(fastify: FastifyInstance, userId: number) {
	const row = await fastify.db.get(
		`SELECT id, username, nickname, email, avatar, created_at FROM users
		WHERE id = ? AND is_deleted = 0`, userId);
	return row;
}

export async function anonymizeUser(fastify: FastifyInstance, userId: number) {
	const pseudo = `anonymous_user_${userId}`;
	// const pseudo = `deleted_user_${userId}`;
	await fastify.db.run(
		`UPDATE users SET
		username	= ?,
		nickname	= ?,
		email		= NULL,
		avatar		= '',
		password	= '',
		is_deleted	= 1
		WHERE id = ?`,
		pseudo, pseudo, userId
	);

}
//// Old
// export async function deleteUserAndData(fastify: FastifyInstance, userId: number) {
// 	await fastify.db.run(
// 		`DELETE FROM users WHERE id = ?`,
// 		userId
// 	);
// }

//// NEWWW: Refined with ROLLBACK
// export async function deleteUserAndData(fastify: FastifyInstance, userId: number) {
// 	await fastify.db.exec('BEGIN;')
// 	try {
// 		await fastify.db.run(`DELETE FROM users WHERE id = ?`, userId)
// 		await fastify.db.exec('COMMIT;')
// 	} catch (e) {
// 		await fastify.db.exec('ROLLBACK;')
// 		throw e
// 	}
// }

export async function deleteUserAndData(fastify: FastifyInstance, userId: number) {
	await fastify.db.exec('SAVEPOINT delete_user;')
	try {
		const info = await fastify.db.run(`DELETE FROM users WHERE id = ?`, userId)
		if ((info.changes ?? 0) === 0) {
			await fastify.db.exec('ROLLBACK TO SAVEPOINT delete_user;')
			await fastify.db.exec('RELEASE SAVEPOINT delete_user;')
			const err: any = new Error('User not found')
			err.statusCode = 404
			throw err
		}
		await fastify.db.exec('RELEASE SAVEPOINT delete_user;')
	}
	catch (e: any) {
		try { await fastify.db.exec('ROLLBACK TO SAVEPOINT delete_user;') } catch { }
		try { await fastify.db.exec('RELEASE SAVEPOINT delete_user;') } catch { }

		if (e?.code === 'SQLITE_CONSTRAINT') {
			e.statusCode = e.statusCode ?? 409
			e.message = e.message ?? 'Foreign key constraint failed'
		}
		throw e
	}
}

export interface UpdateProfile {
	username?: string
	nickname?: string
	email?: string
	password?: string
	currentPassword?: string
}

// // BEGIN -- pre 16.08 Version
// export async function updateMyProfile(
// 	fastify: FastifyInstance,
// 	userId: number,
// 	data: UpdateProfile
// ): Promise<boolean> {
// 	const updates: string[] = []
// 	const values: unknown[] = []

// 	if (data.username) {
// 		updates.push('username = ?')
// 		values.push(data.username)
// 	}
// 	if (data.nickname) {
// 		updates.push('nickname = ?')
// 		values.push(data.nickname)
// 	}
// 	if (data.email) {
// 		updates.push('email = ?')
// 		values.push(data.email)
// 	}
// 	//TODO: 15.08 Add additional check
// 	if (data.password) {
// 		if ((await bcrypt.compare(data.password, user.password))) {
// 			// return reply.code(401).send({ error: 'invalid credentials' })
// 			const hash = await bcrypt.hash(data.password, 12)
// 			updates.push('password = ?')
// 			values.push(hash)
// 		}
// 	}

// 	if (updates.length === 0) {
// 		return false
// 	}

// 	values.push(userId)
// 	const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND is_deleted = 0`
// 	const info = await fastify.db.run(sql, ...values)
// 	return (info.changes ?? 0) > 0
// }
// // END -- pre 16.08 Version

export async function updateMyProfile(
	fastify: FastifyInstance,
	userId: number,
	data: UpdateProfile
): Promise<boolean> {
	const updates: string[] = []
	const values: unknown[] = []

	const user = await fastify.db.get<{ password: string | null; is_oauth?: number }>(
		'SELECT password, is_oauth FROM users WHERE id = ? AND is_deleted = 0',
		userId
	)
	if (!user) return false

	if (data.username) { updates.push('username = ?'); values.push(data.username) }
	if (data.nickname) { updates.push('nickname = ?'); values.push(data.nickname) }
	if (data.email) { updates.push('email = ?'); values.push(data.email) }

	if (typeof data.password === 'string') {
		if (!data.currentPassword) {
			const e: any = new Error('current password required'); e.code = 'CURRENT_PASSWORD_REQUIRED'; throw e
		}
		if (!user.password) {
			const e: any = new Error('no local password'); e.code = 'NO_LOCAL_PASSWORD'; throw e
		}
		const currentOk = await bcrypt.compare(data.currentPassword, user.password)
		if (!currentOk) {
			const e: any = new Error('invalid current password'); e.code = 'INVALID_CURRENT_PASSWORD'; throw e
		}
		const sameAsOld = await bcrypt.compare(data.password, user.password)
		if (sameAsOld) {
			const e: any = new Error('new password equals old'); e.code = 'PASSWORD_UNCHANGED'; throw e
		}
		const hash = await bcrypt.hash(data.password, 12)
		updates.push('password = ?'); values.push(hash)
		// optional: Passwortwechselzeitpunkt speichern, wenn Spalte vorhanden ist
		// updates.push('password_changed_at = ?'); values.push(Date.now())
		// optional: Sessions invalidieren, wenn Spalte vorhanden ist
		// updates.push('token_version = COALESCE(token_version, 0) + 1')
	}

	if (updates.length === 0) {
		return false
	}

	values.push(userId)
	const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND is_deleted = 0`
	const info = await fastify.db.run(sql, ...values)
	return (info.changes ?? 0) > 0
}


export type UserExport = {
	generated_at: string
	user: any
	privacy: { includeOtherUsers: boolean, includeMedia: boolean }
	profile: {
		id: number
		username: string
		nickname: string
		email: string | null
		avatar: string | null
		twofa_enabled: number
		is_oauth: number
		created_at: number
	} | null
	friendships: { friend_ids: number[] }
	friend_requests: {
		sent: Array<{ recipient_id: number; created_at: number; responded_at: number | null }>
		received: Array<{ requester_id: number; created_at: number; responded_at: number | null }>
	}
	blocks: {
		blocked_ids: number[]
		blocked_by_ids: number[]
	}
	matches: {
		count: number
		items: Array<{
			match: { id: number; mode: number; duration: number; created_at: number }
			score: number
			result: 'win' | 'loss' | 'draw'
		}>
	}
}

export async function collectUserExport(
	fastify: FastifyInstance,
	userId: number,
	opts: { includeOtherUsers?: boolean; includeMedia?: boolean } = {}
): Promise<UserExport> {

	const includeOtherUsers = !!opts.includeOtherUsers
	const includeMedia = !!opts.includeMedia

	await fastify.db.exec('SAVEPOINT export_user;')
	try {
		const profile = await fastify.db.get<any>(
			`SELECT id, username, nickname, email, avatar, twofa_enabled, \
			is_oauth, created_at FROM users WHERE id = ? AND is_deleted = 0`, userId)

		const friends = await fastify.db.all<{ friend_id: number }[]>(
			`SELECT friend_id FROM friendships WHERE user_id = ?`, userId)

		const sent = await fastify.db.all<{ recipient_id: number; created_at: number; responded_at: number | null }[]>(
			`SELECT recipient_id, created_at, responded_at FROM friend_requests \
			WHERE requester_id = ?`, userId)

		const received = await fastify.db.all<{ requester_id: number; created_at: number; responded_at: number | null }[]>(
			`SELECT requester_id, created_at, responded_at FROM friend_requests \
			WHERE recipient_id = ?`, userId)

		const blocksOut = await fastify.db.all<{ blocked_id: number }[]>(
			`SELECT blocked_id FROM user_blocks WHERE blocker_id = ?`, userId)
		const blocksIn = await fastify.db.all<{ blocker_id: number }[]>(
			`SELECT blocker_id FROM user_blocks WHERE blocked_id = ?`, userId)

		const rows = await fastify.db.all<any[]>(
			`SELECT m.id AS match_id, m.mode, m.duration, m.created_at, p.score, p.result
			FROM matches m JOIN match_participants p ON m.id = p.match_id
			WHERE p.user_id = ? ORDER BY m.created_at DESC`, userId)

		await fastify.db.exec('RELEASE SAVEPOINT export_user;')

		return {
			generated_at: new Date().toISOString(),
			user: { id: userId },
			privacy: { includeOtherUsers, includeMedia },
			profile: profile || null,
			friendships: { friend_ids: friends.map(f => f.friend_id) },
			friend_requests: { sent, received },
			blocks: {
				blocked_ids: blocksOut.map(b => b.blocked_id),
				blocked_by_ids: blocksIn.map(b => b.blocker_id)
			},
			matches: {
				count: rows.length,
				items: rows.map(r => ({
					match: { id: r.match_id, mode: r.mode, duration: r.duration, created_at: r.created_at },
					score: r.score,
					result: r.result as 'win' | 'loss' | 'draw'
				}))
			}
		}
	} catch (e) {
		try { await fastify.db.exec('ROLLBACK TO SAVEPOINT export_user;') } catch { }
		try { await fastify.db.exec('RELEASE SAVEPOINT export_user;') } catch { }
		throw e
	}
}
