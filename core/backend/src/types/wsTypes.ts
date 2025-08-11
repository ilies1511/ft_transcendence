import type { WebSocket } from '@fastify/websocket'
import type { LobbyInvite } from '../../src/game/game_shared/message_types.ts';

export const userSockets = new Map<number, Set<ExtendedWebSocket>>()

export interface ExtendedWebSocket extends WebSocket {
	userId?: number
	isAlive?: boolean
}

export type Message =
	| { type: 'direct_message'; to: number; content: string }
	| { type: 'lobby_invite'; to: number; content: LobbyInvite } //TODO: do we need to add from usuer id?
	| { type: 'new_friend_request'; to:number; requestId:number; from:string }
	| { type: 'ping' }
	| { type: string;[key: string]: any }
