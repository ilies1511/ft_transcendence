import type { FastifyInstance } from 'fastify';

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
