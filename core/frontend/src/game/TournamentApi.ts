import type {
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
	LobbyDisplaynameResp,
} from './game_shared/message_types.ts';

import type {
	LeaveReq,
	StateReq,
	TournamentState,
	StartReq,
} from './game_shared/TournamentApiTypes.ts';


export class TournamentApi {
	private constructor() {}

	public static async create_tournament(
		map_name: string,
		password: string,
	) : Promise<CreateTournamentResp>
	{
		const req: CreateTournamentReq = {
			map_name: map_name,
			password: password,
		};
		const response = await fetch('/api/create_tournament', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(req)
		});
		const data: CreateTournamentResp = await response.json();
		console.log("game: enter_matchmaking api response: ", data);
		return (data);
	}

	public static async join_tournament(
		map_name: string,
		password: string,
		user_id: number,
		lobby_id: number,
		display_name: string,
	) : Promise<ServerError>
	{
		const req: JoinReq = {
			map_name: map_name,
			password: password,
			user_id: user_id,
			lobby_id: lobby_id,
			display_name: display_name,
		};
		const response = await fetch('/api/join_tournament', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(req)
		});
		const data: ServerError = await response.json();
		console.log("game: enter_matchmaking api response: ", data);
		return (data);
	}

	public static async start_tournament(
		user_id: number,
		tournament_id: number,
	) : Promise<ServerError>
	{
		const req: StartReq = {
			client_id: user_id,
			tournament_id: tournament_id,
		};
		const response = await fetch('/api/start_tournament', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(req)
		});
		const data: ServerError = await response.json();
		console.log("game: enter_matchmaking api response: ", data);
		return (data);
	}

	public static async leave_tournament(
		user_id: number,
		tournament_id: number,
	) : Promise<void>
	{
		const req: LeaveReq = {
			client_id: user_id,
			tournament_id: tournament_id,
		};
		const response = await fetch('/api/leave_tournament', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(req)
		});
	}
};
