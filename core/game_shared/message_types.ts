//todo: enable map selection

export interface EnterMatchmakingReq {
	user_id: number;
	map_name: string;
	ai_count: number;
};

export interface EnterMatchmakingResp {
	error: string;
	match_id: number;
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

export type ServerToClientJson =
	| {
		type: 'game_lobby_update',
		player_count: number,
		target_player_count: number,
	}
	| GameStartInfo;

export type ServerToClientMessage = ServerToClientJson | ArrayBuffer;

export type ClientToServerInput = {
	type: 'send_input';
	player_id: number;
	game_id: number;
	payload: {
		key: string,
		type: "up" | "down" | "reset",
	}
};

//todo: leave game option
export type ClientToServerMessage =
	| {
		type: 'search_game';
		player_id: number;
		payload: {
			options: GameOptions;
		}
	}
	| {
		type: 'reconnect';
		player_id: number;
		payload: {
		}
	}
	| ClientToServerInput;

