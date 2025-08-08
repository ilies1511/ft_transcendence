import type { ExtendedWebSocket, Message} from '../../types/wsTypes.ts';
import { type FastifyInstance } from 'fastify'
import { isBlocked } from '../block.ts';
import { findUserWithFriends } from '../user.ts';

export async function handleWsMessage(
	fastify: FastifyInstance,
	userSockets: Map<number, Set<ExtendedWebSocket>>,
	extSocket: ExtendedWebSocket,
	msgRaw: any ): Promise<void>
{
	let msg: Message
	try {
		msg = JSON.parse(msgRaw.toString())
	} catch {
		return extSocket.send(JSON.stringify({ type: 'error', error: 'Invalid JSON' }))
	}

	switch (msg.type) {

		case 'direct_message': {
			const toId = msg.to as number
			const senderId = extSocket.userId!;

			//NEW: checking if friends
			const senderFriends = await findUserWithFriends(fastify, senderId);
			const isFriend = senderFriends?.friends.some(f => f.id === toId);
			if (!isFriend) {
				return extSocket.send(JSON.stringify({
					type: 'error',
					error: 'You can only message friends'
				}));
			}

			if (await isBlocked(fastify, toId, extSocket.userId!)) {
				return extSocket.send(JSON.stringify({
					type: 'error',
					error: 'Your messages are blocked by this user'
				}))
			}
			if (await isBlocked(fastify, extSocket.userId!, toId)) {
				return extSocket.send(JSON.stringify({
					type: 'error',
					error: 'You have blocked this user'
				}))
			}
			const targets = userSockets.get(msg.to)
			if (!targets?.size) {
				return extSocket.send(JSON.stringify({
					type: 'error',
					error: 'User not connected'
				}))
			}

			const timestamp = Date.now();
			for (const tsock of targets) {
				tsock.send(JSON.stringify({
					type: 'direct_message',
					from: extSocket.userId,
					content: msg.content,
					ts: timestamp
				}))
			}
			//NEW: echo back sender his message for its own UI/history
			extSocket.send(JSON.stringify({
				type: 'direct_message',
				from: senderId,
				content: msg.content,
				ts: timestamp
			}));

			return;
		}
		case 'lobby_invite': {
			const toId = msg.to as number
			const senderId = extSocket.userId!;

			const targets = userSockets.get(toId);

			if (!targets?.size) {
				return extSocket.send(JSON.stringify({
					type:  'error',
					error: 'User not connected'
				}));
			}

			for (const tsock of targets) {
				tsock.send(JSON.stringify({
					type: 'lobby_invite',
					from: senderId,
					content: msg.content,
				}));
			}

			return;
			//TODO: Do we send something back to the inviter?
		}
		// case 'ping': {
		// 	return extSocket.send(JSON.stringify({ type: 'pong' }))
		// }
		default: {
			return extSocket.send(JSON.stringify({
				type: 'error',
				error: `Unknown message type ${msg.type}`
			}))
		}
	}
}

/*
	TEST in Postman:
{
	"type":    "direct_message",
	"to":      2,
	"content": "Aloooooo"
}
*/
