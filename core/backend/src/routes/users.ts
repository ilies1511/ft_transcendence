// src/routes/users.ts
import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcrypt";
import { type UserWithFriends, type FriendRequestRow, type UserRow  } from "../db/types.js";
import { info } from "console";
import { createUser, updateUser, type UpdateUserData, getUserById, setUserLive, deleteUserById} from "../functions/user.ts";
import { findUserWithFriends } from "../functions/user.ts";
import { sendFriendRequest, listIncomingRequests, acceptFriendRequest, rejectFriendRequest } from "../functions/friends.ts";

export const userRoutes: FastifyPluginAsync = async (fastify) => {
	// POST -- BEGIN
	fastify.post<{
		Body: { username: string; password: string; email?: string };
		Reply: { id: number | undefined } | { error: string };
	}>(
		"/api/users",
		{
			schema: {
				body: {
					type: "object",
					required: ["username", "password"],
					properties: {
						username: { type: "string", minLength: 1},
						password: { type: "string", minLength: 1},
						email: { type: "string", nullable: true },
					},
				},
				response: {
					201: {
						type: "object",
						properties: { id: { type: "integer" } },
					},
					409: {
						type: "object",
						properties: { error: { type: "string" } },
					},
				},
			},
		},
		async (request, reply) => {
			const { username, password, email } = request.body;
			const hash = await bcrypt.hash(password, 10);
			try {
				const id = await createUser(fastify, request.body);
				return reply.code(201).send({ id });
			} catch {
				return reply
					.code(409)
					.send({ error: "Username or email already exists" });
			}
		}
	);
	//POST -- END

	// GET -- BEGIN

	//All
	fastify.get<{
		Reply: Array<Pick<UserRow, "id" | "username" | "nickname" | "email" | "live" | "avatar" | "created_at">>;
	}>(
		"/api/users",
		{
			schema: {
				response: {
					200: {
						type: "array",
						items: {
							type: "object",
							properties: {
								id: { type: "integer" },
								username: { type: "string" },
								nickname: { type: "string" },
								email: { type: ["string", "null"] },
								live: { type: "integer" },
								avatar: { type: "string" },
								created_at: { type: "integer" },
							},
						},
					},
				},
			},
		},
		async () => {
			return fastify.db.all(
				"SELECT id, username, nickname, live, email, avatar, created_at FROM users"
			);
		}
	);

	//
	// READ ONE (by ID)
	//
	fastify.get<{
		Params: { id: number };
		Reply:
		| Pick<UserRow, "id" | "username" | "nickname" | "email" | "live" | "avatar" | "created_at">
		| { error: string };
	}>(
		"/api/users/:id",
		{
			schema: {
				params: {
					type: "object",
					required: ["id"],
					properties: { id: { type: "integer" } },
				},
				response: {
					200: {
						type: "object",
						properties: {
							id: { type: "integer" },
							username: { type: "string" },
							nickname: { type: "string" },
							email: { type: ["string", "null"] },
							live: { type: "integer" },
							avatar: { type: "string" },
							created_at: { type: "integer" },
						},
					},
					404: {
						type: "object",
						properties: { error: { type: "string" } },
					},
				},
			},
		},
		async (request, reply) => {
			// const user = await fastify.db.get<UserRow>(
			// 	"SELECT id, username, email, created_at FROM users WHERE id = ?",
			// 	request.params.id
			// );
			const user = await getUserById(fastify, request.params.id);
			if (!user) {
				return reply.code(404).send({ error: "User not found" });
			}
			return (user);
		}
	);

	fastify.get<{
		Params: { id: number }
		Reply: UserWithFriends | { error: string }
	}>(
		'/api/users/:id/friends',
		{
			schema: {
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
							created_at: { type: 'integer' },
							avatar: { type: "string" },
							friends: {
								type: 'array',
								items: { type: 'integer' }
							}
						}
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

	// PUT -- BEGIN
	// PUT (by ID)
	fastify.put<{
		Params: { id: number };
		Body: { username?: string; password?: string; email?: string };
		Reply: { message: string } | { error: string };
	}>(
		"/api/users/:id",
		{
			schema: {
				params: {
					type: "object",
					required: ["id"],
					properties: { id: { type: "integer" } },
				},
				body: {
					type: "object",
					properties: {
						username: { type: "string" },
						password: { type: "string" },
						email: { type: "string" },
					},
					minProperties: 1,
				},
				response: {
					200: {
						type: "object",
						properties: { message: { type: "string" } },
					},
					400: {
						type: "object",
						properties: { error: { type: "string" } },
					},
					404: {
						type: "object",
						properties: { error: { type: "string" } },
					},
				},
			},
		},
		async (request, reply) => {
			const id = request.params.id
			const data = request.body as UpdateUserData

			try {
				const changed = await updateUser(fastify, id, data)
				if (!changed) {
					return reply.code(404).send({ error: 'User not found' })
				}
				return reply.code(200).send({ message: 'User updated successfully' })
			} catch (err: any) {
				if (err.message === 'NoFieldsToUpdate') {
					return reply.code(400).send({ error: 'No fields to update' })
				}
				return reply.code(500).send({ error: 'Internal Server Error' })
			}
		}
	);

	//
	// DELETE (by ID)
	//
	fastify.delete<{
		Params: { id: number };
		Reply: { message: string } | { error: string };
	}>(
		"/api/users/:id",
		{
			schema: {
				params: {
					type: "object",
					required: ["id"],
					properties: { id: { type: "integer" } },
				},
				response: {
					200: {
						type: "object",
						properties: { message: { type: "string" } },
					},
					404: {
						type: "object",
						properties: { error: { type: "string" } },
					},
				},
			},
		},
		async (request, reply) => {
			const { id } = request.params
			const deleted = await deleteUserById(fastify, id)

			if (!deleted) {
				return reply.code(404).send({ error: 'User not found' });
			}
			return reply.code(200).send({ message: 'User deleted successfully' });
		}
	);

	//PUT --END

	//PATCH -- BEGIN
	fastify.patch<{
		Params: { id: number }
		Body: { live: boolean }
	}>(
		'/api/users/:id/live',
		{
			schema: {
				body: {
					type: 'object',
					required: ['live'],
					properties: { live: { type: 'boolean' } }
				}
			}
		},
		async (request, reply) => {
			const ok = await setUserLive(fastify, request.params.id, request.body.live)
			if (!ok) return reply.code(404).send({ error: 'User not found' })
			return { message: 'Live status updated' }
		}
	)
	//PATCH -- BEGIN

	fastify.post<{
		Params: { id: number }
		Body: { username: string }
		Reply: { requestId: number } | { error: string }
	}>(
		'/api/users/:id/requests',
		{
			schema: {
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
				return reply.code(201).send({ requestId: fr.id })
			} catch (err: any) {
				if (err.message === 'RecipientNotFound') return reply.code(404).send({ error: 'User not found' })
				if (err.message === 'CannotRequestYourself') return reply.code(400).send({ error: "Can't friend yourself" })
				if (err.message.includes('UNIQUE')) return reply.code(409).send({ error: 'Request already sent' })
				return reply.code(500).send({ error: 'Could not send request' })
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
};
