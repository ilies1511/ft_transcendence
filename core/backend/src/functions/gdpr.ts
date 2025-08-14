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
}

export async function updateMyProfile(
	fastify: FastifyInstance,
	userId: number,
	data: UpdateProfile
): Promise<boolean> {
	const updates: string[] = []
	const values: unknown[] = []

	if (data.username) {
		updates.push('username = ?')
		values.push(data.username)
	}
	if (data.nickname) {
		updates.push('nickname = ?')
		values.push(data.nickname)
	}
	if (data.email) {
		updates.push('email = ?')
		values.push(data.email)
	}
	if (data.password) {
		const hash = await bcrypt.hash(data.password, 12)
		updates.push('password = ?')
		values.push(hash)
	}

	if (updates.length === 0) {
		return false
	}

	values.push(userId)
	const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND is_deleted = 0`
	const info = await fastify.db.run(sql, ...values)
	return (info.changes ?? 0) > 0
}
