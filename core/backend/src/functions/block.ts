import { type FastifyInstance } from "fastify"
import type { FriendRequestRow } from "../types/userTypes.ts"

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

export type BlockedUser = {
	id: number,
	username: string,
	avatar: string,
	email: string
}

export async function getBlockedUsersList(
	fastify:FastifyInstance,
	id: number
// ): Promise<BlockedUser[]>
): Promise<number[]>
{
	// const blockedUsers = fastify.db.all<BlockedUser[]>(
	// 	'SELECT * from user_blocks WHERE blocker_id = ?', id);
	const blockedUsers = await fastify.db.all<{blocked_id : number}[]>(
		'SELECT * from user_blocks WHERE blocker_id = ?', id);
	// return blockedUsers;
	return blockedUsers.map(r => r.blocked_id);
}
