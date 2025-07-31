
export enum LobbyType {
	INVALID = 0,
	MATCHMAKING = 1,
	CUSTOM = 2,
	TOURNAMENT = 3,
};

export type LobbyInvite = {
	map_name: string;
	lobby_password: string;
	lobby_id: number;
	lobby_type: LobbyType;
	valid: boolean; // if the invite should be ignored
};

export interface EnterMatchmakingReq {
	user_id: number;
	display_name: string;
	map_name: string;
	ai_count: number;
};

export interface EnterMatchmakingResp {
	error: ServerError;
	match_id: number;
};

export interface LobbyDisplaynameResp {
	error: ServerError,
	data: {
		name: string;
		id: number;
	}[];
};

export interface CreateLobbyReq {
	map_name: string;
	ai_count: number;
	password: string;
};

export interface JoinReq {
	user_id: number;
	lobby_id: number;
	password: string;
	display_name: string;
};

export interface CreateLobbyResp {
	error: ServerError;
	match_id: number;
};

export interface CreateTournamentReq {
	map_name: string;
	password: string;
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
	lobby_type: LobbyType;
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

//export type GameStartInfo = 
//{
//	type: 'starting_game',
//	display_names: {
//		id: number;
//		name: string;
//	}[]
//};

export type GameLobbyUpdate = {
	type: 'game_lobby_update',
	player_count: number,
	loaded_player_count: number,
	target_player_count: number,
};

export type ServerError =
	'Invalid Request'
	| 'Invalid Password'
	| 'Full'
	| 'Internal Error'
	| 'Not Found'
	| 'Invalid Map'
	| ''
;

export type DefaultResp = {
	error: ServerError,
	type: 'default',
};

export function is_ServerError(data: unknown): ServerError | undefined {
	if (data !== 'string') {
		return (undefined);
	}
	if ([
		'Invalid Request',
		 'Invalid Password',
		 'Full',
		 'Internal Error',
		 'Not Found',
		 'Invalid Map',
		 '',
		].includes(data)
	) {
		return (data as ServerError);
	}
	return (undefined);
}

export type ServerToClientError = {
	type: 'error',
	msg: ServerError,
};

//todo: include display_names
export type GameToClientFinish = {
	type: 'finish',
	duration: number, //unused atm
	mode: number, // unused atm
	placements: {
		id: number,
		final_placement: number,
	}[];
};

//	| GameLobbyUpdate
export type LobbyToClientJson =
	ServerToClientError
	| GameLobbyUpdate
	| GameToClientFinish
;

export type LobbyToClient = LobbyToClientJson | ArrayBuffer;

export type ServerToClientMessage = ServerError | LobbyToClient;

export type ClientToGameInput = {
	client_id: number,
	type: 'send_input';
	payload: {
		key: string,
		type: "up" | "down" | "reset",
	}
};

export type ClientToMatchLeave = {
	client_id: number,
	type: 'leave';
	password: string;
};

export type ClientToGame =
	ClientToMatchLeave
	| ClientToGameInput
;

export type ClientToMatchConnect = {
	client_id: number,
	type: 'connect';
	password: string;
};

export type ClientToMatch =
	ClientToGame
	| ClientToMatchConnect
	| ClientToMatchLeave
;

export type ClientToTournamentStart = {
	type: 'start',
};


export type ClientToTournament = 
	ClientToTournamentStart
;

export type ClientToServerMessage =
	ClientToTournament
	| ClientToMatch
;

