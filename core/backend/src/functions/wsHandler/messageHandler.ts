import type { ExtendedWebSocket, Message } from '../../types/wsTypes.js';
import type { LobbyInvite } from '../../game/game_shared/message_types.js';
import { LobbyType } from '../../game/game_shared/message_types.js';
import type { ClientParticipation } from '../../game/new/GameServer.js';
import { GameServer } from '../../game/new/GameServer.js';
import { type FastifyInstance } from 'fastify'
import { isBlocked } from '../block.js';
import { validateChat } from './wsValidate.js';

function ajvErrorToString(errors?: any[]) {
	if (!errors?.length) {
		return 'invalid'
	}
	const e = errors[0];
	return [e.instancePath || e.schemaPath, e.message].filter(Boolean).join(' ')
}

export async function handleWsMessage(
	fastify: FastifyInstance,
	userSockets: Map<number, Set<ExtendedWebSocket>>,
	extSocket: ExtendedWebSocket,
	msgRaw: any): Promise<void> {

	let msg: Message
	try {
		msg = JSON.parse(msgRaw.toString())
	} catch {
		return extSocket.send(JSON.stringify({ type: 'error', error: 'Invalid JSON' }))
	}

	switch (msg.type) {

		case 'direct_message': {
			if (!validateChat(msg)) {
				return extSocket.send(JSON.stringify({
					type: 'error',
					error: `Invalid message: ${ajvErrorToString(validateChat.errors)}`
				}))
			}
			const toId = msg.to as number
			const senderId = extSocket.userId!;

			//NEW: checking if friends
			// const senderFriends = await findUserWithFriends(fastify, senderId);
			// const isFriend = senderFriends?.friends.some(f => f.id === toId);

			// prevent sending message to myself
			if (toId === senderId) {
				return extSocket.send(JSON.stringify({
					type: 'error',
					error: 'Cannot message yourself'
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
					type: 'error',
					error: 'User not connected'
				}));
			}
			const invite: LobbyInvite = msg.content as LobbyInvite;
			const parti: ClientParticipation | undefined =
				GameServer.client_participations.get(senderId);
			if (!parti) {
				console.log("Warning: user that was not part of any lobby tried to invite");
				return;
			}
			if (invite.lobby_type == LobbyType.TOURNAMENT &&
				parti.tournament_id != invite.lobby_id
			) {
				console.log("Warning: user tried to invite to a tournament he was not part of");
				return;
			} else if (invite.lobby_type != LobbyType.TOURNAMENT &&
				parti.lobby_id != invite.lobby_id
			) {
				console.log("Warning: user tried to invite to a match he was not part of");
				return;
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
			//fabi: at the moment not, do we need to?
		}
		// case 'ping': {
		// 	return extSocket.send(JSON.stringify({ type: 'pong' }))
		// }

		// // /*
		// 	// TODO: Add case 'LobbyInvite'
		// //  */
		// case 'LobbyInvite' : {
		// 	const toId = msg.to as number;
		// 	if (await isBlocked(fastify, toId, extSocket.userId!)) {
		// 		return extSocket.send(JSON.stringify({
		// 			type: 'error',
		// 			error: 'Your messages are blocked by this user'
		// 		}))
		// 	}
		// 	if (await isBlocked(fastify, extSocket.userId!, toId)) {
		// 		return extSocket.send(JSON.stringify({
		// 			type: 'error',
		// 			error: 'You have blocked this user'
		// 		}))
		// 	}
		// 	/*
		// 	 * I don't know how the live chat works, so pseudo example code here:
		// 	 * const msg: LiveChatMsg = {
		// 	 *	type: 'LobbyInvite',
		// 	 *	target_user: target_user_id,
		// 	 *	data: invite,
		// 	 * };
		// 	 * livechat_ws.send(msg);
		// 	*/
		// 	const targets = userSockets.get(msg.to)
		// 	if (!targets?.size) {
		// 		return extSocket.send(JSON.stringify({
		// 			type: 'error',
		// 			error: 'User not connected'
		// 		}))
		// 	}
		// 	for (const tsock of targets) {
		// 		tsock.send(JSON.stringify({
		// 			type: 'LobbyInvite',
		// 			from: extSocket.userId,
		// 			content: msg.content,
		// 			ts: Date.now()
		// 		}))
		// 	}
		// 	return

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
