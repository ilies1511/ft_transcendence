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

	private _last_broadcast: LobbyToClient;

	constructor(id: number, map_name: string, ai_count: number, password?: string) {
		console.log("game: GameLobby constructor");
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

	private _start_game() {
		console.log("starting game..");
	}

	// returns false if player can not join
	// this does not setup the connection, without this the client tring to connect will be denied
	public join(user_id: number, map_name: string, password?: string): boolean {
		if (this._map_name != map_name) {
			return (false);
		}
		if (this._ai_count + this._connections.length >= this._map_file.clients.length) {
			return (false);
		}
		if (password == undefined) {
			password = '';
		}
		if (this.password != password) {
			return (false);
		}
		console.log("Game: User", user_id, " joing lobby ", this.id);
		const connection: GameConnection = {
			id: user_id,
			sock: undefined,
		};
		this._connections.push(connection);
		if (this._ai_count + this._connections.length == this._map_file.clients.length) {
			this._start_game();
		}
		return (true);
	}

	public check_finished(): boolean {
		if (this.engine !== undefined && this.engine.finished) {
			this.finished = true;
		}
		return (this.finished);
	}

	public cleanup() {
	}

	private _reconnect(ws: WebSocket, connection: GameConnection) {
		if (connection.sock == undefined) {
			console.log("Game: Error: Attempting reconnect when there was no connection before");
			throw ("Internal Error");
		} else if (connection.sock.ws === ws) {
		} else {
			connection.sock.ws.close();
			connection.sock = new WebsocketConnection(ws);
		}
		connection.sock.send(this._last_broadcast);
		console.log("Game: clinet ", connection.id, " reconnected to lobby, ", this.id);
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
				console.log("Game: clinet ", client_id, " connected to lobby ", this.id);
				return ;
			}
		}
		console.log("Game: Error: Client ", client_id, " failed to connect to lobby ", this.id);
	}

	//todo:
	public recv(ws: WebSocket, msg: ClientToMatch): boolean {
		switch (msg.data.type) {
			case ('send_input'):
				break ;
			case ('connect'):
				this._connect(msg.client_id, ws, msg.data.password);
				break ;
		}
		return (false);
	}
};
