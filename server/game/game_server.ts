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

import { Effects } from '../../game_shared/message_types';
import { vec2 } from '../../game_shared/message_types';
import { Wall } from '../../game_shared/message_types';
import { Ball } from '../../game_shared/message_types';
import { Client } from '../../game_shared/message_types';
import { GameState } from '../../game_shared/message_types';


const PORT: number = 3333;



class Game {
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
}
;

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
		const client: Client = {
			id: player_id,
			socket: ws,
			effects: [],
			pos: { x: 0, y:0, z: 0}
		};
		game.clients.push(client);
		if (game.clients.length == game.options.player_count) {
			for (let client of game.clients) {
				const msg: ServerToClientJson = {
					type: 'starting_game',
					game_id: 321, //todo: get a new unique id with the db that is bound to this game
					options: options,
				};
				client.socket.send(JSON.stringify(msg));
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

