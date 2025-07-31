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

const join_schema = {
	body: {
		type: 'object',
		required: ['map_name', 'password', ],
		properties: {
			user_id: { type: 'number' },
			map_name: { type: 'string' },
			lobby_id: { type: 'number' },
			password: { type: 'string' },
			display_name: { type: 'string' },
		}
	}
};

const create_tournament_schema = {
	body: {
		type: 'object',
		required: [],
		properties: {
			map_name: { type: 'string' },
			password: { type: 'string' },
		}
	}
};

export class TournamentApi {
	private constructor(){}
	static tournaments: Map<number, Tournament> = new Map<number, Tournament>;

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
	}

	static next_tournament_id: number = 1;
	static create_tournament_api(request: FastifyRequest<{Body: CreateTournamentReq}>)
		: CreateTournamentResp
	{
		const response: CreateTournamentResp = {
			error: "",
			tournament_id: -1,
		};

		const { map_name, password } = request.body;
		const tournament_id: number = TournamentApi.next_tournament_id++;

		const tournament: Tournament = new Tournament(map_name, password);
		TournamentApi.tournaments.set(tournament_id, tournament);
		response.tournament_id = tournament_id;
		return (response);
	}

	static async join_tournament_api(request: FastifyRequest< { Body: JoinReq } >)
		: Promise<ServerError>
	{
		const { lobby_id, user_id, password, map_name, display_name } = request.body;

		const tournament: Tournament | undefined = TournamentApi.tournaments.get(lobby_id);
		if (!tournament) {
			return ("Not Found");
		}
		const msg: ServerError = tournament.join(user_id, map_name, display_name, password);
		return (msg);
	}

	static leave_tournament_api(client_id: number, password: string) {
	}

	static start_tournament_api(password: string) {
	}

	static tournament_state_api(password: string) {
	}

	static tournament_get_game_api(client_id: number, password: string) {
	}
};
