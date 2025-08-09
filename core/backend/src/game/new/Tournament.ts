import type { WebSocket } from '@fastify/websocket';
import { GameLobby } from './lobby/GameLobby.ts';
import { GameServer } from './GameServer.ts';

import type {
	TournamentState,
} from '../game_shared/TournamentApiTypes.ts';

import type {
	ClientToTournament,
	TournamentToClient,
	Update,
	NewGame,
} from '../game_shared/TournamentMsg.ts';

import type {
	ServerToClientError,
	ServerToClientMessage,
	ServerError,
	GameToClientFinish,
	LobbyInvite,
} from '../game_shared/message_types.ts';

import { LobbyType } from '../game_shared/message_types.ts';

type TournamentPlayer = {
	client_id: number;
	display_name: string;
	placement: number;
	ws?: WebSocket;
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
		this._finish_game_callback = this._finish_game_callback.bind(this);
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
		return ("");
	}

	public leave(client_id: number): ServerError {
		if (!this.active_players.find(client => client == client_id)) {
			return ("Not Found");
		}
		this.active_players = this.active_players.filter(id => id != client_id);
		if (!this._started) {
			this._rounds[0].players = this._rounds[0].players.filter(
				player => player.client_id != client_id);
			this._total_player_count = this._rounds[0].players.length;
			this._next_placement = this._rounds[0].players.length;
			return ("");
		}
		//todo: player looses and leaves running game or if no game is running has to
		// be set to loose as the next placement
		return ("");
	}

	public start(client_id: number): ServerError {
		console.log("Starting tournament..");
		console.log(this.active_players);
		this._total_player_count = this._rounds[0].players.length;
		this._rounds[0].active_players = 0;
		this._rounds[0].looking_for_game = this._total_player_count;
		this._next_placement = this._total_player_count;
		if (this._total_player_count <= 0) {
			this._finish();
		}
		this._started = true;
		this._start_round(0);

		return ("");
	}

	private async _start_round(round_idx: number): Promise<void> {
		const round: Round = this._rounds[round_idx];
		if (round.players.length == 1) {
			round.players[0].placement = this._next_placement--;
			if (this._next_placement != 0) {
				console.log("tournament: next placement in the end != 0: ", this._next_placement);
				throw ("tournament: next placement in the end != 0");
			}
			this._finish();
			return ;
		}
		const next_round: Round = {
			players: [],
			game_ids: [],
			active_players: 0,
			looking_for_game: 0,
		};
		this._rounds.push(next_round);
		let player_idx = 0;
		while (player_idx < round.players.length - 1) {
			const lobby_id: number = await GameServer.create_lobby(
				LobbyType.TOURNAMENT,
				this._map_name,
				0,
				this._password,
				this._finish_game_callback
			);
			const game_lobby: GameLobby | undefined = GameServer.lobbies.get(lobby_id);
			if (!game_lobby) {
				//todo:
				console.log("ERROR: game lobby not found");
				return ;
			}
			round.game_ids[player_idx / 2] = lobby_id;
			const invite: LobbyInvite = {
				lobby_password: this._password,
				lobby_id: lobby_id,
				valid: true,
				map_name: this._map_name,
				lobby_type: LobbyType.TOURNAMENT,
			};
			game_lobby.join(round.players[player_idx].client_id, round.players[player_idx].display_name, this._password);
			game_lobby.join(round.players[player_idx + 1].client_id, round.players[player_idx + 1].display_name, this._password);
			const msg: NewGame = {
				type: 'new_game',
			};
			round.players[player_idx].ws?.send(JSON.stringify(msg));
			round.players[player_idx + 1].ws?.send(JSON.stringify(msg));
			round.looking_for_game -= 2;
			round.active_players += 2;
			player_idx += 2;
		}
		if (player_idx < round.players.length) {
			this._advance_player_to_round(round.players[player_idx], round_idx + 1);
			round.looking_for_game--;
		}
		if (round.looking_for_game) {
			console.log("looking for game in round after starting round, round: ", round);
			throw ("looking for game in round after starting round ");
		}
	}

	public get_state(client_id: number): TournamentState {
		const ret: TournamentState = {
		};
		return (ret);
	}

	private _advance_player_to_round(player: TournamentPlayer, round_idx: number) {
		this._rounds[round_idx].players.push(player);
		this._rounds[round_idx].looking_for_game++;
	}

	private _finish_game_callback(match_id: number, end_data: GameToClientFinish
	): undefined
	{
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
					if (player_1.client_id == end_data.placements[0].id && end_data.placements[0].final_placement == 1) {
						this._advance_player_to_round(player_1, round_idx + 1);
						player_2.placement = this._next_placement--;
					} else {
						this._advance_player_to_round(player_2, round_idx + 1);
						player_1.placement = this._next_placement--;
					}
					this._rounds[round_idx].active_players -= 2;
					if (this._rounds[round_idx].active_players < 2) {
						this._start_round(round_idx + 1);
					}
					return ;
				}
				game_idx++;
			}
			round_idx++;
		}
		throw ("Tournament: _finish_game_callback was called but game was not found");
	}

	private _finish() {
		this._completion_callback(this._id);
		if (this._total_player_count <= 0) {
			return ;
		}
		const last_round: Round | undefined = this._rounds.pop();
		if (!last_round) {
			console.log("Warning: Finished tournament without rounds!");
			return ;
		}
		if (last_round.players.length != 1) {
			console.log("Warning: Finished tournament with != 1 plate count:", last_round.players);
			return ;
		}
		console.log("winner: ", last_round.players[0]);
	}

	public rcv_msg(data: string, ws: WebSocket) {
		let msg: ClientToTournament;
		try {
			msg = JSON.parse(data) as ClientToTournament;
		} catch (e) {
			ws.close();
			console.log("Tournament got invalid msg through socket: ", data);
			return ;
		}
		console.log("tournament received msg: ", msg);
		switch (msg.type) {
			case ('reconnect'):
				for (const player of this._rounds[0].players) {
					if (player.client_id == msg.client_id) {
						if (player.ws) {
							player.ws.close();
						}
						player.ws = ws;
					}
				}
				break ;
		}
	}
};
