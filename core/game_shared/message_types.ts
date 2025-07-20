//todo: enable map selection

export interface EnterMatchmakingReq {
	user_id: number;
	map_name: string;
	ai_count: number;
};

export interface EnterMatchmakingResp {
	error: ServerError;
	match_id: number;
};

export interface CreateLobbyReq {
	map_name: string;
	ai_count: number;
	password: string;
};

export interface CreateLobbyResp {
	error: ServerError;
	match_id: number;
};

//todo
export interface CreateTournamentReq {
};

export interface CreateTournamentResp {
	error: ServerError;
	tournament_id: number;
};

export interface ReconnectReq {
	client_id: number;
};

export interface ReconnectResp {
	match_id: number;
	match_has_password: boolean;
	tournament_id: number;
};

export type GameOptions = {
	player_count: number;
	timer: number;
	no_tie: boolean;//for tournament, game goes unitl time is over and one player leads
};

export function eq_options(a: GameOptions, b: GameOptions): boolean {
	if (a.player_count != b.player_count
		|| a.timer != b.timer
		|| a.no_tie != b.no_tie
	) {
		return (false);
	}
	return (true);
}

export type GameStartInfo = 
{
		type: 'starting_game',
		game_id: number,
		ingame_id: number,
		options: GameOptions
};

export type GameLobbyUpdate = {
	type: 'game_lobby_update',
	player_count: number,
	target_player_count: number,
};

export type ServerError =
	'Invalid Request'
	| 'Invalid Password'
	| 'Internal Error'
	| 'Not Found'
	| ''
;

export type ServerToClientError = {
	type: 'error',
	msg: ServerError
	,
};

//	| GameLobbyUpdate
//	| GameStartInfo
export type ServerToClientJson =
	ServerToClientError
;

export type ServerToClientMessage = ServerToClientJson | ArrayBuffer;

export type ClientToGameInput = {
	type: 'send_input';
	payload: {
		key: string,
		type: "up" | "down" | "reset",
	}
};

export type ClientToMatch = {
	client_id: number,
	data:
		ClientToGameInput,
};

export type ClientToTournament = {
	client_id: number,
};

//todo: leave game option
export type ClientToServerMessage =
	ClientToTournament
	| ClientToMatch
;

