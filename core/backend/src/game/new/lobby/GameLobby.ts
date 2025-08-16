import { GameEngine } from './engine/GameEngine.ts';
import { MapFile } from './maps/Map.ts';
import type { fastifyWebsocket } from '@fastify/websocket';
import websocketPlugin from '@fastify/websocket';
import type { WebSocket } from '@fastify/websocket';
import { WebsocketConnection } from '../WebsocketConnection.ts';
import { GameServer } from '../GameServer.ts';

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
	GameToClientInfo,
} from '../../game_shared/message_types.ts';

import { LobbyType } from '../../game_shared/message_types.ts';

import { is_ServerError } from '../../game_shared/message_types.ts';

type GameConnection = {
	id: number,
	ingame_id?: number,
	sock?: WebsocketConnection,
	display_name: string,
	timeout?: ReturnType<typeof setTimeout>,
};

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

	private static readonly PENDING_CONNECT_TIMEOUT_MS = 15_000;
	private static readonly RECONNECT_GRACE_MS = 30_000;


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
		//console.log(this);
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
		for (const connection of this._connections) {
			GameServer.remove_client_lobby_participation(connection.id, this.id);
		}
		if (this._first_completion_callback) {
			this._first_completion_callback(this.id, msg);
		}
		this._completion_callback(this.id, msg);
	}

	// HACK: this is not only called to start the game but also on reconnects to fix the sockets of the game engine
	private _start_game() {
		this._game_engine_finish_callback = this._game_engine_finish_callback.bind(this);
		if (!this.engine) {
			this.engine = new GameEngine(this._map_name, this.lobby_type, this,
				this._game_engine_finish_callback, 1000 /* todo: hardcoded 1000 sec */);
		}
		console.log("starting game..");
		let i = 0;
		while (i < this._connections.length) {
			this._clear_timeout(this._connections[i]);
			this.engine.clients[i].set_socket(this._connections[i].sock.ws);
			this.engine.clients[i].global_id = this._connections[i].id;
			this._connections[i].ingame_id = this.engine.clients[i].obj_id;
			i++;
		}
		this.engine.start_loop();
	}

	// this does not setup the connection, without this the client tring to connect will be denied
	public join(user_id: number, display_name: string, password?: string
		): ServerError
	{
		if (user_id <= 0 && this.lobby_type == LobbyType.TOURNAMENT_GAME) {
			return ('Invalid Request');
		}
		if (this.engine) {
			return ('Allready started');
		}
		if (this._ai_count + this._connections.length >= this._map_file.clients.length) {
			return ("Full");
		}
		if (password == undefined) {
			password = '';
		}
		if (this.password != password) {
			console.log("join: this.password: ", this.password, "; password: ", password);
			return ("Invalid Password");
		}
		console.log("Game: User", user_id, " joing lobby ", this.id);
		const connection: GameConnection = {
			id: user_id,
			sock: undefined,
			display_name: display_name,
		};
		this._connections.push(connection);
		GameServer.add_client_lobby_participation(user_id, this.id);
		this._arm_timeout(connection, GameLobby.PENDING_CONNECT_TIMEOUT_MS, 'pending');
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
			this._clear_timeout(connection);
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
			if (this._ai_count + this.loaded_player_count >= this._map_file.clients.length
				&& this._connections.length + this._ai_count == this._map_file.clients.length
			) {
				this._start_game();
			}
		}

		console.log("Game: client ", connection.id, " reconnected to lobby, ", this.id);
	}

	private _connect(client_id: number, ws: WebSocket, password: string) {
		if (password != this.password) {
			WebsocketConnection.static_send_error(ws, 'Invalid Password');
			console.log("connect: this.password: ", this.password, "; password: ", password);
			ws.close();
			return ;
		}
		for (const connection of this._connections) {
			if (client_id == connection.id && connection.sock !== undefined) {
				this._reconnect(ws, connection);
				return ;
			} else if (client_id == connection.id) {
				this._clear_timeout(connection);
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
		console.log(`GameLobby: ${msg.client_id} tries to leave lobby ${this.id}`);
		ws.close();
		if (msg.password != this.password) {
			console.log("Game: Invalid password for leave() request, ignoring it..");
			return ;
		}
		let result: GameToClientFinish | undefined;
		
		if (!this.engine && this.lobby_type == LobbyType.TOURNAMENT_GAME) {
			result = {
				type: 'finish',
				duration: 0,
				mode: LobbyType.TOURNAMENT_GAME,
				placements: [],
			};
		}
		for (const connection of this._connections) {
			if (connection.id == msg.client_id * -1) {
				this.loaded_player_count--;
				GameServer.remove_client_lobby_participation(msg.client_id * -1, this.id);
				if (connection.sock) {
					connection.sock.ws.close();
					//break ;
				}
				this.engine?.leave(msg.client_id * -1);
			}
			if (connection.id == msg.client_id) {
				GameServer.remove_client_lobby_participation(msg.client_id, this.id);
				this.loaded_player_count--;
				if (connection.sock && connection.sock.ws !== ws) {
					connection.sock.ws.close();
					//break ;
				}
				this.engine?.leave(msg.client_id);
			}
			if (!this.engine && this.lobby_type == LobbyType.TOURNAMENT_GAME) {
				//pretend the game is allready finished
				if (connection.id != msg.client_id) {
					const notification: GameToClientInfo = {
						type: 'info',
						text: `Player ${this.display_name_of(msg.client_id)} left the tournament, automatically advancing`,
					};
					connection.sock?.send(notification);
					result?.placements.push({
						id: connection.id,
						final_placement: 1,
					});
				} else {
					result?.placements.push({
						id: connection.id,
						final_placement: 2,
					});
				}
			}
		}
		if (!this.engine) {
			this._connections = this._connections.filter(c => c.id != msg.client_id && c.id != msg.client_id * -1);
		}
		if (result) {
			for (const connection of this._connections) {
				connection.sock?.send(result);
			}
			this._game_engine_finish_callback(result);
		}
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
			if (connection.sock?.ws === ws) {
				connection.sock = undefined;
				if (!this.engine) {
					this._arm_timeout(connection, GameLobby.RECONNECT_GRACE_MS, 'reconnect');
				}
				this.loaded_player_count--;
				this._update_lobby();
			}
		}
	}

	//called if the game did not start yet and a client exceeded the time limit to
	// establish a connection
	// (so other players can join)
	private _remove_timed_out_client(client_id: number) {
		if (this.lobby_type == LobbyType.TOURNAMENT_GAME) {
			// todo: think of how this should behaive for tournament games 
			//  (since there can not be a different player but also everyone is 
			// waiting AND there must be a winner=> maybe skip the match and set 
			// a connected player as winner?)
		}
		const i = this._connections.findIndex(c => c.id === client_id);
		if (i === -1) {
			return;
		}
		if (this._connections[i].sock?.ws.readyState == WebSocket.OPEN) {
			console.log(`Warning: Tried to time out client ${client_id}, but client was actually connected!`);
			this._clear_timeout(this._connections[i]);
			return ;
		}
		this._connections.splice(i, 1);
		GameServer.remove_client_lobby_participation(client_id, this.id);
	}

	private _arm_timeout(connection: GameConnection, ms: number, reason: 'pending'|'reconnect') {
		this._clear_timeout(connection);
		connection.timeout = setTimeout(() => {
			if (this.engine) {
				return ;
			}
			console.log(`GameLobby: Timing out client ${connection.id} (${reason}) in lobby ${this.id}`);
			this._remove_timed_out_client(connection.id);
			this._update_lobby();
		}, ms);
	}

	private _clear_timeout(connection: GameConnection) {
		if (connection.timeout) {
			clearTimeout(connection.timeout);
			connection.timeout = undefined;
		}
	}

	public display_name_of(client_id: number): string {
		const client: GameConnection | undefined = this._connections.find(c => c.id == client_id);
		if (!client) {
			return ('');
		}
		return (client.display_name);
	}

};

