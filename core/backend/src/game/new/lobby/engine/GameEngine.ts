import Fastify from 'fastify';
//import websocketPlugin, { SocketStream } from '@fastify/websocket'
import type { fastifyWebsocket } from '@fastify/websocket';
import websocketPlugin from '@fastify/websocket';
import type { FastifyInstance, FastifyRequest } from 'fastify';
//import websocketPlugin, { SocketStream } from '@fastify/websocket'
//import type { ClientToGameMessage } from '../../game_shared/message_types';
import type { WebSocket } from '@fastify/websocket';
import { LobbyType, type ClientToGame } from './../../../game_shared/message_types.ts';
import type {
	GameOptions,
	GameStartInfo,
	LobbyToClientJson,
	ServerToClientMessage,
	GameToClientFinish,
	ClientToGameInput,
} from './../../../game_shared/message_types.ts';
import { SharedVec2 } from './../../../game_shared/objects/SharedVec2.ts';


import { MapFile } from './../maps/Map.ts';

//import type { GameOptions, GameStartInfo, ServerToClientJson, ServerToClientMessage } from '../../game_shared/message_types';

import { Effects, GameState }
	from './../../../game_shared/serialization.ts';

import { ServerVec2 } from './../../../objects/ServerVec2.ts';
import { ServerWall } from './../../../objects/ServerWall.ts';
import { ServerBall } from './../../../objects/ServerBall.ts';
import { ServerClient } from './../../../objects/ServerClient.ts';

import * as ft_math from './../../../math.ts';

const EPSILON: number = 1e-6;

let i: number = 0;

//todo: split this into smaller classes
export class GameEngine {
	private _next_obj_id: number = 1;//has to start at 1
	private _interval: NodeJS.Timeout | null = null;
	public frame_time: number = 1000 / 60;
	public running: boolean = false;
	public finished: boolean = false;
	public connected_client_count: number = 0;
	public clients: ServerClient[] = [];
	public balls: ServerBall[] = [];
	public walls: ServerWall[] = [];
	private _alive_player_count: number;
	private _finish_callback: (end_data: GameToClientFinish) => undefined;
	private _duration: number = 0;
	public timer?: number;//seconds left of the game
	public lobby_type: LobbyType;

	constructor(map_name: string,
		lobby_type: LobbyType,
		finish_callback: (end_data: GameToClientFinish) => undefined,
		duration?: number,
	) {
		this.update = this.update.bind(this);
		this._finish_callback = finish_callback;
		this.lobby_type = lobby_type;
		this.timer = duration;

		this.running = false;
		const map: MapFile = new MapFile(map_name);
		this._alive_player_count = map.clients.length;
		this._next_obj_id = map.next_obj_id;

		this.walls = map.walls;
		for (const client of map.clients) {
			this.walls.push(client.base);
			this.walls.push(client.paddle);
		}
		this.balls = map.balls;
		this.clients = map.clients;

		//const ball: ServerBall = new ServerBall();
		//ball.speed.x = -1;
		//ball.speed.y = -3;
		//ball.pos.x = 0;
		//ball.obj_id = this._next_obj_id++;
		//this.balls.push(ball);
		//console.log(this.walls);
		//console.log(this.balls);
		//this.start_loop();
	}

	//for debugging callable by the client
	//todo
	private _reset() {
		for (const ball of this.balls) {
			ball.reset();
		}
		for (const wall of this.walls) {
			// wall.reset();//does not exist
		}
	}

	private serialize_game_state(): ArrayBuffer {
		const state = new GameState(this);
		//logGameState(state);
		//console.log(state);
		return state.serialize();
	}

	private broadcast_game_state() {
		const buffer = this.serialize_game_state();
		for (const client of this.clients) {
			// invalid or local client
			if (client.global_id <= 0) {
				continue ;
			}
			if (client.socket && client.socket.readyState === client.socket.OPEN) {
				client.socket.send(buffer);
			}
		}
	}

	private _finish_game() {
		console.log("Finishing game engine..");
		this.finished = true;
		this.stop_loop();
		const msg: GameToClientFinish = {
			type: 'finish',
			duration: this._duration,
			mode: this.lobby_type,
			placements: [],
		};
		let unplaced_player_count: number = 0;

		for (const client of this.clients) {
			if (client.global_id == 0) {
				continue ;
			}
			if (client.final_placement == -1) {
				unplaced_player_count++;
			}
		}

		let next_placement: number = 1;
		// fill out placements of players that did not die
		while (unplaced_player_count > 0) {
			let highest_health: number = 1;
			let clients_to_place: ServerClient[] = [];
			for (const client of this.clients) {
				if (client.global_id == 0 || client.final_placement != -1) {
					continue ;
				}
				if (client.score > highest_health) {
					highest_health = client.score;
					clients_to_place = [];
				}
				if (client.score == highest_health) {
					clients_to_place.push(client);
				}
			}
			for (const client of clients_to_place) {
				client.final_placement = next_placement;
			}
			unplaced_player_count -= clients_to_place.length;
			next_placement += clients_to_place.length;
		}
		if (unplaced_player_count < 0) {
			console.log("ERROR: game: unplaced_player_count < 0: logic bug");
		}
		for (const client of this.clients) {
			if (client.global_id == 0) {
				continue ;
			}
			msg.placements.push({
				id: client.global_id,
				final_placement: client.final_placement,
			});
		}
		for (const client of this.clients) {
			if (client.global_id == 0) {
				continue ;
			}
			if (client.socket && client.socket.readyState === client.socket.OPEN) {
				console.log("sending: ", msg);
				if (client.global_id > 0) {
					client.socket.send(JSON.stringify(msg));
				}
			}
			if (client.socket) {
				client.socket.close();
				client.socket = undefined;
			}
		}
		this._finish_callback(msg);
	}

	private update_balls(delta_time: number) {
		const input_d_time: number = delta_time;
		for (const ball of this.balls) {
			if (Math.abs(ball.pos.x) > 100 || Math.abs(ball.pos.y) > 100) {
				ball.reset();
				continue ;
			}
			delta_time = input_d_time;
			//console.log(ball);
			while (delta_time > EPSILON) {
				//console.log("delta time: ", delta_time);
				const intersecs: ft_math.intersection_point[] = [];
				for (const wall of this.walls) {
					//console.log(wall);
					const intersection: ft_math.intersection_point | undefined =
						ball.intersec(wall, delta_time);
					if (intersection === undefined) {
						continue ;
					}
					if (intersecs.length == 0) {
						intersecs.push(intersection);
						continue ;
					}
					const diff: number = intersection.time - intersecs[0].time;
					if (Math.abs(diff) < EPSILON) {
						intersecs.push(intersection);
					} else if (diff < 0) {
						intersecs.length = 0;
						intersecs.push(intersection);
					}
				}

				if (!intersecs.length) {
					const ball_movement: ServerVec2 = ball.speed.clone()
					ball_movement.scale(delta_time);
					ball.pos.add(ball_movement);
					break ;
				}
				//console.log("interec count: ", intersecs.length);
				//console.log(intersecs);
				let first_intersec: ft_math.intersection_point = intersecs[0];
				const hit_walls: ServerWall[] = [];
				const hit_points: ServerVec2[] = [];
				for (const intersc of intersecs) {
					if (intersc.time < first_intersec.time) {
						first_intersec = intersc;
					}
					ball.cur_collision_obj_id.push(intersc.wall.obj_id);
					hit_walls.push(intersc.wall);
					hit_points.push(intersc.p);
				}
				delta_time -= first_intersec.time;
				delta_time -= EPSILON; /* idk why but without this the ball flys through walls */
				ball.pos = first_intersec.p;
				if (first_intersec.wall.effects.indexOf(Effects.BASE) != -1) {
					//console.log("hit base");
					ball.reset();
					const goaled_client = this.clients.find(c => c.base === first_intersec.wall);
					if (goaled_client == undefined) {
						console.log("Game: error: base that was scored at could not be matched to a client");
						process.exit(1);
					}
					goaled_client.score--;
					console.log("client ", goaled_client.global_id, " points: ", goaled_client.score);
					if (goaled_client.score == 0) {
						goaled_client.loose();
						goaled_client.final_placement = this._alive_player_count;
						this._alive_player_count--;
						//todo: later chage this to 1 so the game is over when 1 player is alive
						if (this._alive_player_count == 1) {
							this._finish_game();
						}
					}
					break ;
				}
				const offset: ServerVec2 = first_intersec.wall.normal.clone();
				offset.scale(0.01);
				if (ft_math.dot(ball.speed, first_intersec.wall.normal) < 0) {
					ball.pos.add(offset);
				} else {
					ball.pos.sub(offset);
				}
				ball.reflect(hit_walls, hit_points);

				ball.last_collision_obj_id = ball.cur_collision_obj_id;
				ball.cur_collision_obj_id = [];
				if (!ball.sane()) {
					console.log("error: ball data corrupted: ", ball);
					process.exit(1);
				}
			}
		}

		for (const wall of this.walls) {
			if (!wall.next_normal) {
				continue ;
			}
			wall.normal = wall.next_normal;
			wall.next_normal = undefined;
		}
	}

	private rotate_wall(wall: ServerWall, angle: number, delta_time: number) {
		const theta = angle * delta_time;

		// grab the old normal
		const n = wall.normal;

		// compute the rotated components
		const cos = Math.cos(theta);
		const sin = Math.sin(theta);
		const newX = n.x * cos - n.y * sin;
		const newY = n.x * sin + n.y * cos;

		wall.normal.x = newX;
		wall.normal.y = newY;
		wall.normal.unit();
		wall.update();
		wall.angular_vel = angle;
	}

	private update_walls(delta_time: number) {
		//this.walls[4].rotate(Math.PI / 2, delta_time);
		for (const wall of this.walls) {
			if (wall.center.x == 0 && wall.center.y == 0) {
				wall.rotate(Math.PI / 2, delta_time);
			}
		}
	}

	private update_paddles(delta_time: number) {
		for (const client of this.clients) {
			client.update(this.balls, delta_time);
		}
	}

	private update(delta_time: number) {
		//console.log("update");
		this._duration += delta_time;
		if (this.timer != undefined) {
			this.timer -= delta_time;
			if (this.timer <= 0) {
				this.timer = 0;
				if (this.lobby_type != LobbyType.TOURNAMENT) {
					this._finish_game();
					return ;
				}
				// this is a tournament lobby and a draw is not an option
				let highest_health: number = 1;
				for (const client of this.clients) {
					if (client.score > highest_health) {
						highest_health = client.score;
					}
				}
				let tied_player_count: number = 0;
				for (const client of this.clients) {
					if (client.score == highest_health) {
						tied_player_count++;
					}
				}
				if (tied_player_count <= 1) {
					this._finish_game();
					return ;
				} else {
					console.log("Tournament not ending since players are tied..");
				}
			}
		}
		this.update_paddles(delta_time);
		this.update_walls(delta_time);
		this.update_balls(delta_time);
		this.finish_frame(delta_time);
	}

	private finish_frame(delta_time: number) {
		if (this.finished) {
			return ;
		}
		this.broadcast_game_state();
	}

	public async start_loop() {
		if (this._interval)
			return ;
		this.running = true;
		this._interval= setInterval(() => {
			try {
				this.update(this.frame_time / 1000);
			} catch (e) {
				console.error("game update error:", e);
			}
		}, this.frame_time);
	}

	public stop_loop() {
		if (this._interval) {
			clearInterval(this._interval);
			this._interval = null;
		}
		this.running = false;
	}

	public _update_movement(input: ClientToGameInput, client: ServerClient) {
		switch (input.payload.key) {
			case ("w"):
				client.up = input.payload.type == "down";
				break ;
			case ("s"):
				client.down = input.payload.type == "down";
				break ;
			case ("a"):
				client.left = input.payload.type == "down";
				break ;
			case ("d"):
				client.right = input.payload.type == "down";
				break ;
			default:
				break ;
		}
	}

	// does nothing, the player simply dosn't give any inputs anymore
	public leave(client_id: number) {
	}

	public process_input(input: ClientToGameInput) {
		const client: ServerClient | undefined = this.clients.find(c => c.global_id == input.client_id);
		if (client == undefined) {
			console.log("Game: Error: Got game input from invalid id: ", input.client_id);
			return ;
		}
		//console.log('got input');
		if (input.client_id != client.global_id) {
			throw("Game.process_input: got id missmatch");
		}
		switch (input.payload.type) {
			case ("up"):
			case ("down"):
				this._update_movement(input, client);
				break ;
			case ("reset"):
				//for faster debugging: should reset the game
				this._reset();
				break ;
			default:
				console.log("Error: Game server: unknown input type!");
		};
	}
};
