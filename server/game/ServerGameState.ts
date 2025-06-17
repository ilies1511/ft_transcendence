export class ServerGameState {
	private _last_game_tick: number = 0;
	private _next_obj_id: number = 1;//has to start at 1
	private _interval: NodeJS.Timeout | null = null;
	public frame_time: number = 1000 / 60;
	running: boolean = false;
	public options: GameOptions;
	public clients: Client[] = [];
	public balls: Ball[] = [];
	public walls: Wall[] = [];

	constructor(options: GameOptions) {
		this.options = options;
	}

	serialize_game_state(): ArrayBuffer {
		const state = new GameState(this);
		return state.serialize();
	}

	send_game_state(ws: WebSocket) {
		ws.send(this.serialize_game_state());
	}

	public init() {
		this.running = true;
		const game_state: GameState = new GameState(this);
		const parse_map = (map_name?: string) => {
			map_name = map_name || "default";
			let map_data: any;
			if (map_name == "default") {
				map_data = default_map;
			} else {
				throw new Error("Unknown map name");
			}
			console.log(map_data);
			Object.values(map_data.walls).forEach((w: any) => {
				const cent: vec2 = new vec2(w.center[0], w.center[1]);
				const nor: vec2 = new vec2(w.normal[0], w.normal[1]);
				const len: number = w.length;
				this.walls.push(new Wall(cent, nor, len, undefined, this._next_obj_id++));
			});
		}
		parse_map("default");

		const ball: Ball = new Ball();
		ball.speed.x = 830;
		ball.speed.y = 970;
		ball.pos.x = -1;
		ball.obj_id = this._next_obj_id++;
		this.balls.push(ball);
		console.log(this.walls);
		console.log(this.balls);
		this.start_loop();
	}

	private broadcast_game_state() {
		const buffer = this.serialize_game_state();
		for (const client of this.clients) {
			if (client.socket.readyState === client.socket.OPEN) {
				client.socket.send(buffer);
			}
		}
	}

	private update_balls() {
		for (const ball of this.balls) {
			//console.log(ball);
			let delta_time: number = this.frame_time / 1000;
			while (delta_time > EPSILON) {
				//console.log("delta time: ", delta_time);
				const intersecs: ft_math.intersection_point[] = [];
				for (const wall of this.walls) {
					//console.log(wall);
					const intersection: ft_math.intersection_point | undefined =
						ball.intersec(wall, delta_time);
					if (intersection !== undefined) {
						if (intersecs.length == 0) {
							intersecs.push(intersection);
						} else {
							const diff: number =
								intersection.time - intersecs[0].time;
							if (Math.abs(diff) < EPSILON) {
								intersecs.push(intersection);
							} else if (diff < 0) {
								intersecs.length = 0;
								intersecs.push(intersection);
							}
						}
						//intersecs.push(intersection);
					}
				}

				if (intersecs.length) {
					//console.log("interec count: ", intersecs.length);
					//console.log(intersecs);
					let first_intersec: ft_math.intersection_point = intersecs[0];
					const hit_walls: Wall[] = [];

					for (const intersc of intersecs) {
						if (intersc.time < first_intersec.time) {
							first_intersec = intersc;
						}
						ball.cur_collision_obj_id.push(intersc.wall.obj_id);
						hit_walls.push(intersc.wall);
					}

					delta_time -= first_intersec.time;
					delta_time -= EPSILON; /* idk why but without this the ball flys through walls */
					ball.pos = first_intersec.p;
					ball.reflect(hit_walls);

					ball.last_collision_obj_id = ball.cur_collision_obj_id;
					ball.cur_collision_obj_id = [];
				} else {
					const ball_movement: vec2 = ball.speed.clone()
					ball_movement.scale(delta_time);
					ball.pos.add(ball_movement);
					delta_time = 0
				}
				if (ball.pos.x == Infinity || isNaN(ball.pos.x)) {
					console.log("error: ball data corrupted: ", ball);
					process.exit(1);
				}
			}
		}
	}

	/* 1. update walls (idk if this will be feature, for now ignore)
	 * 2. update balls
	 * 3. broadcast */
	private update() {
		//console.log("update");
		//this.walls[0].center.y += 0.01;//for testing move the wall
		//for (const ball of this.balls) {
		//	console.log(ball);
		//}
		//for (const wall of this.walls) {
		//	console.log(wall);
		//}
		this.update_balls();
		this.broadcast_game_state();
	}

	private start_loop() {
		if (this._interval) return;
		this.running = true;

		this._interval= setInterval(() => {
			try {
				this.update();
			} catch (e) {
				console.error("game update error:", e);
			}
		}, this.frame_time);
	}

	private stop_loop() {
		if (this._interval) {
			clearInterval(this._interval);
			this._interval = null;
		}
		this.running = false;
	}
};
