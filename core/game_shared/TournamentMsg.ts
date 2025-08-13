// ----- Bracket types your frontend can render directly -----

export type BracketPlayer = {
  id: number;
  name: string;
  placement: number; // -1 while still in the tournament
};

export type BracketMatch = {
  game_id: number | null;
  p1: BracketPlayer | null;
  p2: BracketPlayer | null;
  status: 'pending' | 'active' | 'finished' | 'bye';
};

export type BracketRound = {
  index: number;
  matches: BracketMatch[];
  bye_player_ids: number[];
};

export type TournamentState = {
  tournament_id: number;
  map_name: string;
  started: boolean;
  total_players: number;
  next_placement: number;
  active_players: number[];
  rounds: BracketRound[];
};

export type ReconnectMsg = {
	type: 'reconnect';
	client_id: number;
};

export type ClientToTournament =
	ReconnectMsg;


export type Update = {
	type: 'update';
	state: TournamentState;
};

export type NewGame = {
	type: 'new_game';
};

export type Finish = {
	type: 'finish';
};

export type TournamentToClient =
	Update
	| Finish
	| NewGame
;
