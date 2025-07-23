import type { FastifyPluginAsync } from "fastify";
import { type UserWithFriends, type FriendRequestRow, type UserRow } from "../types/userTypes.ts";
import { findUserWithFriends } from "../functions/user.ts";
import { sendFriendRequest, listIncomingRequests, acceptFriendRequest,
	rejectFriendRequest, removeFriend } from "../functions/friends.ts";
import * as helpers from "../functions/friends.ts";

export const friendRoutes: FastifyPluginAsync = async (fastify) => {
	// GET -- BEGIN
	fastify.get<{
		Params: { id: number }
		Reply: UserWithFriends | { error: string }
	}>(
		'/api/users/:id/friends',
		{
			schema: {
				tags: ['friends'],
				params: {
					type: "object",
					required: ["id"],
					properties: { id: { type: "integer" } },
				},
				response: {
					200: {
						type: 'object',
						properties: {
							id: { type: 'integer' },
							username: { type: 'string' },
							nickname: { type: 'string' },
							email: { type: ['string', 'null'] },
							live: { type: 'integer' },
							avatar: { type: 'string' },
							created_at: { type: 'integer' },
							friends: {
								type: 'array',
								items: {
									type: 'object',
									properties: {
										id: { type: 'integer' },
										username: { type: 'string' },
										live: { type: 'integer' },
										avatar: { type: 'string' }
									},
									required: ['id', 'username', 'live', 'avatar']
								}
							}
						},
						required: ['id', 'username', 'nickname', 'email', 'live', 'avatar', 'created_at', 'friends']
					},
					404: {
						type: "object",
						properties: { error: { type: "string" } },
					}
				}
			}
		},
		async (request, reply) => {
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
		Reply: { requestId: number } | { error: string }
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
				// [START] SEND A FRIEND NOTIFICATION VIA WS INSTANTLY
				if (fr) {
					const sender = await fastify.db.get<{ username: string }>(
						'SELECT username FROM users WHERE id = ?', req.params.id);

					const recipient = await fastify.db.get<{ id: number }>(
						'SELECT id FROM users WHERE username = ?', req.body.username);

					if (recipient && sender) {
						fastify.websocketServer.clients.forEach((client: any) => {
							if (client.userId === recipient.id && client.wsPath === '/friends') {
								client.send(JSON.stringify({
									type: 'new_friend_request',
									requestId: fr.id,
									from: sender.username
								}));
							}
						});
					}
				}
				// [END] SEND A FRIEND NOTIFICATION VIA WS INSTANTLY
				return reply.code(201).send({ requestId: fr.id })
			} catch (err: any) {
				if (err.message === 'RecipientNotFound') return reply.code(404).send({ error: 'User not found' })
				if (err.message === 'CannotRequestYourself') return reply.code(400).send({ error: "Can't friend yourself" })
				if (err.message === 'RequestAlreadyPending') return reply.code(400).send({ error: "Request already sent" })
				if (err.message === 'AlreadyFriends') return reply.code(400).send({ error: "AlreadyFriends" })
				if (err.message.includes('UNIQUE')) return reply.code(409).send({ error: 'Request already sent' })
				return reply.code(500).send({ error: 'Could not send request: ' + err.message })
			}
		}
	)
	// b) Incoming requests listen
	fastify.get<{
		Params: { id: number }
		Reply: FriendRequestRow[]
	}>(
		'/api/users/:id/requests',
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
