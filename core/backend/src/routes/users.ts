// src/routes/users.ts
import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcrypt";
import { type UserWithFriends, type FriendRequestRow, type UserRow } from "../types/userTypes.ts";
import { error, info } from "console";
import {
	createUser, updateUser,
	type UpdateUserData,
	getUserById, setUserLive, deleteUserById,
	updateUserAvatar
} from "../functions/user.ts";
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pipeline } from 'stream/promises'
import { createWriteStream } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// const PUBLIC_DIR = path.resolve(__dirname, '../../../frontend/public')

export const userRoutes: FastifyPluginAsync = async (fastify) => {
	// POST -- BEGIN
	// fastify.post<{
	// 	Body: { username: string; password: string; email?: string };
	// 	Reply: { id: number | undefined } | { error: string };
	// }>(
	// 	"/api/users",
	// 	{
	// 		schema: {
	// 			body: {
	// 				type: "object",
	// 				required: ["username", "password"],
	// 				properties: {
	// 					username: { type: "string", minLength: 1 },
	// 					password: { type: "string", minLength: 1 },
	// 					email: { type: "string", nullable: true },
	// 				},
	// 			},
	// 			response: {
	// 				201: {
	// 					type: "object",
	// 					properties: { id: { type: "integer" } },
	// 				},
	// 				409: {
	// 					type: "object",
	// 					properties: { error: { type: "string" } },
	// 				},
	// 			},
	// 		},
	// 	},
	// 	async (request, reply) => {
	// 		const { username, password, email } = request.body;
	// 		const hash = await bcrypt.hash(password, 10);
	// 		try {
	// 			const id = await createUser(fastify, request.body);
	// 			return reply.code(201).send({ id });
	// 		} catch {
	// 			return reply
	// 				.code(409)
	// 				.send({ error: "Username or email already exists" });
	// 		}
	// 	}
	// );
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
	// TODO:
	// JUST FOR TESTING PURPOSES. TO UPDATE THE NICKNAME FROM TEH USER SETTINGS PAGE
	// UPDATE/REMOVE ON PRODUCTION
	fastify.patch<{ Params: { id: string }, Body: { nickname: string } }>(
		'/api/users/:id/nickname',
		async (req, reply) => {
			const { id } = req.params;
			const { nickname } = req.body;

			if (!nickname) {
				return reply.code(400).send({ error: 'Nickname is required' });
			}

			await fastify.db.run('UPDATE users SET nickname = ? WHERE id = ?', [nickname, id]);
			reply.send({ success: true });
		}
	)
	fastify.post<{
		Params: { id: number }
	}>(
		'/api/users/:id/avatar',
		{
			schema: {
				params: {
					type: 'object',
					required: ['id'],
					properties: { id: { type: 'integer' } }
				},
				response: {
					200: {
						type: 'object',
						properties: { avatarUrl: { type: 'string' } }
					},
					400: { type: 'object', properties: { error: { type: 'string' } } },
					404: { type: 'object', properties: { error: { type: 'string' } } }
				}
			}
		},
		async (request, reply) => {
			const userId = request.params.id

			const data = await request.file({ limits: { fieldNameSize: 100 } })
			if (!data) {
				return reply.code(400).send({ error: 'No file uploaded' })
			}
			if (!data.filename.toLowerCase().endsWith('.png')) {
				return reply.code(400).send({ error: 'Only .png allowed' })
			}
			// const filename = "NewUploadedAvatar.png";
			const filename = "NewUploadedAvatar" + `_${userId}`;
			const destPath = path.join(
				__dirname,
				'../../../frontend/public/',
				filename
			)
			await pipeline(data.file, createWriteStream(destPath));
			const avatar = `../../${filename}`
			const ok = await updateUserAvatar(fastify, userId, avatar)
			if (!ok) {
				return reply.code(404).send({ error: 'User not found' })
			}
			return reply.code(200).send({ avatar })
		}
	)
};
