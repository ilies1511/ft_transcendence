import { GameEngine } from './engine/GameEngine.ts';
import { MapFile } from './maps/Map.ts';
import type { fastifyWebsocket } from '@fastify/websocket';
import websocketPlugin from '@fastify/websocket';
import type { WebSocket } from '@fastify/websocket';
import { WebsocketConnection } from '../WebsocketConnection.ts';

import type {
	ServerToClientError,
	LobbyToClient,
	GameLobbyUpdate,
	ServerError,
	ClientToMatch,
	ClientToGame,
	ClientToGameInput,
	LobbyDisplaynameResp,
	GameToClientFinish,
	ClientToMatchLeave,
} from '../../game_shared/message_types.ts';

import { LobbyType } from '../../game_shared/message_types.ts';

import { is_ServerError } from '../../game_shared/message_types.ts';

type GameConnection = {
	id: number,
	ingame_id?: number,
	sock?: WebsocketConnection,
	display_name: string,
};


//todo:
//disconnect()
export class GameLobby {
	public finished: boolean = false;
	public engine?: GameEngine = undefined;
	public id: number;

	// set by constructor incase of invalid constructor args
	public error?: string = undefined;

	private _map_name: string;
	private _map_file: MapFile;
	public password: string = '';
	private _ai_count: number;

	private _connections: GameConnection[] = [];
	public loaded_player_count: number = 0;

	private _last_broadcast: LobbyToClient;

	private _completion_callback: (id: number, end_data: GameToClientFinish) => undefined;
	private _first_completion_callback?: (id: number, end_data: GameToClientFinish) => undefined;

	public lobby_type: LobbyType;


	constructor(
		lobby_type: LobbyType,
		completion_callback: (id: number, msg: GameToClientFinish) => undefined,
		id: number,
		map_name: string,
		ai_count: number,
		password?: string,
		first_completion_callback?: (id: number, msg: GameToClientFinish) => undefined,
	) {
		console.log("game: GameLobby constructor");
		this.lobby_type = lobby_type;
		this._completion_callback = completion_callback;
		if (password !== undefined) {
			this.password = password;
		}
		this.id = id;
		this._map_name = map_name;
		this._ai_count = ai_count;
		this._map_file = new MapFile(map_name);
		this._first_completion_callback = first_completion_callback;
		if (this._ai_count < 0 || this._ai_count >= this._map_file.clients.length) {
			throw ("invalid ai count");
		}
		const lobby_status: GameLobbyUpdate = {
			type: 'game_lobby_update',
			player_count: 0,
			loaded_player_count: 0,
			target_player_count: this._map_file.clients.length,
		};
		this._last_broadcast = lobby_status;
	}

	public can_reconnect(client_id: number): boolean {
		for (const connection of this._connections) {
			if (connection.id == client_id) {
				return (true);
			} else {
			}
		}
		return (false);
	}

	private _game_engine_finish_callback(msg: GameToClientFinish): undefined {
		if (this._first_completion_callback) {
			this._first_completion_callback(this.id, msg);
		}
		this._completion_callback(this.id, msg);
	}

	private _start_game() {
		console.log("starting game..");
		this._game_engine_finish_callback = this._game_engine_finish_callback.bind(this);
		this.engine = new GameEngine(this._map_name, this._game_engine_finish_callback);
		let i = 0;
		while (i < this._connections.length) {
			this.engine.clients[i].set_socket(this._connections[i].sock.ws);
			this.engine.clients[i].global_id = this._connections[i].id;
			this._connections[i].ingame_id = this.engine.clients[i].obj_id;
			i++;
		}
		this.engine.start_loop();
	}

	// returns false if player can not join
	// this does not setup the connection, without this the client tring to connect will be denied
	public join(user_id: number, map_name: string, display_name: string, password?: string
		): ServerError
	{
		if (this._map_name != map_name) {
			return ("Invalid Request");
		}
		if (this._ai_count + this._connections.length >= this._map_file.clients.length) {
			return ("Full");
		}
		if (password == undefined) {
			password = '';
		}
		if (this.password != password) {
			return ("Invalid Password");
		}
		console.log("Game: User", user_id, " joing lobby ", this.id);
		const connection: GameConnection = {
			id: user_id,
			sock: undefined,
			display_name: display_name,
		};
		this._connections.push(connection);
		return ("");
	}

	public check_finished(): boolean {
		if (this.engine !== undefined && this.engine.finished) {
			this.finished = true;
		}
		return (this.finished);
	}

	public cleanup() {
	}

	private _update_lobby() {
		console.log("Game: _update_lobby()");
		const update_msg: GameLobbyUpdate = {
			type: 'game_lobby_update',
			player_count: this._connections.length,
			loaded_player_count: this.loaded_player_count,
			target_player_count: this._map_file.clients.length,
		};
		this._last_broadcast = update_msg;
		for (const connection of this._connections) {
			if (connection.sock && connection.id > 0) {
				connection.sock.send(this._last_broadcast);
			}
		}
	}

	private _reconnect(ws: WebSocket, connection: GameConnection) {
		if (connection.sock == undefined) {
			console.log("Game: Error: Attempting reconnect when there was no connection before");
			throw ("Internal Error");
		} else if (connection.sock.ws === ws) {
		} else {
			connection.sock.ws.close();
			connection.sock = new WebsocketConnection(ws);
			if (this.engine) {
				for (const client of this.engine.clients) {
					if (client.global_id == connection.id) {
						client.socket = connection.sock.ws;
						break ;
					}
				}
			}
			this.loaded_player_count++;
			this._update_lobby();
		}

		console.log("Game: client ", connection.id, " reconnected to lobby, ", this.id);
	}

	private _connect(client_id: number, ws: WebSocket, password: string) {
		if (password != this.password) {
			WebsocketConnection.static_send_error(ws, 'Invalid Password');
			console.log("this.password: ", this.password, "; password: ", password);
			ws.close();
			return ;
		}
		for (const connection of this._connections) {
			if (client_id == connection.id && connection.sock !== undefined) {
				this._reconnect(ws, connection);
				return ;
			} else if (client_id == connection.id) {
				connection.sock = new WebsocketConnection(ws);
				if (client_id > 0) {
					connection.sock.send(this._last_broadcast);
				}
				this.loaded_player_count++;
				console.log("Game: client ", client_id, " connected to lobby ", this.id);
				this._update_lobby();
				if (this._ai_count + this.loaded_player_count >= this._map_file.clients.length
					&& this._connections.length + this._ai_count == this._map_file.clients.length
				) {
					this._start_game();
				}
				return ;
			}
		}
		console.log("Game: Error: client ", client_id, " failed to connect to lobby ", this.id);
		const error: ServerError = 'Not Found';
		WebsocketConnection.static_send(ws, error);
	}

	// removes player from lobby
	// also givs the game engine the option to take actions if needed
	private _leave_game(ws: WebSocket, msg: ClientToMatchLeave) {
		ws.close();
		if (msg.password != this.password) {
			console.log("Game: Invalid password for leave() request, ignoring it..");
			return ;
		}
		// remove local player websocket and player from game
		for (const connection of this._connections) {
			if (connection.id == msg.client_id * -1) {
				this.loaded_player_count--;
				if (connection.sock) {
					connection.sock.ws.close();
					if (this.engine) {
						this.engine.leave(msg.client_id * -1);
					}
					break ;
				}
			}
			if (connection.id == msg.client_id) {
				this.loaded_player_count--;
				if (connection.sock && connection.sock.ws !== ws) {
					connection.sock.ws.close();
					if (this.engine) {
						this.engine.leave(msg.client_id);
					}
					break ;
				}
			}
		}
		this._connections = this._connections.filter(c => c.id != msg.client_id && c.id != msg.client_id * -1);
		this._update_lobby();
	}

	public recv(ws: WebSocket, msg: ClientToMatch) {
		if (msg.type == 'connect') {
			this._connect(msg.client_id, ws, msg.password);
			return ;
		}

		let found: boolean = false;
		for (const connection of this._connections) {
			if (connection.sock && connection.sock.ws === ws) {
				found = true;
				break ;
			}
		}
		if (!found) {
			ws.close();
			return ;
		}

		switch (msg.type) {
			case ('send_input'):
				if (this.engine) {
					this.engine.process_input(msg as ClientToGameInput);
				}
				break ;
			case ('leave'):
				this._leave_game(ws, msg);
				break ;
		}
		return ;
	}

	public get_lobby_displaynames(): LobbyDisplaynameResp {
		const resp: LobbyDisplaynameResp = {
			error: '',
			data: [],
		};
		for (const connection of this._connections) {
			if (connection.ingame_id) {
				resp.data.push({name: connection.display_name, id: connection.ingame_id});
			} else {
				console.log("Game: Error: Missing ingame_id in client ",
					"connection in lobby when get_lobby_displaynames was called");
			}
		}
		return (resp);
	}

	public ws_close_handler(ws: WebSocket) {
		for (const connection of this._connections) {
			if (connection.sock && connection.sock.ws === ws) {
				this.loaded_player_count--;
				this._update_lobby();
			}
		}
	}
};
