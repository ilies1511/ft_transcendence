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
	public ws: WebSocket;
	public invalid_socket: boolean;

	constructor(ws: WebSocket) {
		this.ws = ws;
		this.invalid_socket = this.ws.readyState !== WebSocket.OPEN;
	}

	static static_send(ws: WebSocket, msg: ServerToClientMessage) {
		if (ws.readyState !== WebSocket.OPEN) {
			//console.log("tryed to send\n", msg, "\nthrough socket was not open");
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
			console.log("Game: send: ", data);
			return ;
		} catch (error) {
			console.log("tryed to send\n", data, "but got this error:\n", error);
			ws.close();
			return ;
		}
	}

	public send(msg: ServerToClientMessage) {
		if (this.invalid_socket) {
			console.log("tryed to send\n", msg, "\nthrough socket marked as invalid");
			return ;
		}
		if (this.ws.readyState !== WebSocket.OPEN) {
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
			this.ws.send(data);
			return ;
		} catch (error) {
			console.log("tryed to send\n", data, "but got this error:\n", error);
			this.invalid_socket = true;
			this.ws.close();
			return ;
		}
	}

	public send_error(error: ServerError) {
		const error_msg: ServerToClientError = {
			type: 'error',
			msg: error,
		};
		this.send(error_msg);
	}

	static static_send_error(ws:WebSocket, error: ServerError) {
		const error_msg: ServerToClientError = {
			type: 'error',
			msg: error,
		};
		WebsocketConnection.static_send(ws, error_msg);
	}

};



