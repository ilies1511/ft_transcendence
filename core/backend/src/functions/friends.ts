import type { FastifyInstance } from 'fastify'
import type { FriendRequestRow } from '../types/userTypes.ts'

export async function sendFriendRequest(
	fastify: FastifyInstance,
	requesterId: number,
	recipientUsername: string
	): Promise<FriendRequestRow>
{
	const rec = await fastify.db.get<{ id: number }>(
		'SELECT id FROM users WHERE username = ?',
		recipientUsername
	)
	if (!rec) {
		throw new Error('RecipientNotFound')
	}
	if (rec.id === requesterId) {
		throw new Error('CannotRequestYourself')
	}

	// // TODO: Check within friend_requests whether requester_id already send to recipient_id
	const recipientId = rec.id;
	const pending = await fastify.db.get<{ id: number }>(
		`SELECT id FROM friend_requests WHERE requester_id = ?
		AND recipient_id = ?`,
		requesterId,
		recipientId
	)
	if (pending) {
		throw new Error('RequestAlreadyPending')
	}

	// //TODO: Should never be triggert but to be safe
	const friendship = await fastify.db.get<{ user_id: number }>(
		`SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?`,
		requesterId,
		recipientId
	)
	if (friendship) {
		throw new Error('AlreadyFriends')
	}

	// Insert
	const info = await fastify.db.run(
		`INSERT INTO friend_requests (requester_id, recipient_id)
		VALUES (?, ?)`,
		requesterId,
		rec.id
	)
	return fastify.db.get<FriendRequestRow>(
		'SELECT * FROM friend_requests WHERE id = ?',
		info.lastID
	) as Promise<FriendRequestRow>
}

export async function listIncomingRequests(
	fastify: FastifyInstance,
	userId: number
): Promise<FriendRequestRow[]> {
	const rows = await fastify.db.all<FriendRequestRow[]>(
		`SELECT * FROM friend_requests
		WHERE recipient_id = ?
		ORDER BY created_at DESC`,
		userId
	)
	return rows
}

export async function listOutgoingRequests(
	fastify: FastifyInstance,
	userId: number
): Promise<FriendRequestRow[]> {
	const rows = await fastify.db.all<FriendRequestRow[]>(
		`SELECT * FROM friend_requests
		WHERE requester_id = ?
		ORDER BY created_at DESC`,
		userId
	)
	return rows
}

// // Old behavior
// export async function acceptFriendRequest(
// 	fastify: FastifyInstance,
// 	requestId: number
// ): Promise<void> {
// 	const req = await fastify.db.get<FriendRequestRow>(
// 		'SELECT * FROM friend_requests WHERE id = ?',
// 		requestId
// 	)
// 	if (!req) throw new Error('RequestNotFound')
// 	if (req.status !== 'pending') throw new Error('AlreadyHandled')

// 	const now = Date.now()
// 	await fastify.db.run(
// 		`UPDATE friend_requests
// 		SET status = 'accepted', responded_at = ?
// 		WHERE id = ?`,
// 		now,
// 		requestId
// 	)
// 	await fastify.db.run(
// 		`INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)`,
// 		req.requester_id,
// 		req.recipient_id
// 	)
// 	await fastify.db.run(
// 		`INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)`,
// 		req.recipient_id,
// 		req.requester_id
// 	)
// }

export async function acceptFriendRequest(
	fastify: FastifyInstance,
	requestId: number
): Promise<void> {
	const req = await fastify.db.get<FriendRequestRow>(
		'SELECT * FROM friend_requests WHERE id = ?',
		requestId
	)
	if (!req) throw new Error('RequestNotFound')
	// if (req.status !== 'pending') throw new Error('AlreadyHandled')

	// const now = Date.now()
	// await fastify.db.run(
	// 	`UPDATE friend_requests
	// 	SET status = 'accepted', responded_at = ?
	// 	WHERE id = ?`,
	// 	now,
	// 	requestId
	// )
	await fastify.db.run(
		`INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)`,
		req.requester_id,
		req.recipient_id
	)
	await fastify.db.run(
		`INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)`,
		req.recipient_id,
		req.requester_id
	)

	// NEw behavior --> Deleting entry in DB
	await fastify.db.run('DELETE FROM friend_requests WHERE id = ?', requestId);
}

// // Old behavior
// export async function rejectFriendRequest(
// 	fastify: FastifyInstance,
// 	requestId: number
// ): Promise<void> {
// 	const now = Date.now()
// 	const info = await fastify.db.run(
// 		`UPDATE friend_requests
// 		SET status = 'rejected', responded_at = ?
// 		WHERE id = ? AND status = 'pending'`,
// 		now,
// 		requestId
// 	)
// 	if (info.changes === 0) throw new Error('RequestNotFoundOrHandled')
// }
export async function rejectFriendRequest(
	fastify: FastifyInstance,
	requestId: number
): Promise<void> {
	const info = await fastify.db.run(
		`DELETE FROM friend_requests WHERE id = ?`, requestId)
	if (info.changes === 0) throw new Error('RequestNotFoundOrHandled')
}

export async function removeFriend(
	fastify: FastifyInstance,
	userId: number,
	friendId: number
): Promise<boolean> {
	const direction1 = await fastify.db.run('DELETE FROM friendships WHERE \
		user_id = ? AND friend_id = ?',
		userId, friendId
	);
	const direction2 = await fastify.db.run('DELETE FROM friendships WHERE \
		user_id = ? AND friend_id = ?',
		friendId, userId
	);
	const deletedCount = (direction1.changes ?? 0) + (direction2.changes ?? 0)
	return deletedCount > 0
}

export async function withdrawFriendRequest(
	fastify: FastifyInstance,
	requesterId: number,
	requestId: number): Promise<boolean> {
	const info = await fastify.db.run(
		`DELETE FROM friend_requests WHERE id = ? AND requester_id = ?`,
		requestId,
		requesterId
	)
	return (info.changes ?? 0) > 0
}
