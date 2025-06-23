import { ServerVec2 } from './ServerVec2.ts'
import { ServerWall } from './ServerWall.ts'
import { SharedClient } from '../game_shared/objects/SharedClient.ts';
import type { WebSocket } from '@fastify/websocket';
import { Effects } from '../game_shared/serialization.ts';

export class ServerClient extends SharedClient {
	public socket?: WebSocket = undefined;
	public global_id: number;
	declare public paddle: ServerWall;
	declare public base: ServerWall;

	constructor(
		paddle: ServerWall,
		base: ServerWall,
		ingame_id?: number,
		obj_id?: number,
	) {
		super(paddle, base, ingame_id, obj_id);
		paddle.effects.push(Effects.PADDLE);
		base.effects.push(Effects.BASE);
		this.paddle = paddle;
		this.base = base;
		this.global_id = 0;
	}

	public set_socket(socket: WebSocket) {
		this.socket = socket;
	}
};
