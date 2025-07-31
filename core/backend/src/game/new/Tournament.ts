import type { WebSocket } from '@fastify/websocket';
import { GameLobby } from './lobby/GameLobby.ts';

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

	private _rounds: Round[] = [{players: [], game_ids: []}];

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
		this._total_player_count++;
		this._next_placement++;
		return ("");
	}

	public leave(client_id: number): ServerError {
		if (!this._started) {
			let found: boolean = false;
			this._rounds[0].players = this._rounds[0].players.filter(
				player => player.client_id == client_id);
			this._total_player_count = this._rounds[0].players.length;
			this._next_placement = this._rounds[0].players.length;
			return ("");
		}
		//todo: player should loose leave running game or if no game is running should
		// be set to loose as the next placement
		return ("");
	}

	public start(client_id: number): ServerError {
		this._total_player_count = this._rounds[0].players.length;
		this._started = true;
		//todo
		return ("");
	}

	public get_state(client_id: number) {
	}

	public get_game(client_id: number)
	{
	}

	private _finish_game_callback(match_id: number, end_data: GameToClientFinish) {
		if (!end_data) {
			throw ("game error: tournament game eneded without passing end_data");
		}
		if (end_data.placements.length != 2) {
			throw ("game error: tournament game eneded != 2 player count: ", end_data.placements.length);
		}
	}

	private _match_id_to_round_idx(game_id: number): GameIdx {
		let round_idx = 0;
		while (round_idx < this._rounds.length) {
			let game_idx = 0;
			while (game_idx < this._rounds[round_idx].game_ids.length) {
				//todo: check GameServer.lobbies once it's static
				if (this._rounds[round_idx].game_ids[game_idx]) {
					return ({round_idx, game_idx});
				}
				game_idx++;
			}
			round_idx++;
		}

		return ({round_idx: -1, game_idx: -1});
	}

	private _finish() {
		this._completion_callback(this._id);
	}
};
