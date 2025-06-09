export enum BinType {
	GAME_STATE = 1,
};


export type GameOptions = {
	player_count: number;
	timer: number;
	no_tie: boolean;//for tournament, game goes unitl time is over and one player leads
};

export type ServerToClientJson =
	| {
		type: 'game_lobby_update',
		player_count: number,
		target_player_count: number,
	}
	| {
		type: 'starting_game',
		game_id: number,
		options: GameOptions
	};

/*
 * ArrayBuffer content:
	0: uint8:: type => enum BinType
*/
export type ServerToClientMessage = ServerToClientJson | ArrayBuffer;


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
	| {
		type: 'send_input';
		player_id: number;
		game_id: number;
		payload: {
		}
	};



