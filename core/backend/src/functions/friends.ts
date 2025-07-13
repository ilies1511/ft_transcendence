import type { FastifyInstance } from 'fastify'
import type { FriendRequestRow } from '../db/types.js'


export async function sendFriendRequest(
	fastify: FastifyInstance,
	requesterId: number,
	recipientUsername: string
): Promise<FriendRequestRow> {
	// finde recipientId
	const rec = await fastify.db.get<{ id: number }>(
		'SELECT id FROM users WHERE username = ?',
		recipientUsername
	)
	if (!rec) throw new Error('RecipientNotFound')
	if (rec.id === requesterId) throw new Error('CannotRequestYourself')

	// Insert
	const now = Date.now()
	const info = await fastify.db.run(
		`INSERT INTO friend_requests (requester_id, recipient_id, created_at)
		VALUES (?, ?, ?)`,
		requesterId,
		rec.id,
		now
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
		WHERE recipient_id = ? AND status = 'pending'
		ORDER BY created_at DESC`,
		userId
	)
	return rows
}

export async function acceptFriendRequest(
	fastify: FastifyInstance,
	requestId: number
): Promise<void> {
	const req = await fastify.db.get<FriendRequestRow>(
		'SELECT * FROM friend_requests WHERE id = ?',
		requestId
	)
	if (!req) throw new Error('RequestNotFound')
	if (req.status !== 'pending') throw new Error('AlreadyHandled')

	const now = Date.now()
	await fastify.db.run(
		`UPDATE friend_requests
		SET status = 'accepted', responded_at = ?
		WHERE id = ?`,
		now,
		requestId
	)
	// nun echte Freundschaft anlegen (bidirektional oder unidirektional je nach Modell)
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
}

export async function rejectFriendRequest(
	fastify: FastifyInstance,
	requestId: number
): Promise<void> {
	const now = Date.now()
	const info = await fastify.db.run(
		`UPDATE friend_requests
		SET status = 'rejected', responded_at = ?
		WHERE id = ? AND status = 'pending'`,
		now,
		requestId
	)
	if (info.changes === 0) throw new Error('RequestNotFoundOrHandled')
}
