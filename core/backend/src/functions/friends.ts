import type { FastifyInstance } from 'fastify'
import type { FriendRequestRow } from '../types/userTypes.ts'

export enum FriendRequestMsg {
	RecipientNotFound = 'RecipientNotFound',
	CannotRequestYourself = 'CannotRequestYourself',
	RecipientAlreadySentFR = 'RecipientAlreadySentFR',
	RequestAlreadyPending = 'RequestAlreadyPending',
	AlreadyFriends = 'AlreadyFriends',
}

export type FriendRequestResult =
	{ type: 'pending'; request: FriendRequestRow } | { type: 'accepted' }

export async function sendFriendRequest(
	fastify: FastifyInstance,
	requesterId: number,
	recipientUsername: string
): Promise<FriendRequestResult> {
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
	const recipientId = rec.id;
	//TODO: Check whether entry already exists in friend_requests table
	const rev_pending = await fastify.db.get<{ id: number }>(
		`SELECT id FROM friend_requests WHERE requester_id = ?
		AND recipient_id = ?`,
		recipientId,
		requesterId
	)
	if (rev_pending) {
		acceptFriendRequest(fastify, rev_pending.id);
		return { type: 'accepted' };
	}

	// // TODO: Check within friend_requests whether requester_id already send to recipient_id
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
	const row = await fastify.db.get<FriendRequestRow>(
		'SELECT * FROM friend_requests WHERE id = ?', info.lastID);
	if (row === undefined) {
		throw new Error('Could not fetch created friend_request')
	}
	return { type: 'pending', request: row }
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

export async function acceptFriendRequest(
	fastify: FastifyInstance,
	requestId: number
): Promise<void> {
	const req = await fastify.db.get<FriendRequestRow>(
		'SELECT * FROM friend_requests WHERE id = ?',
		requestId
	)
	if (!req) throw new Error('RequestNotFound')

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

export async function areFriends(
	fastify: FastifyInstance,
	id: number,
	friendId: number
): Promise<boolean> {
	const row = await fastify.db.get<{ one: number }>(
		'SELECT 1 AS one FROM friendships WHERE user_id = ? AND friend_id = ?',
		id,
		friendId
	);

	return !!row;
	// if (!ok) {
	// 	return false;
	// }
	// return true;
}

// export async function removeFriendship(
// 	fastify: FastifyInstance,
// 	userId: number,
// 	friendId: number
// ): Promise<void> {
// 	await fastify.db.run(
// 		'DELETE FROM friendships WHERE user_id = ? AND friend_id = ?',
// 		userId,
// 		friendId
// 	);
// 	await fastify.db.run(
// 		'DELETE FROM friendships WHERE user_id = ? AND friend_id = ?',
// 		friendId,
// 		userId
// 	)
// }
