//todo: enable map selection
export type GameOptions = {
	player_count: number;
	timer: number;
	no_tie: boolean;//for tournament, game goes unitl time is over and one player leads
};

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
		type: "up" | "down",
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

