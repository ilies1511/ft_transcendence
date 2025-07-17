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

import { GameEngine } from './GameEngine.ts';

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
function join_game(ws: WebSocket, player_id: number, options: GameOptions, game: GameEngine) {
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



//todo
//currently not active
export class GameLobby {
	public options: GameOptions;
	public game: GameEngine;
	public password?: string;

	constructor(options: GameOptions, password?: string) {
		this.options = options;
		this.game = new GameEngine(options);
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
		const game: GameEngine = new GameEngine(options);
		game_server.get_games().push(game);
		join_game(ws, player_id, options, game);
	}
};

export class GameServer {
	private _fastify: FastifyInstance;
	//todo: should be array of GameLobby
	private _games: GameEngine[] = [];
	private _next_lobby_id = 1;
	private _lobbys: Map<number, GameLobby> = new Map<number, GameLobby>;

	constructor(fastify: FastifyInstance) {
		this._rcv_msg = this._rcv_msg.bind(this);
		console.log("[GAME-BACK-END] constructor");
		this._fastify = fastify;
		this._fastify.get('/game', { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
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
				console.log(input);
				for (let game of this._games) {
					for (let client of game.clients) {
						if (client.global_id == player_id) {
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
				this._send_error(ws, "send_input was received but client was not found", /* some error msg */);
				return ;
			//todo:
			//case('leave_game'):
				//break ;
			//case ('reconnect'):
				//break ;
			default:
				console.log("error, could not match msg");
				/* Error: first msg type was not matched */
				this._send_error(ws, undefined, /* some error msg */);
				return ;
		}
	}
};


