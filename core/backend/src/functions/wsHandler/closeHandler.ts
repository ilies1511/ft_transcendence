import { WebSocket } from 'ws'
import { type FastifyInstance } from 'fastify'
import type { ExtendedWebSocket } from '../../types/wsTypes.ts'
import { findUserWithFriends, setUserLive } from '../user.ts'

export async function handleClose(
	app: FastifyInstance,
	userSockets: Map<number, Set<ExtendedWebSocket>>,
	extSocket: ExtendedWebSocket
): Promise<void> {
	await setUserLive(app, extSocket.userId!, false)
	const set = userSockets.get(extSocket.userId!)
	if (set) {
		set.delete(extSocket)
		if (set.size === 0) userSockets.delete(extSocket.userId!)
	}

	const friends = await findUserWithFriends(app, extSocket.userId!)
	if (!friends) {
		app.log?.debug?.(`closeHandler: user ${extSocket.userId} not found (probably deleted); skipping notifications`)
		return
	}

	for (const friend of friends.friends) {
		const targets = userSockets.get(friend.id)
		if (!targets) continue
		for (const ws of targets) {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({
					type: 'friend_status_update',
					friendId: extSocket.userId,
					online: 0
				}))
			}
		}
	}
}
