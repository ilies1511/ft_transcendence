import type { ExtendedWebSocket, Message} from '../../types/wsTypes.ts';
import { type FastifyInstance } from 'fastify'

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
			const targets = userSockets.get(msg.to)
			if (!targets?.size) {
				return extSocket.send(JSON.stringify({
					type: 'error',
					error: 'User not connected'
				}))
			}
			for (const tsock of targets) {
				tsock.send(JSON.stringify({
					type: 'direct_message',
					from: extSocket.userId,
					content: msg.content,
					ts: Date.now()
				}))
			}
			return
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
