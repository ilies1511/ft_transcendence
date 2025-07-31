import type { WebSocket } from '@fastify/websocket';
import { GameLobby } from './lobby/GameLobby.ts';
import { GameServer } from './GameServer.ts';

import type {
	TournamentState,
} from '../game_shared/TournamentApiTypes.ts';
import type {
	ServerToClientError,
	ServerToClientMessage,
	ServerError,
    ClientToTournament,
	GameToClientFinish,
} from '../game_shared/message_types.ts';


type TournamentPlayer = {
	client_id: number;
	display_name: string;
	placement: number;
};

type Round = {
	players: TournamentPlayer[];
	game_ids: number[];
	active_players: number;
	looking_for_game: number;
};

type GameIdx = {
	round_idx: number;
	game_idx: number;
};

export class Tournament {
	private _map_name: string;
	private _password: string;
	private _id: number;
	private _completion_callback: (id: number) => undefined;

	private _started: boolean = false;

	private _rounds: Round[] = [{
		players: [],
		game_ids: [],
		active_players: 0,
		looking_for_game: 0,
	}];

	public active_players: number[] = [];

	private _total_player_count: number = 0;
	private _next_placement: number = 0;


	constructor(
		map_name: string,
		password: string,
		id: number,
		completion_callback: (id: number) => undefined,
	) {
		this._password = password;
		this._map_name = map_name;
		this._id = id;
		this._completion_callback = completion_callback;
	}

	public join(
		user_id: number,
		display_name: string,
		password: string
	): ServerError
	{
		if (this._started) {
			return ("Full");
		}
		if (password != this._password) {
			return ("Invalid Password");
		}
		this._rounds[0].players.push({
			client_id: user_id,
			display_name: display_name,
			placement: -1,
		});
		this.active_players.push(user_id);
		this._total_player_count++;
		this._next_placement++;
		return ("");
	}

	public leave(client_id: number): ServerError {
		if (!this.active_players.find(client => client == client_id)) {
			return ("Not Found");
		}
		this.active_players = this.active_players.filter(id => id != client_id);
		if (!this._started) {
			this._rounds[0].players = this._rounds[0].players.filter(
				player => player.client_id == client_id);
			this._total_player_count = this._rounds[0].players.length;
			this._next_placement = this._rounds[0].players.length;
			return ("");
		}
		//todo: player looses and leaves running game or if no game is running has to
		// be set to loose as the next placement
		return ("");
	}

	public start(client_id: number): ServerError {
		this._total_player_count = this._rounds[0].players.length;
		this._rounds[0].active_players = this._total_player_count;
		this._rounds[0].looking_for_game = this._total_player_count;
		if (this._total_player_count == 0) {
			//todo
		}
		this._started = true;
		this._start_round(0);
		return ("");
	}

	private _start_round(round_idx: number) {
		if (this._rounds[round_idx].players.length == 1) {
			this._rounds[round_idx].players[0].placement = this._next_placement--;
			if (this._next_placement != 0) {
				throw ("Tournament: next placement in the end != 0: ", this._next_placement);
			}
			this._finish();
		}
	}

	public get_state(client_id: number): TournamentState {
		const ret: TournamentState = {
		};
		return (ret);
	}

	private _finish_game_callback(match_id: number, end_data: GameToClientFinish) {
		if (!end_data) {
			throw ("game error: tournament game eneded without passing end_data");
		}
		if (end_data.placements.length != 2) {
			throw ("game error: tournament game eneded != 2 player count: ", end_data.placements.length);
		}
		let round_idx = 0;
		while (round_idx < this._rounds.length) {
			let game_idx = 0;
			while (game_idx < this._rounds[round_idx].game_ids.length) {
				if (this._rounds[round_idx].game_ids[game_idx] == match_id) {
					const player_idx: number = game_idx * 2;
					const player_1: TournamentPlayer = this._rounds[round_idx].players[player_idx];
					const player_2: TournamentPlayer = this._rounds[round_idx].players[player_idx + 1];
					
				}
				game_idx++;
			}
			round_idx++;
		}
		throw ("Tournament: _finish_game_callback was called but game was not found");
	}

	private _finish() {
		this._completion_callback(this._id);
	}
};
