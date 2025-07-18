import type { WebSocket } from '@fastify/websocket';
import assert from 'assert';

import { Tournament } from './Tournament.ts';
import { GameLobby } from './lobby/GameLobby.ts';

import type {
	ServerToClientError,
	ServerToClientMessage,
	ClientToServerMessage,
	ServerError,
    ClientToTournament,
    ClientToMatch,
} from '../game_shared/message_types.ts';



export class WebsocketConnection {
	private _ws: WebSocket;
	public invalid_socket: boolean;

	constructor(ws: WebSocket) {
		this._ws = ws;
		this.invalid_socket = this._ws.readyState !== WebSocket.OPEN;
	}

	static static_send(ws: WebSocket, msg: ServerToClientMessage) {
		if (ws.readyState !== WebSocket.OPEN) {
			console.log("tryed to send\n", msg, "\nthrough socket was not open");
			return ;
		}
		let data: string | ArrayBuffer = "";
		if (msg instanceof ArrayBuffer) {
			data = msg;
		} else {
			try {
				data = JSON.stringify(msg);
			} catch (error) {
				console.log(error);
				const error_resp: ServerToClientError = {
					type: 'error',
					msg: 'Internal Error',
				};
				data = JSON.stringify(error_resp);
			}
		}
		try {
			ws.send(data);
			return ;
		} catch (error) {
			console.log("tryed to send\n", data, "but got this error:\n", error);
			ws.close();
			return ;
		}
	}

	private _send(msg: ServerToClientMessage) {
		if (this.invalid_socket) {
			console.log("tryed to send\n", msg, "\nthrough socket marked as invalid");
			return ;
		}
		if (this._ws.readyState !== WebSocket.OPEN) {
			this.invalid_socket = true;
			console.log("tryed to send\n", msg, "\nthrough socket was not open");
			return ;
		}
		let data: string | ArrayBuffer = "";
		if (msg instanceof ArrayBuffer) {
			data = msg;
		} else {
			try {
				data = JSON.stringify(msg);
			} catch (error) {
				console.log(error);
				const error_resp: ServerToClientError = {
					type: 'error',
					msg: 'Internal Error',
				};
				data = JSON.stringify(error_resp);
			}
		}
		try {
			this._ws.send(data);
			return ;
		} catch (error) {
			console.log("tryed to send\n", data, "but got this error:\n", error);
			this.invalid_socket = true;
			this._ws.close();
			return ;
		}
	}

	public send_error(error: ServerError) {
		const error_msg: ServerToClientError = {
			type: 'error',
			msg: error,
		};
		this._send(error_msg);
	}

	static static_send_error(ws:WebSocket, error: ServerError) {
		const error_msg: ServerToClientError = {
			type: 'error',
			msg: error,
		};
		WebsocketConnection.static_send(ws, error_msg);
	}

	static recv(
		msg: string,
		ws: WebSocket,
		objects: Map<number, GameLobby> | Map<number, Tournament>,
		tournaments: Tournament[]
	) :boolean
	{
		if (objects.size == 0) {
			WebsocketConnection.static_send_error(ws, "Not Found");
			ws.close();
			return (false);
		}
		let json: ClientToServerMessage;
		try {
			json = JSON.parse(msg) as ClientToServerMessage;
		} catch (e: any) {
			WebsocketConnection.static_send_error(ws, "Invalid Request");
			ws.close();
			return (false);
		}
		//todo: assert objects map and json type match
		const [key, first_value] = objects.entries().next().value;
		const is_looby: boolean = first_value instanceof GameLobby;
		//if ((is_looby && json.target != "match")
		//	|| json.target != "tournament")
		//{
		//	WebsocketConnection.static_send_error(ws, "Invalid Request");
		//	ws.close();
		//	return (false);
		//}
		if (is_looby) {
			if (json.target != 'match') {
				WebsocketConnection.static_send_error(ws, "Invalid Request");
				ws.close();
				return (false);
			}
			const lobby: GameLobby | undefined = objects.get(json.game_id) as GameLobby | undefined;
			if (lobby == undefined) {
				WebsocketConnection.static_send_error(ws, "Not Found");
				ws.close();
				return (false);
			}
			return (lobby.recv(ws, json as ClientToMatch));
		} else {
			if (json.target != 'tournament') {
				WebsocketConnection.static_send_error(ws, "Invalid Request");
				ws.close();
				return (false);
			}
			const tournament: Tournament | undefined = objects.get(json.tournament_id) as Tournament | undefined;
			if (tournament == undefined) {
				WebsocketConnection.static_send_error(ws, "Not Found");
				ws.close();
				return (false);
			}
			return (tournament.recv(ws, json as ClientToTournament));
		}
	}
};



