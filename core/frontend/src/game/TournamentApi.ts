import type {
	JoinReq,
	CreateTournamentReq,
	CreateTournamentResp,
	ServerError,
	DefaultResp,
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
		client_id: number,
	) : Promise<CreateTournamentResp>
	{
		const req: CreateTournamentReq = {
			map_name: map_name,
			password: password,
			client_id: client_id,
		};
		const response = await fetch('/api/create_tournament', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(req)
		});
		const data: CreateTournamentResp = await response.json();
		console.log("game: create_tournament api response: ", data);
		return (data);
	}

	public static async join_tournament(
		password: string,
		user_id: number,
		lobby_id: number,
		display_name: string,
	) : Promise<DefaultResp>
	{
		const req: JoinReq = {
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
		const data: DefaultResp = await response.json();
		console.log("game: join_tournament api response: ", data);
		return (data);
	}

	public static async start_tournament(
		user_id: number,
		tournament_id: number,
	) : Promise<DefaultResp>
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
		const data: DefaultResp = await response.json();
		console.log("game: start_tournament api response: ", data);
		return (data);
	}

	public static async leave_tournament(
		user_id: number,
		tournament_id: number,
	) : Promise<void>
	{
		const req: LeaveReq = {
			client_id: user_id,
			lobby_id: tournament_id,
		};
		const response = await fetch('/api/leave_tournament', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(req)
		});

		console.log("game: start_tournament api");
	}
};
