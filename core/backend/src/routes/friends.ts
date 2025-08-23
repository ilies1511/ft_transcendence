import type { FastifyPluginAsync } from "fastify";
import {
	acceptFriendRequest,
	getFriendRequestById,
	listIncomingRequests,
	listOutgoingRequests,
	rejectFriendRequest, removeFriend,
	sendFriendRequest,
	withdrawFriendRequest
} from "../functions/friends.ts";
import { findUserWithFriends } from "../functions/user.ts";
import { type FriendRequestRow, type UserWithFriends } from "../types/userTypes.ts";
import { acceptFriendRequestSchema, IncomingRequestsResponseSchema, incomingRequestsSchema, listFriendsSchema, outgoingRequestsSchema, rejectFriendRequestSchema, sendFriendRequestSchema, SendFRResponse201 } from "../schemas/friends.ts";

async function getUserId(request: any) {
	return (request.user as any).id as number;
}

export const friendRoutes: FastifyPluginAsync = async (fastify) => {
	// GET -- BEGIN
	fastify.get<{
		Reply: UserWithFriends | { error: string }
	}>(
		'/api/me/friends',
		{
			schema: listFriendsSchema
		},
		async (request, reply) => {
			const authUserId = await getUserId(request);

			const result = await findUserWithFriends(fastify, authUserId)
			if (!result) {
				return reply.code(404).send({ error: 'User not found' })
			}
			return result
		}
	)
	// GET -- END

	//POST -- BEGIN
	fastify.post<{
		Body: { username: string }
		Reply: { requestId: number } | { error: string } | { message: string }
	}>(
		// '/api/users/:id/requests',
		'/api/me/requests',
		{
			schema: sendFriendRequestSchema
		},
		async (req, reply) => {
			try {
				const authUserId = await getUserId(req);
				const fr = await sendFriendRequest(fastify, authUserId, req.body.username)
				if (fr.type === 'accepted') {
					reply.code(200).send({ message: 'Friend request automatically accepted' });
				}
				else if (fr.type === 'pending') {
					return reply.code(201).send({ requestId: fr.request.id });
				}
			} catch (err: any) {
				if (err.message === 'RecipientNotFound') return reply.code(404).send({ error: 'User not found' })
				if (err.message === 'CannotRequestYourself') return reply.code(400).send({ error: "Can't friend yourself" })
				if (err.message === 'RequestAlreadyPending') return reply.code(400).send({ error: "Request already sent" })
				if (err.message === 'AlreadyFriends') return reply.code(400).send({ error: "AlreadyFriends" })
				if (err.message === 'RecipientAlreadySentFR') return reply.code(400).send({ error: "RecipientAlreadySentFR" })
				if (err.message === 'BlockedByUser') return reply.code(403).send({ error: 'You are blocked by this user and cannot send a friend request.' })
				if (err.message.includes('UNIQUE')) return reply.code(409).send({ error: 'Request already sent' })
				return reply.code(500).send({ error: 'Could not send request: ' + err.message })
			}
		}
	)
	// b.1) Incoming requests listen ---> received request
	fastify.get<{
		Reply: FriendRequestRow[]
	}>(
		// '/api/users/:id/requests/incoming',
		'/api/me/requests/incoming',
		{
			schema: incomingRequestsSchema
		},
		async (req) => {
			const userId = await getUserId(req);
			const rows = await listIncomingRequests(fastify, userId);
			return rows;
		}
	)

	// b.2) Outgoing requests listen ---> sent request
	fastify.get<{
		// Params: { id: number }
		Reply: FriendRequestRow[]
	}>(
		// '/api/users/:id/requests/outgoing',
		'/api/me/requests/outgoing',
		{
			schema: outgoingRequestsSchema
		},
		async (req) => {
			const userId = await getUserId(req);
			return listOutgoingRequests(fastify, userId);
		}
	)

	// c) Anfrage annehmen
	fastify.post<{
		Params: { requestId: number }
		Reply: { message: string } | { error: string }
	}>(
		'/api/requests/:requestId/accept',
		{
			schema: acceptFriendRequestSchema
		},
		async (req, reply) => {
			const { requestId } = req.params
			const authUserId = await getUserId(req);

			const fr = await getFriendRequestById(fastify, requestId)
			if (!fr) {
				return reply.code(404).send({ error: 'Request not found' })
			}
			if (fr.recipient_id !== authUserId) {
				return reply.code(403).send({ error: 'Forbidden' })
			}
			if (fr.responded_at !== null) {
				return reply.code(409).send({ error: 'Already responded' })
			}
			try {
				await acceptFriendRequest(fastify, req.params.requestId)
				return { message: 'Friend request accepted' }
			} catch (err: any) {
				return reply.code(404).send({ error: err.message })
			}
		}
	)

	// d) Anfrage ablehnen
	fastify.post<{
		Params: { requestId: number }
		Reply: { message: string } | { error: string }
	}>(
		'/api/requests/:requestId/reject',
		{
			schema: rejectFriendRequestSchema
		},
		async (req, reply) => {
			const { requestId } = req.params
			const authUserId = await getUserId(req);

			const fr = await getFriendRequestById(fastify, requestId)
			if (!fr) {
				return reply.code(404).send({ error: 'Request not found' })
			}
			if (fr.recipient_id !== authUserId) {
				return reply.code(403).send({ error: 'Forbidden' })
			}
			if (fr.responded_at !== null) {
				return reply.code(409).send({ error: 'Already responded' })
			}

			try {
				await rejectFriendRequest(fastify, req.params.requestId)
				return { message: 'Friend request rejected' }
			} catch (err: any) {
				return reply.code(404).send({ error: err.message })
			}
		}
	)

	fastify.delete<{
		Params: { id: number; requestId: number }
		Reply: { message: string } | { error: string }
	}>(
		'/api/users/:id/requests/:requestId',
		{
			schema: {
				tags: ['friends'],
				params: {
					type: 'object',
					required: ['id', 'requestId'],
					properties: {
						id: { type: 'integer' },
						requestId: { type: 'integer' }
					}
				},
				response: {
					200: {
						type: 'object',
						properties: { message: { type: 'string' } }
					},
					404: {
						type: 'object',
						properties: { error: { type: 'string' } }
					}
				}
			}
		},
		async (req, reply) => {
			const requesterId = req.params.id
			const requestId = req.params.requestId

			const ok = await withdrawFriendRequest(fastify, requesterId, requestId)
			if (!ok) {
				return reply.code(404).send({ error: 'No pending request to withdraw' })
			}
			return reply.code(200).send({ message: 'Friend request withdrawn' })
		}
	)
	//POST -- BEGIN

	//DELETE -- BEGIN
	/* TEST:
		curl -i -X DELETE http://localhost:3000/api/users/2/friends/5
	 */
	fastify.delete<{
		Params: { id: number; friendId: number }
		Reply: { message: string } | { error: string }
	}>(
		'/api/users/:id/friends/:friendId',
		{
			schema: {
				tags: ['friends'],
				params: {
					type: 'object',
					required: ['id', 'friendId'],
					properties: {
						id: { type: 'integer' },
						friendId: { type: 'integer' }
					}
				},
				response: {
					200: {
						type: 'object',
						properties: { message: { type: 'string' } }
					},
					404: {
						type: 'object',
						properties: { error: { type: 'string' } }
					}
				}
			}
		},
		async (req, reply) => {
			const userId = req.params.id
			const friendId = req.params.friendId

			const ok = await removeFriend(fastify, userId, friendId)
			if (!ok) {
				return reply.code(404).send({ error: 'Friendship not found' })
			}
			return reply.code(200).send({ message: 'Friend removed' })
		}
	)
	//DELETE -- END
}
