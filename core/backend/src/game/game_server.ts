import Fastify from 'fastify';
//import websocketPlugin, { SocketStream } from '@fastify/websocket'
import type { fastifyWebsocket } from '@fastify/websocket';
import websocketPlugin from '@fastify/websocket';
import type { FastifyInstance, FastifyRequest } from 'fastify';
//import websocketPlugin, { SocketStream } from '@fastify/websocket'
//import type { ClientToServerMessage } from '../../game_shared/message_types';
import type { WebSocket } from '@fastify/websocket';
import type { ClientToServerMessage } from './game_shared/message_types.ts';
import { eq_options } from './game_shared/message_types.ts';
import type {
	GameOptions,
	GameStartInfo,
	ServerToClientJson,
	ServerToClientMessage,
	ClientToServerInput,
} from './game_shared/message_types.ts';

import { Map } from './maps/Map.ts';

//import type { GameOptions, GameStartInfo, ServerToClientJson, ServerToClientMessage } from '../../game_shared/message_types';

import { Effects, GameState }
	from './game_shared/serialization.ts';

import { ServerVec2 } from './objects/ServerVec2.ts';
import { ServerWall } from './objects/ServerWall.ts';
import { ServerBall } from './objects/ServerBall.ts';
import { ServerClient } from './objects/ServerClient.ts';

import * as ft_math from './math.ts';

const EPSILON: number = 1e-6;

let i: number = 0;

//should be join lobby
function join_game(ws: WebSocket, player_id: number, options: GameOptions, game: Game) {
	let in_game: boolean = false;
	for (const client of game.clients) {
		if (client.global_id == 0) {
			client.global_id = player_id;
			client.set_socket(ws);
			game.connected_client_count++;
			break ;
		} else if (client.global_id == player_id) {
			client.set_socket(ws);
			in_game = true;
			break ;
		}
	}
	if (game.connected_client_count == game.options.player_count) {
		console.log("starting game");
		for (let i: number = 0; i < game.options.player_count; i++) {
			const msg: GameStartInfo = {
				type: 'starting_game',
				ingame_id: i,
				game_id: 321, //todo: get a new unique id with the db that is bound to this game
				options: options,
			};
			game.clients[i].ingame_id = i;
			game.clients[i].socket.send(JSON.stringify(msg));
		}
		game.start_loop();
	} else {
		for (let client of game.clients) {
			if (client.global_id == 0) {
				continue ;
			}
			const msg: ServerToClientJson = {
				type: 'game_lobby_update',
				player_count: game.connected_client_count,
				target_player_count: game.options.player_count
			};
			client.socket.send(JSON.stringify(msg));
		}
	}
}

//todo: split this into smaller classes
export class Game {
	private _next_obj_id: number = 1;//has to start at 1
	private _interval: NodeJS.Timeout | null = null;
	public frame_time: number = 1000 / 60;
	running: boolean = false;
	public connected_client_count: number = 0;
	public clients: ServerClient[] = [];
	public balls: ServerBall[] = [];
	public walls: ServerWall[] = [];
	public options: GameOptions;

	constructor(options: GameOptions) {
		this.options = options;
		this.update = this.update.bind(this);

		this.running = false;
		const map: Map = new Map("default");
		this._next_obj_id = map.next_obj_id;

		this.walls = map.walls;
		this.balls = map.balls;
		this.clients = map.clients;

		const ball: ServerBall = new ServerBall();
		ball.speed.x = -1;
		ball.speed.y = -3;
		ball.pos.x = 0;
		ball.obj_id = this._next_obj_id++;
		this.balls.push(ball);
		//console.log(this.walls);
		console.log(this.balls);
		//this.start_loop();
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
			if (client.global_id == 0) {
				continue ;
			}
			if (client.socket.readyState === client.socket.OPEN) {
				client.socket.send(buffer);
			}
		}
	}

	private update_balls(delta_time: number) {
		for (const ball of this.balls) {
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
					delta_time = 0;
					continue ;
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
	}

	private push_balls_by_wall(delta_time: number) {
		for (const wall of this.walls) {
			if (wall.angular_vel == 0 || !wall.angular_vel) {
				continue ;
			}
			for (const ball of this.balls) {
				if (wall.center.clone().sub(ball.pos).len() > wall.length / 2 + ball.radius) {
					continue ;
				}
				/* 1. signed distance from the ball centre to the wall plane */
				const c2w: ServerVec2 = ball.pos.clone();
				c2w.sub(wall.center);

				const signed_dist = ft_math.dot(c2w, wall.normal);
				const abs_dist	= Math.abs(signed_dist);

				if (abs_dist >= ball.radius)		  // no penetration – skip
					continue ;

				/* 2. minimum translation to put the surfaces flush */
				const penetration: number = ball.radius - abs_dist + EPSILON;
				const push_dir: ServerVec2 = wall.normal.clone();

				push_dir.scale(signed_dist >= 0 ? +1 : -1); // away from wall
				push_dir.scale(penetration);
				ball.pos.add(push_dir);
				push_dir.scale(1 / delta_time);
				if (push_dir.x > 0 && push_dir.x > ball.speed.x) {
					ball.speed.x = push_dir.x;
				} else if (push_dir.x < 0 && push_dir.x < ball.speed.x) {
					ball.speed.x = push_dir.x;
				}
				if (push_dir.y > 0 && push_dir.y > ball.speed.y) {
					ball.speed.y = push_dir.y;
				} else if (push_dir.y < 0 && push_dir.y < ball.speed.y) {
					ball.speed.y = push_dir.y;
				}

				/* 3. give the ball the wall’s surface velocity at the contact point */
				// r = vector from wall centre to (new) contact point
				const r = ball.pos.clone();
				r.sub(wall.center);
				const w: number = wall.angular_vel;		// rad/s, +ve = CCW
				const wall_vel = new ServerVec2(-w * r.y, w * r.x); // ω × r (2-D)

				ball.speed.add(wall_vel);

				/* 4. optional: remove any residual inward velocity */
				//const vn = ft_math.dot(ball.speed, wall.normal);
				//if (vn * signed_dist < 0) {		// still heading into the wall
				//	const a: vec2 = wall.normal.clone();
				//	a.scale(2 * vn);
				//	ball.speed.sub(a);
				//}
			}
			wall.angular_vel = 0;
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
		this.rotate_wall(this.walls[4], Math.PI / 2, delta_time);
	}

	private update(delta_time: number) {
		//console.log("update");
		this.update_balls(delta_time);
		this.update_walls(delta_time);
		//this.push_balls_by_wall(delta_time);
		this.broadcast_game_state();
	}

	public start_loop() {
		if (this._interval)
			return;
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

	public process_input(input: ClientToServerInput, client: ServerClient) {
		console.log('got input');
		if (input.player_id != client.id) {
			throw("Game.process_input: got id missmatch");
		}
	}
};

//todo
//currently not active
export class GameLobby {
	public options: GameOptions;
	public game: Game;
	public password?: string;

	constructor(options: GameOptions, password?: string) {
		this.options = options;
		this.game = new Game(options);
		password = password;
	}

	public can_join(options: GameOptions): boolean {
		if (this.game.connected_client_count >= this.options.player_count
			|| this.options != options)
		{
			return (false);
		}
		return (true);
	}

	public join(player_id: number, password?: string) {
		if (this.options.player_count  == this.game.connected_client_count) {
			this.game.start_loop();
		}
	}

	public reconnect(player_id: number, password?: string) {
	}
};

export class MatchMaking {
	static enter_matchmaking(
		game_server: GameServer,
		ws: WebSocket,
		player_id: number,
		options: GameOptions
	) {
		console.log("enter_matchmaking");
		i = 0;
		for (const game of game_server.get_games()) {
			//console.log(i++, ": ", game);
			for (const client of game.clients) {
				if (client.global_id == player_id) {
					//todo: rejoin fn instead
					console.log("rejoined game instead");
					join_game(ws, player_id, options, game);
					return ;
				} else {
					console.log("id: ", player_id);
					console.log(client);
				}
			}
		}
		//todo: check if the player is allready in a lobby and leave it first
		//todo: validate options
		for (let game of game_server.get_games()) {
			if (game.running != true
				&& game.connected_client_count < options.player_count
				&& eq_options(game.options, options)
			) {
				join_game(ws, player_id, options, game);
				return ;
			}
		}
		const game: Game = new Game(options);
		game_server.get_games().push(game);
		join_game(ws, player_id, options, game);
	}
};

export class GameServer {
	private _fastify: FastifyInstance;
	//todo: should be array of GameLobby
	private _games: Game[] = [];
	private _next_lobby_id = 1;
	private _lobbys: Map<number, GameLobby> = new Map<number, GameLobby>;

	constructor(fastify: FastifyInstance) {
		this._rcv_msg = this._rcv_msg.bind(this);
		console.log("[GAME-BACK-END] constructor");
		this._fastify = fastify;
		this._fastify.get('/api/game', { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
			socket.on('message', (raw) => {
				this._rcv_msg(raw.toString(), socket);
			});
		});
	}

	private _create_lobby(options: GameOptions, password?: string) {
		this._lobbys.set(this._next_lobby_id++, new GameLobby(options, password));
	}

	//closes the websocket
	private _send_error(ws: WebSocket, error?: any, msg?: string) {
		if (error) {
			console.log("Game: Error: ", error);
		}
		if (ws.readyState === ws.OPEN) {
			if (msg) {
				ws.send(msg);
			}
			ws.close();
		}
	}

	public get_games() {
		return this._games;
	}

	private _rcv_msg(message: string, ws: WebSocket) {
		//console.log("[GAME-BACK-END] msg type: ", typeof(message));
		let json: ClientToServerMessage;// = JSON.parse(message);
		try {
			json = JSON.parse(message) as ClientToServerMessage;
		} catch (e: any) {
			this._send_error(ws, e/*, some error msg*/);
			return ;
		}
		console.log(`Game received: ${message}`);
		this.msg_multiplexer(json, ws);
	}

	private msg_multiplexer(json: ClientToServerMessage, ws: WebSocket) {
		const player_id: number = json.player_id; //unique id bound to account of the player
		switch (json.type) {
			case ('search_game'):
				MatchMaking.enter_matchmaking(this, ws, player_id, json.payload.options);
				break ;

			case ('send_input'):
				const input:  ClientToServerInput = json as ClientToServerInput;
				for (let game of this._games) {
					for (let client of game.clients) {
						if (client.id == player_id) {
							if (client.socket !== ws) {
								client.socket.close();
								Object.assign(client.socket, ws);
								console.log("Game: client was reconnected to game");
							}
							game.process_input(input, client);
							return ;
						}
					}
				}
				/* Game was not found */
				this._send_error(ws, undefined, /* some error msg */);
				return ;
			//todo:
			//case('leave_game'):
				//break ;
			//case ('reconnect'):
				//break ;
			default:
				/* Error: first msg type was not matched */
				this._send_error(ws, undefined, /* some error msg */);
				return ;
		}
	}
};


