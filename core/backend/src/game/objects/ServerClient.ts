import { ServerVec2 } from './ServerVec2.ts'
import { ServerWall } from './ServerWall.ts'
import { SharedClient } from '../game_shared/objects/SharedClient.ts';
import type { WebSocket } from '@fastify/websocket';
import { Effects } from '../game_shared/serialization.ts';

export class ServerClient extends SharedClient {
	public socket?: WebSocket = undefined;
	public global_id: number;
	public origin: ServerVec2;
	declare public paddle: ServerWall;
	declare public base: ServerWall;
	public up: boolean = false;
	public down: boolean = false;
	public left: boolean = false;
	public right: boolean = false;

	constructor(
		paddle: ServerWall,
		base: ServerWall,
		ingame_id?: number,
		obj_id?: number,
	) {
		super(paddle, base, ingame_id, obj_id);
		paddle.effects.push(Effects.PADDLE);
		base.effects.push(Effects.BASE);
		this.origin = paddle.center.clone();
		this.paddle = paddle;
		this.base = base;
		this.global_id = 0;
	}

	public set_socket(socket: WebSocket) {
		this.socket = socket;
	}

	public update(delta_time: number) {
		const direct: ServerVec2 = this.paddle.get_direct();
		if (this.up) {
			const new_paddle_pos: ServerVec2 = this.paddle.center.clone();
			new_paddle_pos.add(direct.scale(0.01));
			if (new_paddle_pos.clone().sub(this.origin).len() < this.paddle.length) {
				this.paddle.center = new_paddle_pos;
				this.paddle.update();
			}
		}
		if (this.down) {
			const new_paddle_pos: ServerVec2 = this.paddle.center.clone();
			new_paddle_pos.add(direct.scale(-0.01));
			if (new_paddle_pos.clone().sub(this.origin).len() < this.paddle.length) {
				this.paddle.center = new_paddle_pos;
				this.paddle.update();
			}
		}
	}
};
