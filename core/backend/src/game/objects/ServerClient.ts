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
	/* improve glitchy intersection calculation by not changing direction within 1 frame */
	//private _last_up: boolean = false;
	//private _last_down: boolean = false;
	private _last_left: boolean = false;
	private _last_right: boolean = false;
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
		this.changed = true;
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
			//this.changed = true;
		}
		if (this.down) {
			new_paddle_pos.add(direct.scale(-0.12));
		}
		if (this.up || this.down) {
			this.paddle.center = new_paddle_pos;
			this.paddle.update();
		}

		if (this.left && this.right) {
			this.paddle.rotation = 0;
			this._last_left = false;
			this._last_right = false;
		} else if (this.left && !this._last_right) {
			this.paddle.rotation = Math.PI / 2;
			this._last_left = true;
		} else if (this.right && !this._last_left) {
			this.paddle.rotation = Math.PI / -2;
			this._last_right = true;
		} else {
			this.paddle.rotation = 0;
			this._last_left = false;
			this._last_right = false;
		}
		this.paddle.update();
	}
};
