import Fastify from 'fastify';
import type { fastifyWebsocket } from '@fastify/websocket';
import websocketPlugin from '@fastify/websocket';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { GameLobby } from './lobby/GameLobby.js';
import { Tournament } from './Tournament.js';
import { WebsocketConnection } from './WebsocketConnection.js';

import { createMatchMeta, completeMatch, } from '../../functions/match.js';
import type { NewMatch } from '../../functions/match.js';
import { GameServer } from './GameServer.js';
import type { ClientParticipation } from './GameServer.js';

import type {
	LeaveReq,
	StateReq,
	StartReq,
	TournamentState,
} from '../game_shared/TournamentApiTypes.js';

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
	DefaultResp,
} from '../game_shared/message_types.js';

import { LobbyType } from '../game_shared/message_types.js';
import { is_ServerError } from '../game_shared/message_types.js';

const join_schema = {
	body: {
		type: 'object',
		required: ['password', 'user_id', 'display_name', 'lobby_id' ],
		properties: {
			user_id: { type: 'number' },
			lobby_id: { type: 'number' },
			password: { type: 'string' },
			display_name: { type: 'string' },
		}
	}
};

const leave_schema = {
	body: {
		type: 'object',
		required: ['client_id', 'tournament_id'],
		properties: {
			client_id: { type: 'number' },
			tournament_id: { type: 'number' },
		}
	}
};

const state_schema = {
	body: {
		type: 'object',
		required: ['client_id', 'lobby_id', ],
		properties: {
			client_id: { type: 'number' },
			lobby_id: { type: 'number' },
		}
	}
};

const start_schema = {
	body: {
		type: 'object',
		required: [ 'client_id', 'tournament_id', ],
		properties: {
			client_id: { type: 'number' },
			tournament_id: { type: 'number' },
		}
	}
};

const create_tournament_schema = {
	body: {
		type: 'object',
		required: ['map_name', 'password', 'client_id'],
		properties: {
			map_name: { type: 'string' },
			password: { type: 'string' },
			client_id: { type: 'number' },
		}
	}
};

export class TournamentApi {
	private constructor(){}

	static init(fastify: FastifyInstance) {

		TournamentApi.create_tournament_api = TournamentApi.create_tournament_api.bind(TournamentApi);
		fastify.post<{Body: CreateTournamentReq}>(
			'/api/create_tournament',
			{ schema: create_tournament_schema},
			async (request, reply) => {
				return (TournamentApi.create_tournament_api(request));
			}
		);

		TournamentApi.join_tournament_api = TournamentApi.join_tournament_api.bind(TournamentApi);
		fastify.post<{Body: JoinReq}>(
			'/api/join_tournament',
			{ schema: join_schema},
			async (request, reply) => {
				return (await TournamentApi.join_tournament_api(request));
			}
		);

		TournamentApi.start_tournament_api = TournamentApi.start_tournament_api.bind(TournamentApi);
		fastify.post<{Body: StartReq}>(
			'/api/start_tournament',
			{ schema: start_schema},
			async (request, reply) => {
				return (TournamentApi.start_tournament_api(request));
			}
		);

		TournamentApi.leave_tournament_api = TournamentApi.leave_tournament_api.bind(TournamentApi);
		fastify.post<{Body: LeaveReq}>(
			'/api/leave_tournament',
			{ schema: leave_schema},
			async (request, reply) => {
				TournamentApi.leave_tournament_api(request);
			}
		);

		//TournamentApi.tournament_state_api = TournamentApi.tournament_state_api.bind(TournamentApi);
		//fastify.post<{Body: StateReq}>(
		//	'/api/tournament_state',
		//	{ schema: state_schema},
		//	async (request, reply) => {
		//		TournamentApi.tournament_state_api(request);
		//	}
		//);
	}

	static next_tournament_id: number = 1;
	static create_tournament_api(request: FastifyRequest<{Body: CreateTournamentReq}>)
		: CreateTournamentResp
	{
		const response: CreateTournamentResp = {
			error: "",
			tournament_id: -1,
		};

		const { map_name, password, client_id } = request.body;
		const parti: ClientParticipation | undefined = GameServer.client_participations.get(client_id);
		if (parti && parti.tournament_id) {
			response.error = 'Allready in tournament';
			return (response);
		}
		const tournament_id: number = TournamentApi.next_tournament_id++;

		const tournament: Tournament = new Tournament(map_name,
			password, tournament_id, GameServer.finish_tournament_callback);
		GameServer.tournaments.set(tournament_id, tournament);
		response.tournament_id = tournament_id;
		console.log("create_tournament api: ", response);
		return (response);
	}

	static async join_tournament_api(request: FastifyRequest< { Body: JoinReq } >)
		: Promise<DefaultResp>
	{
		const msg: DefaultResp = {
			error: '',
			type: 'default',
		};
		const { lobby_id, user_id, password, display_name } = request.body;
		const parti: ClientParticipation | undefined = GameServer.client_participations.get(user_id);
		if (parti && parti.tournament_id != lobby_id) {
			msg.error = 'Allready in game'
			return (msg);
		}

		const tournament: Tournament | undefined = GameServer.tournaments.get(lobby_id);
		if (!tournament) {
			console.log("join_tournament api: Not Found");
			msg.error = "Not Found";
			return (msg);
		}
		msg.error = tournament.join(user_id, display_name, password),
		console.log("join_tournament api: ", msg);
		return (msg);
	}

	static leave_tournament_api(request: FastifyRequest< { Body: LeaveReq } >) {
		const { client_id, tournament_id } = request.body;
		const tournament: Tournament | undefined = GameServer.tournaments.get(tournament_id);
		if (!tournament) {
			console.log("leave_tournament api: Not Found tournament_id ", tournament_id, "; client_id: ", client_id);
			return ;
		}
		console.log("leave_tournament api: ", client_id);
		tournament.leave(client_id);
	}

	static start_tournament_api(request: FastifyRequest< { Body: StartReq } >): DefaultResp {
		const msg: DefaultResp = {
			error: '',
			type: 'default',
		};
		console.log('tournaments: ', GameServer.tournaments);
		const { client_id, tournament_id } = request.body;
		const tournament: Tournament | undefined = GameServer.tournaments.get(tournament_id);
		if (!tournament) {
			console.log("start_tournament api: Not Found");
			msg.error = 'Not Found';
			return (msg);
		}
		msg.error = tournament.start(client_id);
		console.log("start_tournament api: ", msg);
		return (msg);
	}

	//static tournament_state_api(request: FastifyRequest< { Body: StateReq } >): TournamentState | ServerError {
	//	const { client_id, tournament_id } = request.body;
	//	const tournament: Tournament | undefined = GameServer.tournaments.get(tournament_id);
	//	if (!tournament) {
	//		console.log("tournament_state api: Not Found");
	//		return ("Not Found");
	//	}
	//	const ret: TournamentState = tournament.get_state(client_id);
	//	console.log("tournament_state api: ", ret);
	//	return (ret);
	//}
};
