import Fastify from 'fastify';
//import websocketPlugin, { SocketStream } from '@fastify/websocket'
import type { fastifyWebsocket } from '@fastify/websocket';
import websocketPlugin from '@fastify/websocket';
import type { FastifyInstance, FastifyRequest } from 'fastify';
//import websocketPlugin, { SocketStream } from '@fastify/websocket'
//import type { ClientToServerMessage } from '../../game_shared/message_types';
import type { WebSocket } from '@fastify/websocket';
import type { ClientToServerMessage } from '@game_shared/message_types';
import type { GameOptions, GameStartInfo, ServerToClientJson, ServerToClientMessage } from '@game_shared/message_types';
//import type { GameOptions, GameStartInfo, ServerToClientJson, ServerToClientMessage } from '../../game_shared/message_types';

import { Ball, Client, Effects, GameState, vec2, Wall } from '@game_shared/serialization';
import default_map from './maps/default.json';
//import { Effects, vec2, Wall, Ball, Client, GameState }
//	from '../../game_shared/serialization';

import * as ft_math from '@game_shared/math.ts';

const EPSILON: number = 1e-7;

const PORT: number = 3333;

let i: number = 0;

export class Game {
	private _next_obj_id: number = 1;//has to start at 1
	private _interval: NodeJS.Timeout | null = null;
	public frame_time: number = 1000 / 60;
	running: boolean = false;
	public clients: Client[] = [];
	public balls: Ball[] = [];
	public walls: Wall[] = [];
	public options: GameOptions;

	constructor(options: GameOptions) {
		this.options = options;
		this.running = false;
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
		//this.start_loop();
	}

	private serialize_game_state(): ArrayBuffer {
		const state = new GameState(this);
		return state.serialize();
	}

	private broadcast_game_state() {
		const buffer = this.serialize_game_state();
		for (const client of this.clients) {
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
	private update(delta_time: number) {
		//console.log("update");
		//this.walls[0].center.y += 0.01;//for testing move the wall
		//for (const ball of this.balls) {
		//	console.log(ball);
		//}
		//for (const wall of this.walls) {
		//	console.log(wall);
		//}
		this.update_balls(delta_time);
		this.broadcast_game_state();
	}

	public start_loop() {
		if (this._interval) return;
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
}

class Connection {
	private _ws: WebSocket;
	private _game_server: GameServer;

	constructor(game_server: GameServer, ws: WebSocket) {
		this._ws = ws;
		this._game_server = game_server;
	
		this.first_ws_msg = this.first_ws_msg.bind(this);
		this.join_game = this.join_game.bind(this);
		this.enter_matchmaking = this.enter_matchmaking.bind(this);

		this._ws.on('message', this.first_ws_msg);
	}

	private first_ws_msg(message: string) {
		console.log("[GAME-BACK-END] got msg: ", message);
		//console.log("[GAME-BACK-END] msg type: ", typeof(message));
		let json: ClientToServerMessage;// = JSON.parse(message);
		try {
			json = JSON.parse(message) as ClientToServerMessage;
		} catch (e) {
			console.log("Error: new connection with message in not valid ClientToServerMessage json format");
			//todo: maybe simply show a front end error msg:
			//	'There was an issue with the game server communiction,
			//	try to reconnect if you were in a game'
			this._ws.close();
			return ;
		}
		console.log(`initial. Received: ${message}`);
		//if (typeof message !== "string") {
		//	console.log("Error: new connection with message not of type string, type: ",
		//		typeof message);
		//	ws.close();
		//	return ;
		//}
		const player_id: number = json.player_id; //unique id bound to account of the player
		switch (json.type) {
			case ('search_game'):
				this.enter_matchmaking(player_id, json.payload.options);
				break ;
			//todo:
			//case('leave_game'):
			//break ;
			case ('reconnect'):
			console.log(`client tries to reconnect`);
			case ('send_input'):
				for (let game of this._game_server.get_games()) {
					for (let client of game.clients) {
						if (client.id == player_id) {
							client.socket.close();
							Object.assign(client.socket, this._ws);
							console.log("client was reconnected to game");
							//todo: update handler
							return ;
						}
					}
				}
				//todo: give client some error, maybe deiffer between the types
				this._ws.close();
				console.log("client did not search for game and was also not in game");
				return ;
			default:
				console.log("Error: first msg type was not matched");
				this._ws.close();//ws.close() is not a function??
				return ;
		}
	}

	private join_game(ws: WebSocket, player_id: number, options: GameOptions, game: Game) {
		const client: Client = new Client(
			new vec2(0, 0),
			player_id,
			ws,
			new vec2(1, 1)
		);
		let in_game: boolean = false;
		for (const old_client of game.clients) {
			if (old_client.player_id == client.player_id) {
				Object.assign(old_client, client);
				in_game = true;
			}
		}
		if (!in_game) {
			game.clients.push(client);
		}
		if (game.clients.length == game.options.player_count) {
			console.log("starting game");
			for (let i: number = 0; i < game.clients.length; i++) {
				const msg: GameStartInfo = {
					type: 'starting_game',
					game_player_id: i,
					game_id: 321, //todo: get a new unique id with the db that is bound to this game
					options: options,
				};
				game.clients[i].game_player_id = i;
				game.clients[i].socket.send(JSON.stringify(msg));
			}
			game.start_loop();
			//game.init_game_state();
			//todo: start game
			//todo: flush ws so no old request are left inside
			//ws.onmessage = (event) => {

			//todo: update handler
			
			//ws.on('message', this.first_ws_msg);
			//ws.on('message') => {
			//	//if (event.data instanceof ArrayBuffer) {
			//	//	// game_input_msg(game, player_id, event.data);
			//	//} else {
			//	//	const json = JSON.parse(event.data as string) as ClientToServerMessage;
			//	//}
			//};
	
			//ws.on('message', (message: unknown) => {
			//	//todo: multiplexor for message type (example Leave or ArrayBuffer)
			//	//case (ArrayBuffer) :
			//		// game_input_msg(game, player_id, message);
			//		// break ;
			//	// case ('leave_game'):
			//	// ...
			//});
	
		} else {
			for (let client of game.clients) {
				const msg: ServerToClientJson = {
					type: 'game_lobby_update',
					player_count: game.clients.length,
					target_player_count: game.options.player_count
				};
				client.socket.send(JSON.stringify(msg));
			}
		}
	}

	private enter_matchmaking(player_id: number, options: GameOptions) {
		console.log("enter_matchmaking");
		for (const game of this._game_server.get_games()) {
			for (const client of game.clients) {
				if (client.id == player_id) {
					console.log("rejoined game instead");
					this.join_game(this._ws, player_id, options, game);
					return ;
				} else {
					console.log("id: ", player_id);
					console.log(client);
				}
			}
		}
		//todo: check if the player is allready in a lobby and leave it first
		//todo: validate options
		//ws.on('message', (message: ClientToServerMessage) => {
			//console.log(`Received in enter_matchmaking: ${message}`);
			for (let game of this._game_server.get_games()) {
				if (game.running != true
					&& game.options == options
					&& game.clients.length < game.options.player_count
				) {
					this.join_game(this._ws, player_id, options, game);
					return ;
				}
			}
			const game: Game = new Game(options);
			this._game_server.get_games().push(game);
			this.join_game(this._ws, player_id, options, game);
		//});
	}
}

export class GameLobby {
	public options: GameOptions;
	public game: Game;

	constructor(options: GameOptions) {
		this.options = options;
		this.game = new Game(options);
	}

	public join(player_id: number, password?: string) {
		if (this.options.player_count /* == ???*/) {
			this.game.start_loop();
		}
	}

	public reconnect(player_id: number, password?: string) {
	}
};

export class GameServer {
	private _fastify: FastifyInstance;
	private _games: Game[] = [];

	constructor(fastify: FastifyInstance) {
		console.log("[GAME-BACK-END] constructor");
		this._fastify = fastify;
		this._fastify.get('/game', { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
			new Connection(this, socket);
		});
	}

	public get_games() {
		return this._games;
	}
}

