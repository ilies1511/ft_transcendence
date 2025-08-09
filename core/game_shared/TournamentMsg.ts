
export type ReconnectMsg = {
	type: 'reconnect';
	client_id: number;
};

export type ClientToTournament =
	ReconnectMsg;


export type Update = {
	type: 'update';
};

export type NewGame = {
	type: 'new_game';
};

export type TournamentToClient =
	Update
	| NewGame;
