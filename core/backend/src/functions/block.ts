import { type FastifyInstance } from "fastify"

// BEGIN -- (Un)Block USer
export async function blockUser(
	fastify: FastifyInstance,
	blockerId: number,
	blockedId: number
): Promise<void> {
	await fastify.db.run(
		`INSERT OR IGNORE INTO user_blocks (blocker_id, blocked_id) VALUES (?, ?)`,
		blockerId, blockedId
	)
}

export async function unblockUser(
	fastify: FastifyInstance,
	blockerId: number,
	blockedId: number
): Promise<boolean> {
	const res = await fastify.db.run(
		`DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?`,
		blockerId, blockedId
	)
	return res.changes! > 0
}

export async function isBlocked(
	fastify: FastifyInstance,
	blockerId: number,
	targetId: number
): Promise<boolean> {
	const row = await fastify.db.get<{ count: number }>(
		`SELECT COUNT(*) AS count
		FROM user_blocks
		WHERE blocker_id = ? AND blocked_id = ?`,
		blockerId, targetId
	)
	return row?.count! > 0
}
// END -- (Un)Block USer
