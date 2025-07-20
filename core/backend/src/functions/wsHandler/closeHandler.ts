import type { ExtendedWebSocket } from '../../types/wsTypes.ts';
import { type FastifyInstance } from 'fastify'
import { setUserLive } from '../user.ts';
import { findUserWithFriends } from '../user.ts';

export async function handleClose(
	app: FastifyInstance,
	userSockets: Map<number, Set<ExtendedWebSocket>>,
	extSocket: ExtendedWebSocket): Promise<void>
{
	await setUserLive(app, extSocket.userId!, false)
	const set = userSockets.get(extSocket.userId!)
	if (set) {
		set.delete(extSocket)
		if (set.size === 0) userSockets.delete(extSocket.userId!)
	}
	const friends = await findUserWithFriends(app, extSocket.userId!)
	console.log(friends);
	if (!friends) {
		// throw error(friends);
		throw new Error(`findUserWithFriends returned null for user ${extSocket.userId}`)
	}
	console.log("ALoo0");
	for (const client of app.websocketServer.clients) {
		const c = client as ExtendedWebSocket;
		if (c.readyState !== WebSocket.OPEN || c.userId === undefined) {
			continue;
		}

		console.log("ALoo1");
		for (const friend of friends.friends) {
			console.log(friend);
			console.log(extSocket.userId);
			console.log(c.userId);
			if ((friend.id !== extSocket.userId && friend.id === c.userId)) {
				console.log("ALoo2");
				c.send(JSON.stringify({
					type: 'friend_status_update',
					friendId: extSocket.userId,
					online: 0
				}));
			}
		}
	}
}
