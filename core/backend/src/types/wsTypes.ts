import type { WebSocket } from '@fastify/websocket'

export const userSockets = new Map<number, Set<ExtendedWebSocket>>()

export interface ExtendedWebSocket extends WebSocket {
	userId?: number
	isAlive?: boolean
}

export type Message =
	| { type: 'direct_message'; to: number; content: string }
	| { type: 'ping' }
	| { type: string;[key: string]: any }
