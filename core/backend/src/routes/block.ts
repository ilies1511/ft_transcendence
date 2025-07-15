import type { FastifyPluginAsync } from "fastify";
import { blockUser, unblockUser } from "../functions/block.ts";

export const blockRoutes: FastifyPluginAsync = async (fastify) => {
	//block
	fastify.post<{
		Params: { id: number; targetId: number }
	}>(
		'/api/users/:id/block/:targetId',
		async (req, reply) => {
			const { id, targetId } = req.params
			if (id === targetId) {
				return reply.code(400).send({ error: "Can't block yourself" })
			}
			await blockUser(fastify, id, targetId)
			return reply.send({ message: 'User blocked' })
		}
	)

	// Unblock
	fastify.delete<{
		Params: { id: number; targetId: number }
	}>(
		'/api/users/:id/block/:targetId',
		async (req, reply) => {
			const { id, targetId } = req.params
			const ok = await unblockUser(fastify, id, targetId)
			if (!ok) return reply.code(404).send({ error: 'No such block' })
			return reply.send({ message: 'User unblocked' })
		}
	)
}

/*
	curl -i -X POST http://localhost:3000/api/users/1/block/2

	curl -i -X DELETE http://localhost:3000/api/users/1/block/2
*/
