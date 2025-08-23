import Fastify from 'fastify';
import type { fastifyWebsocket } from '@fastify/websocket';
import websocketPlugin from '@fastify/websocket';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { GameLobby } from './lobby/GameLobby.ts';
import { Tournament } from './Tournament.ts';
import { WebsocketConnection } from './WebsocketConnection.ts';

import { createMatchMeta, completeMatch, } from '../../functions/match.ts';
import type { NewMatch } from '../../functions/match.ts';
import { TournamentApi } from './TournamentApi.ts';


import type {
	GameOptions,
	ServerToClientMessage,
	EnterMatchmakingReq,
	EnterMatchmakingResp,
	CreateLobbyReq,
	CreateLobbyResp,
	JoinReq,
	CreateTournamentReq,
	CreateTournamentResp,
	ReconnectReq,
	ReconnectResp,
	ServerError,
	ClientToMatch,
	LobbyDisplaynameResp,
	GameToClientFinish,
	ClientToTournament,
} from '../game_shared/message_types.ts';

import { LobbyType } from '../game_shared/message_types.ts';
import { is_ServerError } from '../game_shared/message_types.ts';

import { randomBytes } from "crypto";

export function generate_password(length: number = 16): string {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?";
	const bytes = randomBytes(length);
	let password = "";
	for (let i = 0; i < length; i++) {
		password += chars[bytes[i] % chars.length];
	}
	
	return (password);
}



/*
API endpoints:
	- /enter_matchmaking -> takes the player id and map name; returns match id
	- /create_lobby ->	like enter_matchmaking but also takes a password; returns match id
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
			display_name: { type: 'string' },
			map_name: { type: 'string' },
			ai_count: { type: 'number' }
		}
	}
};

const create_lobby_schema = {
	body: {
		type: 'object',
		required: ['map_name', 'ai_count', 'password', 'client_id'],
		properties: {
			map_name: { type: 'string' },
			ai_count: { type: 'number' },
			password: { type: 'string' },
			client_id: { type: 'number' },
		}
	}
};

const join_schema = {
	body: {
		type: 'object',
		required: [ 'password', ],
		properties: {
			user_id: { type: 'number' },
			lobby_id: { type: 'number' },
			password: { type: 'string' },
			display_name: { type: 'string' },
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


export type ClientParticipation = {
	lobby_id?: number;
	tournament_id?: number;
};

export class GameServer {
	public static lobbies: Map<number, GameLobby> = new Map<number, GameLobby>;
	public static tournaments: Map<number, Tournament> = new Map<number, Tournament>;
	public static client_participations: Map<number, ClientParticipation> = new Map<number, ClientParticipation>;
	private static _fastify: FastifyInstance;

	private constructor(){}

	public static init(fastify: FastifyInstance) {
		console.log("[GAME-BACK-END] constructor");

		GameServer._remove_lobby = GameServer._remove_lobby.bind(GameServer);

		GameServer._fastify = fastify;

		TournamentApi.init(fastify);

		GameServer._enter_matchmaking_api = GameServer._enter_matchmaking_api.bind(GameServer);
		GameServer._fastify.post<{Body: EnterMatchmakingReq}>(
			'/api/enter_matchmaking',
			{ schema: enter_matchmaking_schema},
			async (request, reply) => {
				return (await GameServer._enter_matchmaking_api(request));
			}
		);

		GameServer._reconnect_api = GameServer._reconnect_api.bind(GameServer);
		GameServer._fastify.post<{Body: ReconnectReq}>(
			'/api/reconnect',
			{ schema: reconnect_schema},
			async (request, reply) => {
				return (await GameServer._reconnect_api(request));
			}
		);

		GameServer.create_lobby_api = GameServer.create_lobby_api.bind(GameServer);
		GameServer._fastify.post<{Body: CreateLobbyReq}>(
			'/api/create_lobby',
			{ schema: create_lobby_schema},
			async (request, reply) => {
				return (await GameServer.create_lobby_api(request));
			}
		);

		GameServer._join_lobby_api = GameServer._join_lobby_api.bind(GameServer);
		GameServer._fastify.post<{Body: JoinReq}>(
			'/api/join_lobby',
			{ schema: join_schema},
			async (request, reply) => {
				return (await GameServer._join_lobby_api(request));
			}
		);

		GameServer._display_names_api = GameServer._display_names_api.bind(GameServer);
		GameServer._fastify.get(
			'/game/:game_id/display_names',
			async (request: FastifyRequest<{ Params: { game_id: string } }>, reply: FastifyReply) => {
			const {game_id } = request.params as { game_id: string};
				return (await GameServer._display_names_api(game_id));
			}
		);


		GameServer._rcv_game_msg = GameServer._rcv_game_msg.bind(GameServer);
		GameServer._close_socket_lobby_handler = GameServer._close_socket_lobby_handler.bind(GameServer);
		GameServer._fastify.get('/game/:game_id', { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
			const { game_id } = req.params as { game_id: string };
			socket.on('message', (raw) => {
				GameServer._rcv_game_msg(game_id, raw.toString(), socket);
			});
			socket.on('close', () => {
				GameServer._close_socket_lobby_handler(game_id, socket);
			});
		});

		GameServer._fastify.get('/tournament/:tournament_id_str', { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
			const { tournament_id_str } = req.params as { tournament_id_str: string };
			socket.on('message', (raw) => {
				try {
					const tournament_id: number = parseInt(tournament_id_str);
					const tournament: Tournament | undefined = this.tournaments.get(tournament_id);
					if (!tournament) {
						socket.close();
						console.log("no tournament for id ", tournament_id_str);
						console.log(this.tournaments);
						return ;
					}
					tournament.rcv_msg(raw.toString(), socket);
				} catch (e) {
					socket.close();
					console.log(e);
					return ;
				}

			});
			socket.on('close', () => {
				//GameServer._close_socket_lobby_handler(game_id, socket);
			});
		});
	}


	public static add_client_lobby_participation(client_id: number, lobby_id: number) {
		if (!this.client_participations.get(client_id)) {
			const parti: ClientParticipation = {
			};
			this.client_participations.set(client_id, parti);
			console.log(`[participation] created new participation record for client ${client_id}`);
		}
		const prev = this.client_participations.get(client_id).lobby_id;
		this.client_participations.get(client_id).lobby_id = lobby_id;
		console.log(`[participation] lobby set: client=${client_id}, from=${prev ?? "none"} to=${lobby_id}`);
	}

	public static remove_client_lobby_participation(client_id: number, lobby_id: number) {
		console.log(`[participation] remove lobby: client=${client_id}, lobby=${lobby_id}`);
		const parti: ClientParticipation | undefined = this.client_participations.get(client_id)
		if (!parti) {
			console.log(`[participation] error: no participation found for client ${client_id}`);
			return ;
		}
		if (parti.lobby_id == lobby_id) {
			console.log(`[participation] clearing lobby for client ${client_id} (was ${parti.lobby_id})`);
			parti.lobby_id = undefined;
			if (!parti.tournament_id) {
				this.client_participations.delete(client_id);
				console.log(`[participation] removed empty participation record for client ${client_id}`);
			} else {
				console.log(`[participation] kept participation record for client ${client_id} (tournament_id=${parti.tournament_id})`);
			}
		} else {
			console.log(`[participation] error: tried to remove client ${client_id} from lobby ${lobby_id}, but client was in lobby ${parti.lobby_id}`);
		}
	}

	public static add_client_tournament_participation(client_id: number, tournament_id: number) {
		if (!this.client_participations.get(client_id)) {
			const parti: ClientParticipation = {
			};
			this.client_participations.set(client_id, parti);
			console.log(`[participation] created new participation record for client ${client_id}`);
		}
		const parti: ClientParticipation = this.client_participations.get(client_id) as ClientParticipation;
		if (parti.tournament_id) {
			console.log(`[participation] error: setting client ${client_id} tournament, but it was already ${parti.tournament_id}`);
		}
		const prev = parti.tournament_id;
		parti.tournament_id = tournament_id;
		console.log(`[participation] tournament set: client=${client_id}, from=${prev ?? "none"} to=${tournament_id}`);
	}

	public static remove_client_tournament_participation(client_id: number, tournament_id: number) {
		const parti: ClientParticipation | undefined = this.client_participations.get(client_id)
		if (!parti) {
			console.log(`[participation] error: no participation found for client ${client_id}`);
			return ;
		}
		if (parti.tournament_id !== undefined && parti.tournament_id !== tournament_id) {
			console.log(`[participation] warn: removing tournament ${tournament_id} but client had ${parti.tournament_id}`);
		}
		parti.tournament_id = undefined;
		console.log(`[participation] cleared tournament for client ${client_id}`);
		if (!parti.lobby_id) {
			this.client_participations.delete(client_id);
			console.log(`[participation] removed empty participation record for client ${client_id}`);
		} else {
		}
	}

	private static _close_socket_lobby_handler(lobby_id_str: string, ws: WebSocket) {
		try {
			const lobby_id: number = parseInt(lobby_id_str);
			const lobby: GameLobby | undefined = GameServer.lobbies.get(lobby_id);
			if (!lobby) {
				ws.close();
				return ;
			}
			lobby.ws_close_handler(ws);
			return ;
		} catch (e) {
			console.log("error: ", e);
			ws.close();
			return ;
		}
	}

	private static async _enter_matchmaking_api(request: FastifyRequest< { Body: EnterMatchmakingReq } >)
		: Promise<EnterMatchmakingResp>
	{
		const response: EnterMatchmakingResp = {
			error: "",
			match_id: -1,
		};

		const { user_id, display_name, map_name, ai_count } = request.body;
		console.log("GAME: _enter_matchmaking_api: ", request.body);

		const parti: ClientParticipation | undefined = this.client_participations.get(user_id);

		if (parti && parti.lobby_id) {
			response.error = "Allready in game";
			return (response);
		}

		for (const [lobby_id, lobby] of GameServer.lobbies) {
			if (lobby.join(user_id, display_name) == "") {
				response.match_id = lobby_id;
				return (response);
			}
		}
	
		try {
			const lobby_id: number = await GameServer.create_lobby(LobbyType.MATCHMAKING,
				map_name, ai_count)
			const lobby: GameLobby | undefined = GameServer.lobbies.get(lobby_id);
			if (lobby === undefined) {
				console.log("lobby not in GameServer.lobbies eventhough it was just created");
				response.error = "Internal Error";
				return (response);
			}
			const join_error: ServerError = lobby.join(user_id, display_name);
			if (join_error != "") {
				console.log("Could not join newly created game, game the settings weird?");
				console.log("Error: ", join_error);
				response.error = "Internal Error";
				return (response);
			}
			response.match_id = lobby_id;
			return (response);
		} catch (e) {
			const error: ServerError | undefined = is_ServerError(e);
			if (error == undefined) {
				throw (e);
			}
			response.error = error;
			return (response);
		}
	}

	private static async create_lobby_api(request: FastifyRequest< { Body: CreateLobbyReq } >)
		: Promise<CreateLobbyResp>
	{
		const response: CreateLobbyResp = {
			error: "",
			match_id: -1,
		};
		const { map_name, ai_count, password, client_id } = request.body;

		const parti: ClientParticipation | undefined = GameServer.client_participations.get(client_id);
		if (parti && parti.lobby_id) {
			response.error = "Allready in game";
			return (response);
		}
		if (parti && parti.tournament_id) {
			response.error = "Allready in tournament";
			return (response);
		}

		try {
			const lobby_id: number = await GameServer.create_lobby(LobbyType.CUSTOM,
				map_name, ai_count, password);
			response.match_id = lobby_id;
			return (response);
		} catch (e) {
			const error: ServerError | undefined = is_ServerError(e);
			if (error == undefined) {
				throw (e);
			}
			response.error = error;
			return (response);
		}
	}

	private static async _join_lobby_api(request: FastifyRequest< { Body: JoinReq } >)
		: Promise<ServerError>
	{
		const { lobby_id, user_id, password, display_name } = request.body;

		const parti: ClientParticipation | undefined = this.client_participations.get(user_id);

		if (parti && parti.lobby_id) {
			return ("Allready in game");
		}

		const lobby: GameLobby | undefined = GameServer.lobbies.get(lobby_id);
		if (!lobby) {
			return ("Not Found");
		}
		const msg: ServerError = lobby.join(user_id, display_name, password);
		return (msg);
	}

	private static async _reconnect_api(request: FastifyRequest<{Body: ReconnectReq}>)
		: Promise<ReconnectResp>
	{
		const { client_id } = request.body;
		const response: ReconnectResp = {
			match_id: -1,
			match_password: '',
			tournament_id: -1,
			tournament_password: '',
			lobby_type: LobbyType.INVALID,
		};

		const parti: ClientParticipation | undefined = GameServer.client_participations.get(client_id);
		if (!parti) {
			return (response);
		}
		if (parti.lobby_id) {
			const lobby: GameLobby | undefined = GameServer.lobbies.get(parti.lobby_id);
			if (!lobby) {
				console.log(`Error: client had lobby participation ${parti}, but match ${parti.lobby_id} was not found!`);
				return (response);
			}
			response.match_id = parti.lobby_id;
			response.lobby_type = lobby.lobby_type;
			response.match_password = lobby.password;
		}
		if (parti.tournament_id) {
			const tournament: Tournament | undefined = GameServer.tournaments.get(parti.tournament_id);
			if (!tournament) {
				console.log(`Error: client had tournament participation ${parti}, but tournament ${parti.tournament_id} was not found!`);
				return (response);
			}
			response.tournament_id = parti.tournament_id;
			response.tournament_password = tournament.password;
		}

		return (response);
	}

	private static async _display_names_api(game_id_str: string)
		: Promise<LobbyDisplaynameResp>
	{
		try {
			const game_id: number = parseInt(game_id_str);
			const lobby: GameLobby | undefined = GameServer.lobbies.get(game_id);
			if (lobby == undefined) {
				console.log("game: _display_names_api: lobby with key ", game_id, " was not found");
				return ({error: 'Not Found', data: []});
			}
			if (lobby.engine == undefined) {
				console.log("game: _display_names_api: ", game_id, ": game did not start yet");
				return ({error: 'Not Found', data: []});
			}
			return (lobby.get_lobby_displaynames());
			
		} catch (e) {
			console.log("game: lobby key invalid: ", game_id_str, "; _display_names_api");
			return ({error: 'Not Found', data: []});
		}
	}

	private static _rcv_game_msg(game_id_str: string, message: string, ws: WebSocket) {
		//console.log("game: got game msg: ", message);
		try {
			const game_id: number = parseInt(game_id_str);
			const lobby: GameLobby | undefined = GameServer.lobbies.get(game_id);
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

	private static _remove_lobby(id: number, end_data: GameToClientFinish): undefined {
		//console.trace(`_remove_lobby called for lobby ${id}`);
		if (end_data && end_data.mode != LobbyType.INVALID) {
			const match_data: NewMatch = {
				duration: end_data.duration,
				mode: end_data.mode,
				participants: [],
			};
			let i = 0;
			let win_result: 'win' | 'draw' = 'win';
			let winners: number = 0;
			for (const placement of end_data.placements) {
				if (placement.final_placement == 1) {
					winners++;
				}
			}
			if (winners > 1) {
				win_result = 'draw';
			}
			while (i < end_data.placements.length) {
				let result: 'win' | 'loss' | 'draw' = 'loss';
				if (end_data.placements[i].final_placement == 1) {
					result = win_result;
				}
				//don't push local player results to db
				if (end_data.placements[i].id > 0) {
					match_data.participants.push({user_id: end_data.placements[i].id,
						score: end_data.placements[i].final_placement, result: result});
				}
				i++;
			}
			completeMatch(GameServer._fastify, id, match_data);
		}
		console.log("removing lobby ", id);
		GameServer.lobbies.delete(id);
	}

	//returns the lobby id or and error string
	public static async create_lobby(
		lobby_type: LobbyType,
		map_name: string,
		ai_count: number,
		password?: string,
		first_completion_callback?: (id: number, end_data: GameToClientFinish) => undefined,
	): Promise<number>
	{
		const lobby_id: number = await createMatchMeta(GameServer._fastify, lobby_type);
		const lobby: GameLobby = new GameLobby(lobby_type, GameServer._remove_lobby,
			lobby_id, map_name, ai_count, password, first_completion_callback);
		GameServer.lobbies.set(lobby_id, lobby);
		return (lobby_id);
	}

	public static finish_tournament_callback(id: number): undefined {
		console.log("removing tournament with id: ", id);
		GameServer.tournaments.delete(id);
	}
};
