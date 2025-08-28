import type { FastifyInstance } from 'fastify'
import type { WebSocket } from '@fastify/websocket' // <-- use 'import type'
import { findUserWithFriends, setUserLive } from '../../functions/user.js'
import { type ExtendedWebSocket } from '../../types/wsTypes.js'

// interface ExtendedWebSocket extends WebSocket {
// 	userId?: number
// 	isAlive?: boolean
// }

export async function notifyFriendStatus(
	fastify: FastifyInstance,
	userSockets: Map<number, Set<ExtendedWebSocket>>,
	userId: number,
	online: boolean
) {
	const myFriends = await findUserWithFriends(fastify, userId)
	if (!myFriends)
		return
	for (const friendId of myFriends.friends.map(f => f.id)) {
		const sockets = userSockets.get(friendId)
		if (!sockets)
			continue ;
		for (const sock of sockets) {
			sock.send(JSON.stringify({
				type: 'friend_status_update',
				friendId: userId,
				online
			}))
		}
	}

	// for user checking his own profile
	const mySockets = userSockets.get(userId)
	if (!mySockets)
		return
	for (const sock of mySockets) {
		sock.send(JSON.stringify({
			type: 'friend_status_update',
			friendId: userId,
			online
		}))
	}
}
