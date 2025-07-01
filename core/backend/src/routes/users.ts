// // src/routes/users.ts
// import type { FastifyPluginAsync } from 'fastify'
// import bcrypt from 'bcrypt'
// import { type UserRow } from '../db/types.ts'

// export const userRoutes: FastifyPluginAsync = async fastify => {
//   fastify.post<{ Body: { username: string; password: string; email?: string } }>(
//     '/api/users',
// 	{ schema: {
// 		body: {
// 			type: 'object',
// 			required: ['username', 'password'],
// 			properties: {
// 				username: { type: 'string' },
// 				password: { type: 'string' },
// 				email: { type: 'string' }
// 			}
// 		}
// 	}},
//     async (request, reply) => {
//       const { username, password, email } = request.body
//       const now = Date.now()

//       const hash = await bcrypt.hash(password, 10)

//       try {
//         const info = await fastify.db.run(
//           `INSERT INTO users (username, password, email, created_at)
//            VALUES (?, ?, ?, ?)`,
//           username,
//           hash,
//           email ?? null,
//           now
//         )
//         return reply.code(201).send({ id: info.lastID })
//       } catch (err: any) {
//         // z.B. Unique-Constraint
//         return reply.code(409).send({ error: 'Username or email already exists' })
//       }
//     }
//   )
// //   fastify.post<{ Params: { username: string; password: string; email?: string } }>(
// //     '/api/users',
// //     async (request, reply) => {
// //       const { username, password, email } = request.params
// //       const now = Date.now()

// //       const hash = await bcrypt.hash(password, 10)

// //       try {
// //         const info = await fastify.db.run(
// //           `INSERT INTO users (username, password, email, created_at)
// //            VALUES (?, ?, ?, ?)`,
// //           username,
// //           hash,
// //           email ?? null,
// //           now
// //         )
// //         return reply.code(201).send({ id: info.lastID })
// //       } catch (err: any) {
// //         // z.B. Unique-Constraint
// //         return reply.code(409).send({ error: 'Username or email already exists' })
// //       }
// //     }
// //   )

//   fastify.post<{ Body: { username: string; password: string } }>(
//     '/api/login',
//     async (request, reply) => {
//       const { username, password } = request.body

//       const user = await fastify.db.get<UserRow>(
//         `SELECT * FROM users WHERE username = ?`,
//         username
//       )
//       if (!user) {
//         return reply.code(404).send({ error: 'User not found' })
//       }

//       const ok = await bcrypt.compare(password, user.password)
//       if (!ok) {
//         return reply.code(401).send({ error: 'Invalid credentials' })
//       }

//       const { password: _, ...safe } = user
//       return { user: safe }
//     }
//   )

//   fastify.delete<{ Params: { id: string } }>(
//     '/api/users/id/:id',
// 	async (request, reply) => {
// 		const {id} = request.params;
// 		const user = await fastify.db.run('DELETE FROM users WHERE id = ?', id)

// 		if (user.changes === 0) {
// 			// kein Datensatz gelöscht → 404
// 			return (reply.code(404).send({ error: 'User not found' }));
// 		}

// 		return reply
// 		.code(200)
// 		.send({ message: 'User succesfully deleted' })
// 		// return reply.code(204).send({message: "successfully deleted  user profile"});
// 	}
// 	)

//  // DELETE by username
//  fastify.delete<{ Params: { username: string } }>(
//     '/api/users/username/:username',
//     async (request, reply) => {
//       const { username } = request.params
//       const result = await fastify.db.run(
//         'DELETE FROM users WHERE username = ?',
//         username
//       )

//       if (result.changes === 0) {
//         return reply.code(404).send({ error: 'User not found' })
//       }

//       return reply.code(200)
// 	  			.send({ message: 'User succesfully deleted' })
//     }
//   )

//  fastify.delete<{ Params: { email: string } }>(
//     '/api/users/email/:email',
//     async (request, reply) => {
//       const { email } = request.params
//       const result = await fastify.db.run(
//         'DELETE FROM users WHERE email = ?',
//         email
//       )

//       if (result.changes === 0) {
//         return reply.code(404).send({ error: 'User not found' })
//       }

//       return reply.code(200).send({ message: 'User succesfully deleted' })
//     }
//   )

//   fastify.get<{ Params: { id: string } }>(
//     '/api/users/id/:id',
//     async (request, reply) => {
//       const { id } = request.params
//       const user = await fastify.db.get<UserRow>(
//         'SELECT id, username, email, created_at FROM users WHERE id = ?',
//         id
//       )
//       if (!user) {
//         return reply.code(404).send({ error: 'User not found' })
//       }
//       return user
//     }
//   )
//   fastify.get<{ Params: { username: string } }>(
//     '/api/users/username/:username',
//     async (request, reply) => {
//       const { username } = request.params
//       const user = await fastify.db.get<UserRow>(
//         'SELECT username, username, email, created_at FROM users WHERE username = ?',
//         username
//       )
//       if (!user) {
//         return reply.code(404).send({ error: 'User not found' })
//       }
//       return user
//     }
//   )
//   fastify.get<{ Params: { email: string } }>(
//     '/api/users/email/:email',
//     async (request, reply) => {
//       const { email } = request.params
//       const user = await fastify.db.get<UserRow>(
//         'SELECT email, username, email, created_at FROM users WHERE email = ?',
//         email
//       )
//       if (!user) {
//         return reply.code(404).send({ error: 'User not found' })
//       }
//       return user
//     }
//   )
// }

// src/routes/users.ts
import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcrypt";
import { type UserRow } from "../db/types.js";
import { createUser } from "../functions/user.ts";
import { info } from "console";
import { updateUser, type UpdateUserData } from "../functions/user.ts";
import { deleteUserById } from "../functions/user.ts";
import { getUserById } from "../functions/user.ts";

export const userRoutes: FastifyPluginAsync = async (fastify) => {
	//
	// CREATE
	//
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
						username: { type: "string" },
						password: { type: "string" },
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
				//siehe src/functions/user.ts
				// const info = await fastify.db.run(
				// 	`INSERT INTO users (username, password, email, created_at)
				// 	VALUES (?, ?, ?, ?)`,
				// 	username,
				// 	hash,
				// 	email ?? null,
				// 	Date.now()
				// );
				// return reply.code(201).send({ id : info.lastID });
				const id = await createUser(fastify, request.body);
				return reply.code(201).send({ id });
			} catch {
				return reply
					.code(409)
					.send({ error: "Username or email already exists" });
			}
		}
	);

	//
	// READ ALL
	//
	fastify.get<{
		Reply: Array<Pick<UserRow, "id" | "username" | "email" | "created_at">>;
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
								email: { type: ["string", "null"] },
								created_at: { type: "integer" },
							},
						},
					},
				},
			},
		},
		async () => {
			return fastify.db.all(
				"SELECT id, username, email, created_at FROM users"
			);
		}
	);

	//
	// READ ONE (by ID)
	//
	fastify.get<{
		Params: { id: number };
		Reply:
		| Pick<UserRow, "id" | "username" | "email" | "created_at">
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
							email: { type: ["string", "null"] },
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

	//
	// UPDATE (by ID)
	//
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
		// async (request, reply) => {
		// 	const { id } = request.params;
		// 	const { username, password, email } = request.body;
		// 	const updates: string[] = [];
		// 	const values: unknown[] = [];

		// 	if (username) {
		// 		updates.push("username = ?");
		// 		values.push(username);
		// 	}
		// 	if (email) {
		// 		updates.push("email = ?");
		// 		values.push(email);
		// 	}
		// 	if (password) {
		// 		updates.push("password = ?");
		// 		values.push(await bcrypt.hash(password, 10));
		// 	}

		// 	if (updates.length === 0) {
		// 		return reply.code(400).send({ error: "No fields to update" });
		// 	}

		// 	values.push(id);
		// 	const info = await fastify.db.run(
		// 		`UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
		// 		...values
		// 	);

		// 	if (info.changes === 0) {
		// 		return reply.code(404).send({ error: "User not found" });
		// 	}
		// 	return reply.code(200).send({ message: "User updated successfully" });
		// }
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
		// async (request, reply) => {
		// 	const result = await fastify.db.run(
		// 		"DELETE FROM users WHERE id = ?",
		// 		request.params.id
		// 	);
		// 	if (result.changes === 0) {
		// 		return reply.code(404).send({ error: "User not found" });
		// 	}
		// 	return reply.code(200).send({ message: "User deleted successfully" });
		// }
		async (request, reply) => {
			const { id } = request.params
			const deleted = await deleteUserById(fastify, id)

			if (!deleted) {
				return reply.code(404).send({ error: 'User not found' });
			}
			return reply.code(200).send({ message: 'User deleted successfully' });
		}
	);
};
