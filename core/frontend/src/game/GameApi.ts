import type {
	EnterMatchmakingReq,
	EnterMatchmakingResp,
	CreateLobbyReq,
	CreateLobbyResp,
	JoinLobbyReq,
	CreateTournamentReq,
	CreateTournamentResp,
	ReconnectReq,
	ReconnectResp,
	ServerError,
} from './game_shared/message_types.ts';


export class GameApi {
	private constructor() {}

	public static async enter_matchmaking(
		user_id: number,
		map_name: string,
		ai_count: number,
		display_name: string,
	) : Promise<EnterMatchmakingResp>
	{
		const req: EnterMatchmakingReq = {
			user_id: user_id,
			map_name: map_name,
			ai_count: ai_count,
			display_name: display_name,
		};
		const response = await fetch('/api/enter_matchmaking', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(req)
		});
		const data: EnterMatchmakingResp = await response.json();
		console.log("game: enter_matchmaking api response: ", data);
		return (data);
	}

	public static async create_lobby(map_name: string, ai_count: number,
		password: string, display_name: string,
	) : Promise<CreateLobbyResp>
	{
		const req: CreateLobbyReq = {
			map_name: map_name,
			ai_count: ai_count,
			password: password
		};
		const response = await fetch('/api/create_lobby', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(req)
		});
		const data: CreateLobbyResp = await response.json();
		console.log("Game: create_lobby api response: ", data);
		return (data);
	}

	public static async join_lobby(
		user_id: number,
		lobby_id: number,
		map_name: string,
		password: string,
		display_name: string,
	)
		: Promise<ServerError>
	{
		const req: JoinLobbyReq = {
			lobby_id: lobby_id,
			user_id: user_id,
			map_name: map_name,
			password: password,
			display_name: display_name,
		};
		const response = await fetch('/api/join_lobby', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(req)
		});
		const data: ServerError = await response.text() as ServerError;
		if (data == "") {
			console.log("Game: join_lobby api success");
		} else {
			console.log("Game: join_lobby api error: ", data);
		}
		return (data);
	}

	public static async create_tournament()
		: Promise<CreateTournamentResp>
	{
		const req: CreateTournamentReq = {
		};
		const response = await fetch('/api/create_tournament', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(req)
		});
		const data: CreateTournamentResp = await response.json();
		console.log("Game: create_tournament api response: ", data);
		return (data);
	}

	public static async reconnect(client_id: number)
		: Promise<ReconnectResp>
	{
		const req: ReconnectReq = {
			client_id: client_id,
		};
		const response = await fetch('/api/reconnect', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(req)
		});
		const data: ReconnectResp = await response.json();
		console.log("Game: reconnect api response: ", data);
		return (data);
	}
};
