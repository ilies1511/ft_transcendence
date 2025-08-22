import type { FastifyPluginAsync } from "fastify";
import { blockUser, unblockUser, getBlockedUsersList } from "../functions/block.ts";
import { areFriends, removeFriend } from "../functions/friends.ts";
import { blockUserSchema, unblockUserSchema } from "../schemas/block.ts";

export const blockRoutes: FastifyPluginAsync = async (fastify) => {
	//block
	fastify.post<{
		Params: { id: number; targetId: number }
		Reply: { message: string } | { error: string }
	}>(
		'/api/users/:id/block/:targetId',
		{
			schema: blockUserSchema
		},
		async (req, reply) => {
			const { id, targetId } = req.params
			const authUserId = (req.user as any).id

			if (req.params.id !== authUserId) {
				return reply.code(403).send({ error: 'Forbidden' })
			}
			if (id === targetId) {
				return reply.code(400).send({ error: "Can't block yourself" })
			}
			const ok = await blockUser(fastify, id, targetId);
			if (!ok) {
				return reply.send({ message: 'User to block not found' })
			}
			if (await areFriends(fastify, id, targetId)) {
				await removeFriend(fastify, id, targetId);
			}
			return reply.send({ message: 'User blocked and friendship removed' })
		}
	)

	// Unblock
	fastify.delete<{
		Params: { id: number; targetId: number }
		Reply: { message: string } | { error: string }
	}>(
		'/api/users/:id/block/:targetId',
		{
			schema: unblockUserSchema
		},
		async (req, reply) => {
			const { id, targetId } = req.params
			const authUserId = (req.user as any).id

			if (req.params.id !== authUserId) {
				return reply.code(403).send({ error: 'Forbidden' })
			}
			if (id === targetId) {
				return reply.code(400).send({ error: "Can't unblock yourself" })
			}
			const ok = await unblockUser(fastify, id, targetId)
			if (!ok) return reply.code(404).send({ error: 'No such block' })
			return reply.send({ message: 'User unblocked' })
		}
	)

	// fastify.get<{
	// 	Params: { id: number}
	// }>(
	// 	'/api/users/:id/block',
	// 	async (req, reply) => {
	// 		const { id } = req.params
	// 		const blockedUsers = await getBlockedUsersList(fastify, id);

	// 		if (blockedUsers === undefined) {
	// 			return reply.code(404).send({ error: `No user with id ${id}`})
	// 		}
	// 		return blockedUsers;
	// 	}
	// )

	fastify.get<{
		Params: { id: number }
		Reply: number[]
	}>(
		'/api/users/:id/block',
		{
			schema: {
				tags: ['block'],
				params: {
					type: 'object',
					required: ['id'],
					properties: { id: { type: 'integer' } }
				},
				response: {
					200: {
						type: 'array',
						items: { type: 'integer' }
					}
				}
			}
		},
		async (req, reply) => {
			const { id } = req.params;
			// const blockedUsers = await getBlockedUsersList(fastify, id);
			const blockedUsers = await getBlockedUsersList(fastify, id);
			return blockedUsers;
		}
	)
}

/*
	TODO:
	- for GDPR --> Add getBlockedUsersList() -> returns an array of blocked users
	-
*

/*
	curl -i -X POST http://localhost:3000/api/users/1/block/2

	curl -i -X DELETE http://localhost:3000/api/users/1/block/2
*/
