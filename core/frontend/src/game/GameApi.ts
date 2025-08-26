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

import { token } from '../services/session.ts';

import { Game } from './game_new.ts';

import { showToast } from '../ui/toast-interface.ts';

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

		const headers = new Headers({ 'Content-Type': 'application/json' });
		if (token) headers.set('X-CSRF-Token', token);
		const response = await fetch('/api/enter_matchmaking', {
			method: 'POST',
			credentials: 'include',
			headers,
			body: JSON.stringify(req),
		});
		const data: EnterMatchmakingResp = await response.json();
		console.log("game: enter_matchmaking api response: ", data);
		if (data.error != '') {
			Game.process_server_error(data.error);
		}
		return (data);
	}

	public static async get_display_names(match_id: number): Promise<LobbyDisplaynameResp>
	{
		const response = await fetch(`/game/${match_id}/display_names`, {
			method: 'GET',
			credentials: 'include',
		});
		const data: LobbyDisplaynameResp = await response.json();
		console.log("Game: create_lobby api response: ", data);
		return (data);
	}

	public static async create_lobby(map_name: string, ai_count: number,
		password: string, client_id: number
	) : Promise<CreateLobbyResp>
	{
		const req: CreateLobbyReq = {
			map_name: map_name,
			ai_count: ai_count,
			password: password,
			client_id: client_id,
		};

		const headers = new Headers({ 'Content-Type': 'application/json' });
		if (token) headers.set('X-CSRF-Token', token);
		const response = await fetch('/api/create_lobby', {
			method: 'POST',
			credentials: 'include',
			headers,
			body: JSON.stringify(req),
		});
		const data: CreateLobbyResp = await response.json();
		console.log("Game: create_lobby api response: ", data);
		if (data.error != '') {
			Game.process_server_error(data.error);
		}
		return (data);
	}

	public static async join_lobby(
		user_id: number,
		lobby_id: number,
		password: string,
		display_name: string,
	)
		: Promise<ServerError>
	{
		const req: JoinReq = {
			lobby_id: lobby_id,
			user_id: user_id,
			password: password,
			display_name: display_name,
		};

		const headers = new Headers({ 'Content-Type': 'application/json' });
		if (token) headers.set('X-CSRF-Token', token);
		const response = await fetch('/api/join_lobby', {
			method: 'POST',
			credentials: 'include',
			headers,
			body: JSON.stringify(req)
		});
		const data: ServerError = await response.text() as ServerError;
		if (data == "") {
			console.log("Game: join_lobby api success");
		} else {
			Game.process_server_error(data);
			console.log("Game: join_lobby api error: ", data);
		}
		return (data);
	}

	public static async create_tournament(map_name: string, password: string)
		: Promise<CreateTournamentResp>
	{
		const req: CreateTournamentReq = {
			map_name: map_name,
			password: password,
		};
		const headers = new Headers({ 'Content-Type': 'application/json' });
		if (token) headers.set('X-CSRF-Token', token);
		const response = await fetch('/api/create_tournament', {
			method: 'POST',
			credentials: 'include',
			headers,
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
		const headers = new Headers({ 'Content-Type': 'application/json' });
		if (token) headers.set('X-CSRF-Token', token);
		const response = await fetch('/api/reconnect', {
			method: 'POST',
			credentials: 'include',
			headers,
			body: JSON.stringify(req)
		});
		const data: ReconnectResp = await response.json();
		console.log("Game: reconnect api response: ", data);
		return (data);
	}
};
