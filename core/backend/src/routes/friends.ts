import type { FastifyPluginAsync } from "fastify";
import {
	acceptFriendRequest,
	listIncomingRequests,
	listOutgoingRequests,
	rejectFriendRequest, removeFriend,
	sendFriendRequest,
	withdrawFriendRequest
} from "../functions/friends.ts";
import { findUserWithFriends } from "../functions/user.ts";
import { type FriendRequestRow, type UserWithFriends } from "../types/userTypes.ts";
import { listFriendRequestSchema } from "../schemas/friends.ts";

export const friendRoutes: FastifyPluginAsync = async (fastify) => {
	// GET -- BEGIN
	fastify.get<{
		Params: { id: number }
		Reply: UserWithFriends | { error: string }
	}>(
		'/api/users/:id/friends',
		{
			schema: listFriendRequestSchema
		},
		async (request, reply) => {
			const authUserId = (request.user as any).id

			if (request.params.id !== authUserId) {
				return reply.code(403).send({ error: 'Forbidden' })
			}
			const result = await findUserWithFriends(fastify, request.params.id)
			if (!result) {
				return reply.code(404).send({ error: 'User not found' })
			}
			return result
		}
	)
	// GET -- END

	//POST -- BEGIN
	fastify.post<{
		Params: { id: number }
		Body: { username: string }
		Reply: { requestId: number } | { error: string } | { message: string }
	}>(
		'/api/users/:id/requests',
		{
			schema: {
				tags: ['friends'],
				params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
				body: { type: 'object', required: ['username'], properties: { username: { type: 'string' } } },
				response: {
					201: { type: 'object', properties: { requestId: { type: 'integer' } } },
					400: { type: 'object', properties: { error: { type: 'string' } } },
					404: { type: 'object', properties: { error: { type: 'string' } } },
					409: { type: 'object', properties: { error: { type: 'string' } } }
				}
			}
		},
		async (req, reply) => {
			try {
				const fr = await sendFriendRequest(fastify, req.params.id, req.body.username)
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
		Params: { id: number }
		Reply: FriendRequestRow[]
	}>(
		'/api/users/:id/requests/incoming',
		{
			schema: {
				tags: ['friends'],
				params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
				response: {
					200: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								id: { type: 'integer' },
								requester_id: { type: 'integer' },
								recipient_id: { type: 'integer' },
								status: { type: 'string' },
								created_at: { type: 'integer' },
								responded_at: { type: ['integer', 'null'] }
							}
						}
					}
				}
			}
		},
		async (req) => listIncomingRequests(fastify, req.params.id)
	)

	// b.2) Outgoing requests listen ---> sent request
	fastify.get<{
		Params: { id: number }
		Reply: FriendRequestRow[]
	}>(
		'/api/users/:id/requests/outgoing',
		{
			schema: {
				tags: ['friends'],
				params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
				response: {
					200: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								id: { type: 'integer' },
								requester_id: { type: 'integer' },
								recipient_id: { type: 'integer' },
								status: { type: 'string' },
								created_at: { type: 'integer' },
								responded_at: { type: ['integer', 'null'] }
							}
						}
					}
				}
			}
		},
		async (req) => listOutgoingRequests(fastify, req.params.id)
	)

	// c) Anfrage annehmen
	fastify.post<{
		Params: { requestId: number }
		Reply: { message: string } | { error: string }
	}>(
		'/api/requests/:requestId/accept',
		{
			schema: {
				tags: ['friends'],
				params: { type: 'object', required: ['requestId'], properties: { requestId: { type: 'integer' } } },
				response: {
					200: { type: 'object', properties: { message: { type: 'string' } } },
					404: { type: 'object', properties: { error: { type: 'string' } } }
				}
			}
		},
		async (req, reply) => {
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
			schema: {
				tags: ['friends'],
				params: { type: 'object', required: ['requestId'], properties: { requestId: { type: 'integer' } } },
				response: {
					200: { type: 'object', properties: { message: { type: 'string' } } },
					404: { type: 'object', properties: { error: { type: 'string' } } }
				}
			}
		},
		async (req, reply) => {
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
