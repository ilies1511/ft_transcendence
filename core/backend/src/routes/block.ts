import type { FastifyPluginAsync } from "fastify";
import { blockUser, unblockUser, getBlockedUsersList } from "../functions/block.ts";
import { areFriends, removeFriend } from "../functions/friends.ts";
import { blockListSchema, blockUserSchema, unblockUserSchema } from "../schemas/block.ts";
import { getUserId } from "../functions/user.ts";
import { userSockets } from '../types/wsTypes.ts';
import WebSocket from 'ws';

export const blockRoutes: FastifyPluginAsync = async (fastify) => {
	//block
	fastify.post<{
		Params: { targetId: number }
		Reply: { message: string } | { error: string }
	}>(
		// '/api/users/:id/block/:targetId',
		'/api/me/block/:targetId',
		{
			schema: blockUserSchema
		},
		async (req, reply) => {
			const { targetId } = req.params
			// const authUserId = (req.user as any).id
			const authUserId = await getUserId(req);

			// if (req.params.id !== authUserId) {
			// 	return reply.code(403).send({ error: 'Forbidden' })
			// }
			if (authUserId === targetId) {
				return reply.code(400).send({ error: "Can't block yourself" })
			}
			const ok = await blockUser(fastify, authUserId, targetId);
			if (!ok) {
				return reply.code(404).send({ error: 'User to block not found' })
			}
			if (await areFriends(fastify, authUserId, targetId)) {
				await removeFriend(fastify, authUserId, targetId);
			}
			// TODO: 25.08 dilin --> broadcast via websocket (FE & BE)
			await fastify.db.run(
				`DELETE FROM friend_requests WHERE responded_at IS NULL AND (
				(requester_id = ? AND recipient_id = ?) OR
				(requester_id = ? AND recipient_id = ?) )`,
				authUserId, targetId, targetId, authUserId)

			const blockerSockets = userSockets.get(authUserId);
			if (blockerSockets) {
				for (const ws of blockerSockets) {
					if (ws.readyState === WebSocket.OPEN) {
						ws.send(JSON.stringify({ type: 'block_changed', blockedId: targetId, am_blocker: true }));
					}
				}
			}
			const blockedSockets = userSockets.get(targetId);
			if (blockedSockets) {
				for (const ws of blockedSockets) {
					if (ws.readyState === WebSocket.OPEN) {
						ws.send(JSON.stringify({ type: 'block_changed', blockerId: authUserId, am_blocked: true }));
					}
				}
			}

			return reply.send({ message: 'User blocked, friendship and pending requests removed' })
		}
	)

	// Unblock
	fastify.delete<{
		// Params: { id: number; targetId: number }
		Params: { targetId: number }
		Reply: { message: string } | { error: string }
	}>(
		// '/api/users/:id/block/:targetId',
		'/api/me/block/:targetId',
		{
			schema: unblockUserSchema
		},
		async (req, reply) => {
			const { targetId } = req.params
			const authUserId = await getUserId(req);

			// if (req.params.id !== authUserId) {
			// 	return reply.code(403).send({ error: 'Forbidden' })
			// }
			if (authUserId === targetId) {
				return reply.code(400).send({ error: "Can't unblock yourself" })
			}
			const ok = await unblockUser(fastify, authUserId, targetId)
			if (!ok) {
				return reply.code(404).send({ error: 'No such block' })
			}

			const blockerSockets = userSockets.get(authUserId);
			if (blockerSockets) {
				for (const ws of blockerSockets) {
					if (ws.readyState === WebSocket.OPEN) {
						ws.send(JSON.stringify({ type: 'unblock_changed', unblockedId: targetId, am_unblocker: true }));
					}
				}
			}
			const unblockedSockets = userSockets.get(targetId);
			if (unblockedSockets) {
				for (const ws of unblockedSockets) {
					if (ws.readyState === WebSocket.OPEN) {
						ws.send(JSON.stringify({ type: 'unblock_changed', unblockerId: authUserId, am_unblocked: true }));
					}
				}
			}

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
		// Params: { id: number }
		Reply: number[] | { error: string }
	}>(
		// '/api/users/:id/block',
		'/api/me/block',
		{
			schema: blockListSchema
		},
		async (req, reply) => {
			// const { id } = req.params;
			// const authUserId = (req.user as any).id
			const authUserId = await getUserId(req);

			// if (id !== authUserId) {
			// 	return reply.code(403).send({ error: 'Forbidden' })
			// }
			const blockedUsers = await getBlockedUsersList(fastify, authUserId);
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
