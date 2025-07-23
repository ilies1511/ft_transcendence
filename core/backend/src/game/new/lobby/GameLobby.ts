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
} from '../../game_shared/message_types.ts';

type GameConnection = {
	id: number,
	sock?: WebsocketConnection,
};


//todo:
//leave()
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

	private _completion_callback: (id: number) => undefined;

	constructor(
		completion_callback: (id: number) => undefined,
		id: number,
		map_name: string,
		ai_count: number,
		password?: string
	) {
		console.log("game: GameLobby constructor");
		this._completion_callback = completion_callback;
		if (password !== undefined) {
			this.password = password;
		}
		this.id = id;
		this._map_name = map_name;
		this._ai_count = ai_count;
		this._map_file = new MapFile(map_name);
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
		console.log("connections in can_reconnect: ", this._connections);
		for (const connection of this._connections) {
			if (connection.id == client_id) {
				return (true);
			} else {
				console.log("client_id: ", client_id, "; connection.id: ", connection.id);
			}
		}
		return (false);
	}

	private _game_engine_finish_callback(): undefined {
		this._completion_callback(this.id);
	}

	private _start_game() {
		console.log("starting game..");
		this._game_engine_finish_callback = this._game_engine_finish_callback.bind(this);
		this.engine = new GameEngine(this._map_name, this._game_engine_finish_callback);
		let i = 0;
		while (i < this._connections.length) {
			this.engine.clients[i].set_socket(this._connections[i].sock.ws);
			this.engine.clients[i].global_id = this._connections[i].id;
			i++;
		}

		this.engine.start_loop();
	}

	// returns false if player can not join
	// this does not setup the connection, without this the client tring to connect will be denied
	public join(user_id: number, map_name: string, password?: string): ServerError {
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
		const update_msg: GameLobbyUpdate = {
			type: 'game_lobby_update',
			player_count: this._connections.length,
			loaded_player_count: this.loaded_player_count,
			target_player_count: this._map_file.clients.length,
		};
		this._last_broadcast = update_msg;
		for (const connection of this._connections) {
			if (connection.sock) {
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
					if (client.global_id = connection.id) {
						client.socket = connection.sock.ws;
						break ;
					}
				}
			}
		}
		connection.sock.send(this._last_broadcast);
		console.log("Game: client ", connection.id, " reconnected to lobby, ", this.id);
	}

	private _connect(client_id: number, ws: WebSocket, password: string) {
		if (password != this.password) {
			WebsocketConnection.static_send_error(ws, 'Invalid Password');
			ws.close();
			return ;
		}
		for (const connection of this._connections) {
			if (client_id == connection.id && connection.sock !== undefined) {
				this._reconnect(ws, connection);
				return ;
			} else if (client_id == connection.id) {
				connection.sock = new WebsocketConnection(ws);
				connection.sock.send(this._last_broadcast);
				console.log("Game: client ", client_id, " connected to lobby ", this.id);
				this.loaded_player_count++;
				this._update_lobby();
				if (this._ai_count + this.loaded_player_count == this._map_file.clients.length) {
					this._start_game();
				}
				return ;
			}
		}
		console.log("Game: Error: client ", client_id, " failed to connect to lobby ", this.id);
	}

	//todo:
	public recv(ws: WebSocket, msg: ClientToMatch): boolean {
		switch (msg.type) {
			case ('send_input'):
				if (this.engine) {
					this.engine.process_input(msg as ClientToGameInput);
				}
				break ;
			case ('connect'):
				this._connect(msg.client_id, ws, msg.password);
				break ;
		}
		return (false);
	}
};
