import Fastify from 'fastify';
//import websocketPlugin, { SocketStream } from '@fastify/websocket'
import websocketPlugin from '@fastify/websocket';
import type { fastifyWebsocket } from '@fastify/websocket';
import type { FastifyInstance, FastifyRequest } from 'fastify';
//import websocketPlugin, { SocketStream } from '@fastify/websocket'
import type { ClientToServerMessage } from '../../game_shared/message_types';
import type { ServerToClientMessage } from '../../game_shared/message_types';
import type { ServerToClientJson } from '../../game_shared/message_types';
import { BinType } from '../../game_shared/message_types';
import type { GameOptions } from '../../game_shared/message_types';
import type { WebSocket } from '@fastify/websocket';

import { Effects, vec2, Wall, Ball, Client, GameState }
	from '../../game_shared/serialization';


const PORT: number = 3333;

export class Game {
	private _interval: NodeJS.Timeout | null = null;
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

	public init_game_state() {
		this.running = true;
		const ball: Ball = new Ball();
		ball.speed.x = 0.001;
		ball.speed.y = 0.001;
		this.balls.push(ball);
		this.start_loop();
	}

	broadcast_game_state() {
		const buffer = this.serialize_game_state();
		for (const client of this.clients) {
			if (client.socket.readyState === client.socket.OPEN) {
				client.socket.send(buffer);
			}
		}
	}

	update() {
		//console.log("game update");
		for (const ball of this.balls) {
			ball.pos.x += ball.speed.x;
			ball.pos.y += ball.speed.y;
		}
		this.broadcast_game_state();
	}

	start_loop() {
		if (this._interval) return;
		this.running = true;
		this._interval= setInterval(() => {
			try {
				this.update();
			} catch (e) {
				console.error("game update error:", e);
			}
		}, 1000 / 30);
	}

	stop_loop() {
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
		this.game_input_msg = this.game_input_msg.bind(this);

		this._ws.on('message', this.first_ws_msg);
	}

	private first_ws_msg(message: string) {
		console.log("[GAME-BACK-END] got msg: ", message);
		console.log("[GAME-BACK-END] msg type: ", typeof(message));
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
		const player_id: number = json.player_id;
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
							client.socket = ws;
							console.log("client was reconnected to game");
							//todo: update handler
							return ;
						}
					}
				}
				//todo: give client some error, maybe deiffer between the types
				console.log("client did not search for game and was also not in game");
				return ;
			default:
				console.log("Error: first msg type was not matched");
				this._ws.close();//ws.close() is not a function??
				return ;
		}
	}

	private game_input_msg(game: Game, player_id: number, message: ArrayBuffer) {
		const view = new DataView(message);
		const type: BinType = view.getUint8(0);
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
			for (let client of game.clients) {
				const msg: ServerToClientJson = {
					type: 'starting_game',
					game_id: 321, //todo: get a new unique id with the db that is bound to this game
					options: options,
				};
				client.socket.send(JSON.stringify(msg));
				game.init_game_state();
			}
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

export class GameServer {
	private _fastify: FastifyInstance;
	private _games: Game[] = [];

	constructor(fastify: FastifyInstance) {
		console.log("[GAME-BACK-END] constructor");
		this._fastify = fastify;
		this._fastify.get('/game', { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
			new Connection(this, socket);
			//socket.on('message', first_ws_msg);
		});
	}

	public get_games() {
		return this._games;
	}
}

