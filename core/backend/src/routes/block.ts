import type { FastifyPluginAsync } from "fastify";
import { blockUser, unblockUser, getBlockedUsersList } from "../functions/block.ts";

export const blockRoutes: FastifyPluginAsync = async (fastify) => {
	//block
	fastify.post<{
		Params: { id: number; targetId: number }
	}>(
		'/api/users/:id/block/:targetId',
		{
			schema: {
				tags: ['block']
			}
		},
		async (req, reply) => {
			const { id, targetId } = req.params
			if (id === targetId) {
				return reply.code(400).send({ error: "Can't block yourself" })
			}
			const ok = await blockUser(fastify, id, targetId);
			if (!ok) {
				return reply.send({ message: 'User to block not found' })
			}
			return reply.send({ message: 'User blocked' })
		}
	)

	// Unblock
	fastify.delete<{
		Params: { id: number; targetId: number }
	}>(
		'/api/users/:id/block/:targetId',
		{
			schema: {
				tags: ['block']
			}
		},
		async (req, reply) => {
			const { id, targetId } = req.params
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
