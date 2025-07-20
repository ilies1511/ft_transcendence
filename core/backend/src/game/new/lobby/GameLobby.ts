import { GameEngine } from './engine/GameEngine.ts';
import { MapFile } from './maps/Map.ts';
import type { fastifyWebsocket } from '@fastify/websocket';
import websocketPlugin from '@fastify/websocket';
import type { WebSocket } from '@fastify/websocket';

import type {
	ServerToClientError,
	ServerToClientMessage,
	ServerError,
    ClientToMatch,
} from '../../game_shared/message_types.ts';

type GameConnection = {
	id: number,
	ws?: WebSocket,
};


//todo:
//leave()
//connect()//first websocket connection
//reconnect()
//disconnect()
export class GameLobby {
	public finished: boolean = false;
	public engine?: GameEngine = undefined;
	public id: number;


	// set by constructor incase of invalid constructor args
	public error?: string = undefined;



	private _map_name: string;
	private _map_file: MapFile;
	private _password?: string;
	private _ai_count: number;

	private _connections: GameConnection[] = [];


	constructor(id: number, map_name: string, ai_count: number, password?: string) {
		console.log("game: GameLobby constructor");
		this._password = password;
		this.id = id;
		this._map_name = map_name;
		this._ai_count = ai_count;
		this._map_file = new MapFile(map_name);
		if (this._ai_count < 0 || this._ai_count >= this._map_file.clients.length) {
			throw ("invalid ai count");
		}
	}

	private _start_game() {
		console.log("starting game..");
	}

	// returns false if player can not join
	public join(user_id: number, map_name: string, password?: string): boolean {
		if (this._map_name != map_name) {
			return (false);
		}
		if (this._ai_count + this._connections.length >= this._map_file.clients.length) {
			return (false);
		}
		if (this._password !== undefined && password === undefined
			|| this._password === undefined && password !== undefined
			|| this._password !== undefined && this._password != password
		) {
			return (false);
		}
		console.log("Game: User", user_id, " joing lobby ", this.id);
		const connection: GameConnection = {
			id: user_id,
			ws: undefined,
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

	//todo:
	public recv(ws: WebSocket, msg: ClientToMatch): boolean {
		msg.client_id
		return (false);
	}
};
