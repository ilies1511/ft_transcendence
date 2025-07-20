import Fastify from 'fastify';
import type { fastifyWebsocket } from '@fastify/websocket';
import websocketPlugin from '@fastify/websocket';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { GameLobby } from './lobby/GameLobby.ts';
import { Tournament } from './Tournament.ts';
import { WebsocketConnection } from './WebsocketConnection.ts';

import type {
	GameOptions,
	GameStartInfo,
	ServerToClientJson,
	ServerToClientMessage,
	ClientToServerInput,
	EnterMatchmakingReq,
	EnterMatchmakingResp,
	CreateLobbyReq,
	CreateLobbyResp,
	CreateTournamentReq,
	CreateTournamentResp,
	ReconnectReq,
	ReconnectResp,
	ServerError,
	ClientToMatch,
} from '../game_shared/message_types.ts';


/*
API endpoints:
	- /enter_matchmaking -> takes the player id and map name; returns match id
	- /create_lobby ->  like enter_matchmaking but also takes a password; returns match id
	- /create_tournament -> input playercount, map, password; returns tournament id
	- /reconnect -> input user id; returns potential tournament and match id the user is currently taking part in


websocket endpoints:
	- /game/{game_id} -> opens websocket to connect to a game(lobby), might need password on first connection
	- tournament/{tournament_id} -> opens websocket to trournament, first connection needs password verification
*/

const enter_matchmaking_schema = {
	body: {
		type: 'object',
		required: ['user_id', 'map_name', 'ai_count'],
		properties: {
			user_id: { type: 'number' },
			map_name: { type: 'string' },
			ai_count: { type: 'number' }
		}
	}
};

const create_lobby_schema = {
	body: {
		type: 'object',
		required: ['map_name', 'ai_count', 'password'],
		properties: {
			map_name: { type: 'string' },
			ai_count: { type: 'number' },
			password: { type: 'string' },
		}
	}
};

//todo
const create_tournament_schema = {
	body: {
		type: 'object',
		required: [],
		properties: {
		}
	}
};

const reconnect_schema = {
	body: {
		type: 'object',
		required: ['client_id'],
		properties: {
			client_id: { type: 'number' },
		}
	}
};

export class GameServer {
	private _lobbies: Map<number, GameLobby> = new Map<number, GameLobby>;
	private _tournaments: Map<number, Tournament> = new Map<number, Tournament>;
	private _fastify: FastifyInstance;


	constructor(fastify: FastifyInstance) {
		console.log("[GAME-BACK-END] constructor");
		this._fastify = fastify;
	

		this._enter_matchmaking_api = this._enter_matchmaking_api.bind(this);
		this._fastify.post<{Body: EnterMatchmakingReq}>(
			'/api/enter_matchmaking',
			{ schema: enter_matchmaking_schema},
			async (request, reply) => {
				return (await this._enter_matchmaking_api(request));
			}
		);

		this._create_tournament_api = this._create_tournament_api.bind(this);
		this._fastify.post<{Body: CreateTournamentReq}>(
			'/api/create_tournament',
			{ schema: create_tournament_schema},
			async (request, reply) => {
				return (await this._create_tournament_api(request));
			}
		);

		this._reconnect_api = this._reconnect_api.bind(this);
		this._fastify.post<{Body: ReconnectReq}>(
			'/api/reconnect',
			{ schema: reconnect_schema},
			async (request, reply) => {
				return (await this._reconnect_api(request));
			}
		);

		this._create_lobby_api = this._create_lobby_api.bind(this);
		this._fastify.post<{Body: CreateLobbyReq}>(
			'/api/create_lobby',
			{ schema: create_lobby_schema},
			async (request, reply) => {
				return (await this._create_lobby_api(request));
			}
		);


		this._rcv_game_msg = this._rcv_game_msg.bind(this);
		this._fastify.get('/game/:game_id', { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
			const { game_id } = req.params as { game_id: string };
			socket.on('message', (raw) => {
				this._rcv_game_msg(game_id, raw.toString(), socket);
			});
		});

		this._rcv_tournament_msg = this._rcv_tournament_msg.bind(this);
		this._fastify.get('/tournament/:tournament_id', { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
			const { tournament_id } = req.params as { tournament_id: string };
			socket.on('message', (raw) => {
				this._rcv_tournament_msg(tournament_id, raw.toString(), socket);
			});
		});
	}


	private async _enter_matchmaking_api(request: FastifyRequest< { Body: EnterMatchmakingReq } >)
		: Promise<EnterMatchmakingResp>
	{
		const response: EnterMatchmakingResp = {
			error: "",
			match_id: -1,
		};

		const { user_id, map_name, ai_count } = request.body;
		console.log("GAME: _enter_matchmaking_api: ", request.body);
		for (const [lobby_id, lobby] of this._lobbies) {
			if (lobby.join(user_id, map_name)) {
				response.match_id = lobby_id;
				return (response);
			}
		}
	
		try {
			const lobby_id: number = await this._create_lobby(map_name, ai_count)
			const lobby: GameLobby | undefined = this._lobbies.get(lobby_id);
			if (lobby === undefined) {
				console.log("lobby not in this._lobbies eventhough it was just created");
				response.error = "internal error";
				return (response);
			}
			try {
				if (!lobby.join(user_id, map_name)) {
					response.error = "Could not join newly created game, game the settings weird?";
					return (response);
				}
				response.match_id = lobby_id;
				return (response);
			} catch (error) {
				console.log(error);
				response.error = error;
				return (response);
			}
		} catch (error) {
			console.log(error);
			response.error = error;
			return (response);
		}
	}

	private async _create_lobby_api(request: FastifyRequest< { Body: CreateLobbyReq } >)
		: Promise<CreateLobbyResp>
	{
		const response: CreateLobbyResp = {
			error: "",
			match_id: -1,
		};
		const { map_name, ai_count, password } = request.body;
		try {
			const lobby_id: number = await this._create_lobby(map_name, ai_count, password);
			response.match_id = lobby_id;
			return (response);
		} catch (error) {
			response.error = error;
			return (response);
		}
	}

	//todo: finish this
	private async _create_tournament_api(request: FastifyRequest<{Body: CreateTournamentReq}>)
		: Promise<CreateTournamentResp>
	{
		const response: CreateTournamentResp = {
			error: "",
			tournament_id: -1,
		};

		return (response);
	}

	//todo: finish this
	private async _reconnect_api(request: FastifyRequest<{Body: ReconnectReq}>)
		: Promise<ReconnectResp>
	{
		const response: ReconnectResp = {
			match_id: -1,
			match_has_password: false,
			tournament_id: -1,
		};

		return (response);
	}

	private _rcv_game_msg(game_id_str: string, message: string, ws: WebSocket) {
		console.log("game: got game msg: ", message);
		try {
			const game_id: number = parseInt(game_id_str);
			const lobby: GameLobby | undefined = this._lobbies.get(game_id);
			if (lobby == undefined) {
				console.log("game: lobby with key ", game_id, " was not found");
				WebsocketConnection.static_send_error(ws, 'Not Found');
				ws.close();
				return ;
			}
			let data: ClientToMatch;
			try {
				data = JSON.parse(message) as ClientToMatch;
			} catch (e) {
				WebsocketConnection.static_send_error(ws, 'Invalid Request');
				ws.close();
				return ;
			}
			lobby.recv(ws, data);
			return ;
		} catch (e) {
			console.log("error: ", e);
			WebsocketConnection.static_send_error(ws, 'Not Found');
			ws.close();
			return ;
		}
	}

	//todo
	private _rcv_tournament_msg(tournament_id_str: string, message: string, ws: WebSocket) {
		console.log("game: got tournament msg: ", message);
	}

	//returns the lobby id or and error string
	protected async _create_lobby(
		map_name: string,
		ai_count: number,
		password?: string
	): Promise<number>
	{
		const lobby_id: number = 0;
		//todo: actually create lobby in db and use real id
		//const lobby_id: number = await create looby in db();
		const lobby: GameLobby = new GameLobby(lobby_id, map_name, ai_count, password);
		this._lobbies.set(lobby_id, lobby);
		return (lobby_id);
	}
};
