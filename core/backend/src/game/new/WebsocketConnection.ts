import type { WebSocket } from '@fastify/websocket';
import assert from 'assert';

import { Tournament } from './Tournament.ts';
import { GameLobby } from './lobby/GameLobby.ts';

import type {
	ServerToClientError,
	ServerToClientMessage,
	ClientToServerMessage
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
					msg: 'internal error(msg was not stringifyable and not ArrayBuffer?)',
				};
				data = JSON.stringify(error_resp);
			}
		}
		try {
			ws.send(data);
			return ;
		} catch (error) {
			console.log("tryed to send\n", data, "but got this error:\n", error);
			if (ws.readyState == WebSocket.OPEN) {
				ws.close();
			}
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
					msg: 'internal error(msg was not stringifyable and not ArrayBuffer?)',
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
			if (this._ws.readyState == WebSocket.OPEN) {
				this._ws.close();
			}
			return ;
		}
	}

	public send_error(error_msg: ServerToClientError) {
		assert(error_msg.type == 'error' && error_msg.msg === 'string', "Invalid argument type");
		this._send(error_msg);
	}

	static recv_msg(
		msg: string,
		ws: WebSocket,
		games: GameLobby[],
		tournaments: Tournament[]
	) :boolean
	{
		const error: ServerToClientError = {
			type: 'error',
			msg: 'Invalid websocket msg',
		};
		let json: ClientToServerMessage;
		try {
			json = JSON.parse(msg) as ClientToServerMessage;
		} catch (e: any) {
			WebsocketConnection.static_send(ws, error);
			if (ws.readyState == WebSocket.OPEN) {
				ws.close();
			}
			return (false);
		}
		switch (json.type) {
			//todo: add cases here
			default:
				WebsocketConnection.static_send(ws, error);
				if (ws.readyState == WebSocket.OPEN) {
					ws.close();
				}
				return (false);
		}
		return (true);
	}

};



