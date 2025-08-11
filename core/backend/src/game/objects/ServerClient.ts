import { ServerVec2 } from './ServerVec2.ts'
import { ServerWall } from './ServerWall.ts'
import { ServerBall } from './ServerBall.ts'
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
	public final_placement: number = -1;

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

	public loose() {
		console.log("Client ", this.global_id, " lost");
		this.base.effects = this.base.effects.filter(e => e !== Effects.BASE);
		console.log(this.base);
	}

	public set_socket(socket: WebSocket) {
		this.socket = socket;
	}

	// todo: check for ball collisions and
	// potentally push them by altering their position and speed
	public update(balls: ServerBall[], delta_time: number) {
		const direct: ServerVec2 = this.paddle.get_direct();
		const new_paddle_pos: ServerVec2 = this.paddle.center.clone();
		if (this.up) {
			new_paddle_pos.add(direct.scale(0.12));
		}
		if (this.down) {
			new_paddle_pos.add(direct.scale(-0.12));
		}
		if (this.up || this.down) {
			let p1: vec2, p2:vec2 = this.paddle.get_endpoints();
			const p1_old = p1;
			const p2_old = p2;
			this.paddle.center = new_paddle_pos;
			this.paddle.update();
			p1, p2 = this.paddle.get_endpoints();
			const p1_new = p1;
			const p2_new = p2;
			for (const ball of balls) {

			}

		}

		if (this.left && this.right) {
			this.paddle.rotation = 0;
		} else if (this.left) {
			this.paddle.rotation = Math.PI / 2;
		} else if (this.right) {
			this.paddle.rotation = Math.PI / -2;
		} else {
			this.paddle.rotation = 0;
		}
	}
};
