import Fastify from 'fastify';
import type { fastifyWebsocket } from '@fastify/websocket';
import websocketPlugin from '@fastify/websocket';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { GameLobby } from './lobby/GameLobby.ts';

import type {
	GameOptions,
	GameStartInfo,
	ServerToClientJson,
	ServerToClientMessage,
	ClientToServerInput,
	EnterMatchmakingReq,
	EnterMatchmakingResp,
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
		required: ['map_name', 'ai_count'],
		properties: {
			user_id: { type: 'number' },
			map_name: { type: 'string' },
			ai_count: { type: 'number' }
		}
	}
};

export class GameServer {
	protected _lobbies: Map<number, GameLobby> = new Map<number, GameLobby>;
	protected _fastify: FastifyInstance;


	constructor(fastify: FastifyInstance) {
		console.log("[GAME-BACK-END] constructor");
		this._fastify = fastify;
	

		this._enter_matchmaking = this._enter_matchmaking.bind(this);
		this._fastify.post<{Body: EnterMatchmakingReq}>(
			'/api/enter_matchmaking',
			{ schema: enter_matchmaking_schema},
			async (request, reply) => {
				return (await this._enter_matchmaking(request));
			}
		);


		this._rcv_game_msg = this._rcv_game_msg.bind(this);
		this._fastify.get('/game:game_id', { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
			const { game_id } = req.params as { game_id: string };
			socket.on('message', (raw) => {
				this._rcv_game_msg(game_id, raw.toString(), socket);
			});
		});

		this._rcv_tournament_msg = this._rcv_tournament_msg.bind(this);
		this._fastify.get('/tournament:game_id', { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
			const { tournament_id } = req.params as { tournament_id: string };
			socket.on('message', (raw) => {
				this._rcv_tournament_msg(tournament_id, raw.toString(), socket);
			});
		});
	}

	private async _enter_matchmaking(request: FastifyRequest< { Body: EnterMatchmakingReq } >)
		: Promise<EnterMatchmakingResp>
	{
		const response = {
			error: "",
			game_id: -1,
		};

		const { user_id, map_name, ai_count } = request.body;
		console.log("GAME: _enter_matchmaking: ", request.body);
		for (const [lobby_id, lobby] of this._lobbies) {
			if (lobby.join(user_id, map_name)) {
				response.game_id = lobby_id;
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
				lobby.join(user_id, map_name);
				response.game_id = lobby_id;
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

	private _rcv_game_msg(game_id_str: string, message: string, ws: WebSocket) {
	}

	private _rcv_tournament_msg(tournament_id_str: string, message: string, ws: WebSocket) {
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
		//lobby_id = await create looby in db();
		const lobby: GameLobby = new GameLobby(lobby_id, map_name, ai_count, password);
		this._lobbies.set(lobby_id, lobby);
		return (lobby_id);
	}
};
