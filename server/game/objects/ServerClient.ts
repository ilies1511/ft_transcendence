import { ServerVec2 } from './ServerVec2.ts'
import { SharedClient } from 'game_shared/objects/SharedClient.ts';
import type { WebSocket } from '@fastify/websocket';

export class ServerClient extends SharedClient {
	public socket: WebSocket;

	constructor(
		socket: WebSocket,
		pos?: ServerVec2,
		id?: number,
		direct?: ServerVec2,
		obj_id?: number,
	) {
		super(pos, id, direct, obj_id);
		this.socket = socket;
	}
};
