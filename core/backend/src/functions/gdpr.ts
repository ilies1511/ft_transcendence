import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt'

export async function getUserData(fastify: FastifyInstance, userId: number) {
	const row = await fastify.db.get(
		`SELECT id, username, nickname, email, avatar, created_at FROM users
		WHERE id = ? AND is_deleted = 0`, userId);
	return row;
}

export async function anonymizeUser(fastify: FastifyInstance, userId: number) {
	const pseudo = `deleted_user_${userId}`;
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

export async function deleteUserAndData(fastify: FastifyInstance, userId: number) {
	await fastify.db.run(
		`DELETE FROM users WHERE id = ?`,
		userId
	);
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
