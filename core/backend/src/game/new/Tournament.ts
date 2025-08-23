import type { WebSocket } from '@fastify/websocket';
import { GameLobby } from './lobby/GameLobby.ts';
import { GameServer } from './GameServer.ts';
import type { ClientParticipation } from './GameServer.ts';

import type {
	ClientToTournament,
	TournamentToClient,
	Update,
	NewGame,
	Finish,
	BracketRound,
	BracketMatch,
	BracketPlayer,
	TournamentState,
	TournamentPlayerList,
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
	loose_next: boolean;
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
	public password: string;
	private _id: number;
	private _completion_callback: (id: number) => undefined;

	private _started: boolean = false;
	private _all_players: TournamentPlayer[] = [];
	//private _rounds: Round[] = [{
	//	players: [],
	//	game_ids: [],
	//	active_players: 0,
	//	looking_for_game: 0,
	//}];
	private _rounds: Round[] = [];

	public active_players: number[] = [];

	private _total_player_count: number = 0;
	private _next_placement: number = 0;

	private _round_idx: number = 0;


	constructor(
		map_name: string,
		password: string,
		id: number,
		completion_callback: (id: number) => undefined,
	) {
		this.password = password;
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
		if (password != this.password) {
			return ("Invalid Password");
		}
		//this._rounds[0].players.push({
		this._all_players.push({
			client_id: user_id,
			display_name: display_name,
			placement: -1,
			loose_next: false,
		});
		this.active_players.push(user_id);
		GameServer.add_client_tournament_participation(user_id, this._id);

		const msg: TournamentPlayerList = {
			type: 'player_list',
			data: [],
		};
		for (const player of this._all_players) {
			msg.data.push({display_name: player.display_name, id: player.client_id});
		}
		for (const player of this._all_players) {
			player.ws?.send(JSON.stringify(msg));
		}
		return ("");
	}

	public leave(client_id: number): ServerError {
		if (!this.active_players.find(client => client == client_id)) {
			return ("Not Found");
		}
		const parti: ClientParticipation | undefined =  GameServer.client_participations.get(client_id);
		if (!parti || !parti.tournament_id) {
			console.log(`Waring: client ${client_id} tried to leave tournament ${this._id} but is not part of any tournament`);
			return ("Not Found");
		}
		if (parti.tournament_id != this._id) {
			console.log(`Waring: client ${client_id} tried to leave tournament ${this._id} but is part of tournament ${parti.tournament_id}`);
			return ("Not Found");
		}
		this.active_players = this.active_players.filter(id => id != client_id);
		GameServer.remove_client_tournament_participation(client_id, this._id);
		if (!this._started) {
			//this._rounds[0].players = this._rounds[0].players.filter(
			this._all_players = this._all_players.filter(
				player => player.client_id != client_id);
			//this._total_player_count = this._rounds[0].players.length;
			this._total_player_count = this._all_players.length;
			//this._next_placement = this._rounds[0].players.length;
			this._next_placement = this._all_players.length;
			this._broadcast_player_list();
			if (this._all_players.length == 0) {
				this._finish();
			}
			return ("");
		}
		//case 1; done: player is currently connected to a lobby: should be handled by the lobby
		//case 1.1; done: game is running
		//case 1.2; done: game is not running yet
		//case 2; done: player is currently assiged to a lobby but not connected: tell lobby to treat this like case 1
		//case 3; done; needs testing: the player is currently waiting for the next match
		if (!parti.lobby_id) {
			//Since just taking out the player out of the tournament can mess up the pre set up brackets
			// the player is marked to loose his next game.
			// Then once he would be put into a new game he gets the next placement and the other auto advances.
			const player: TournamentPlayer | undefined = this._all_players.find(p => p.client_id == client_id);
			if (!player) {
				return ("Not Found");
			}
			player.loose_next = true;
			return ("");
		} else {
			//lobby will handle this
			const lobby: GameLobby | undefined = GameServer.lobbies.get(parti.lobby_id);
			if (!lobby) {
				console.log(`Error: client ${client_id} wanted to leave tournament ${this.id} but was in a game(${parti.lobby_id}) that does not exists`);
				return ("Internal Error");
			}
			lobby.leave(client_id);
			return ("");
		}
	}

	public start(client_id: number): ServerError {
		console.log("Starting tournament..");
		const parti: ClientParticipation | undefined = GameServer.client_participations.get(client_id);
		if (!parti || parti.tournament_id != this._id) {
			console.log(`Warning: client ${client_id} tried to start tournament he had no participation of (tournament ${this._id}`);
			return ('Not Found');
		}
		console.log(this.active_players);
		this._total_player_count = this._all_players.length;
		this._next_placement = this._total_player_count;

		let last_bye_count: 0 | 1 = 0;
		//let players_per_round: number = Math.trunc(this._total_player_count / 2);
		let players_per_round: number = this._total_player_count;
		//console.log(`last_bye_count: ${last_bye_count}`);
		players_per_round += last_bye_count;
		//console.log("rounds len: ", this._rounds.length);
		//console.log(`players_per_round: ${players_per_round}`);
		while (players_per_round > 1) {
			const empty_round: Round = {
				players: [],
				game_ids: [],
				active_players: 0,
				looking_for_game: 0,
			}
			this._rounds.push(empty_round);
			//if (players_per_round == 1) {
			//	//console.log("break");
			//	// winner
			//	break ;
			//}
			last_bye_count = players_per_round % 2;
			players_per_round = Math.trunc(players_per_round / 2);
			players_per_round += last_bye_count;
			//console.log(`players_per_round: ${players_per_round}`);
			//console.log(`last_bye_count: ${last_bye_count}`);

		}
		if (this._rounds.length > 0) {
			this._rounds[0].active_players = 0;
			this._rounds[0].looking_for_game = this._total_player_count;
			this._rounds[0].players = this._all_players;
		}
		console.log("rounds len: ", this._rounds.length);
		console.log("total player count tournament: ", this._total_player_count);
		if (this._total_player_count <= 0) {
			this._finish();
		}
		this._started = true;
		console.log(`starting tournament with ${this._rounds.length} rounds and ${this.active_players.length} players`);
		this._start_round();
		return ("");
	}

	private async _start_round(): Promise<void> {

		console.log(`Tournament: starting round ${this._round_idx}`);
		const round: Round = this._rounds[this._round_idx];
		if (this._round_idx == this._rounds.length /* - 1 */) {
			//round.players[0].placement = this._next_placement--;
			if (this._next_placement != 1 /*0*/) {
				console.log("tournament: next placement in the end != 0: ", this._next_placement);
				throw ("tournament: next placement in the end != 0");
			}
			this._finish();
			return ;
		}
		let player_idx = 0;
		while (player_idx < round.players.length - 1) {
			const lobby_id: number = await GameServer.create_lobby(
				LobbyType.TOURNAMENT_GAME,
				this._map_name,
				0,
				this.password,
				this._finish_game_callback
			);
			const game_lobby: GameLobby | undefined = GameServer.lobbies.get(lobby_id);
			if (!game_lobby) {
				throw ("ERROR: Tournament: game lobby not found right after creating it");
			}
			round.game_ids[player_idx / 2] = lobby_id;
			//const invite: LobbyInvite = {
			//	lobbypassword: this.password,
			//	lobby_id: lobby_id,
			//	valid: true,
			//	map_name: this._map_name,
			//	lobby_type: LobbyType.TOURNAMENT,
			//};
			if (round.players[player_idx].loose_next) {
				this._advance_player_to_round(round.players[player_idx + 1], this._round_idx + 1);
			} else if (round.players[player_idx + 1].loose_next) {
				this._advance_player_to_round(round.players[player_idx], this._round_idx + 1);
			} else {
				game_lobby.join(round.players[player_idx].client_id, round.players[player_idx].display_name, this.password);
				game_lobby.join(round.players[player_idx + 1].client_id, round.players[player_idx + 1].display_name, this.password);
				const msg: NewGame = {
					type: 'new_game',
				};
				round.players[player_idx].ws?.send(JSON.stringify(msg));
				round.players[player_idx + 1].ws?.send(JSON.stringify(msg));
			}
			round.looking_for_game -= 2;
			round.active_players += 2;
			player_idx += 2;
		}
		if (player_idx < round.players.length) {
			this._advance_player_to_round(round.players[player_idx], this._round_idx + 1);
			round.looking_for_game--;
		}
		console.log(`rounds: ${this._rounds}`);
		if (round.looking_for_game) {
			console.log(`looking for game in round after starting round, round: ${round}`);
			throw ("looking for game in round after starting round ");
		}
		this._broadcast_update();
		//if (this._round_idx == this._rounds.length - 2 && round.game_ids.length == 0) {
		//	// fix for tournament with only 1 player:
		//	// this was the final round but there is still the 'winner' round
		//	// there was never a game created that could call to start the 'winner' round
		//	this._start_next_round();
		//}
	}

	private _advance_player_to_round(player: TournamentPlayer, round_idx: number) {
		if (round_idx == this._rounds.length) {
			//console.log("advanced player to round after last round, if this is not the winner it's a bug: ",
			//	player, "; skipping advancement");
			return ;
		}
		this._rounds[round_idx].players.push(player);
		this._rounds[round_idx].looking_for_game++;
	}

	private _finish_game_callback(match_id: number, end_data: GameToClientFinish
	): undefined
	{
		console.log("Tournament: Callback from when game finishes");
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
					this._broadcast_update();
					if (this._rounds[round_idx].active_players < 2) {
						this._round_idx++;
						this._start_round();
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
		console.log(`Tournament ${this._id} finished`);
		if (this._all_players.length == 0) {
			console.log("Finished an empty tournament");
			this._completion_callback(this._id);
			return ;
		} else if (this._all_players.length == 1) {
			//todo: tell that single player he won or don't care for tournament of 1 player?
			this._all_players[0].placement = 1;
			const msg: Finish = {
				type: 'finish',
			};
			this._all_players[0].ws?.send(JSON.stringify(msg));
			this._all_players[0].ws?.close();
			GameServer.remove_client_tournament_participation(this._all_players[0].client_id, this._id);
			this._completion_callback(this._id);
			return ;
		}

		if (this._rounds[this._rounds.length - 1].players[0].placement == -1) {
			this._rounds[this._rounds.length - 1].players[0].placement = 1;
		}
		if (this._rounds[this._rounds.length - 1].players.length > 1
			&& this._rounds[this._rounds.length - 1].players[1].placement == -1
		) {
			this._rounds[this._rounds.length - 1].players[1].placement = 1;
		}
		if (this._total_player_count <= 0) {
			return ;
		}
		//todo: cleanup this old code to work with new logic
		const last_round: Round | undefined = this._rounds.pop();
		if (last_round) {
			this._rounds.push(last_round);
		}
		if (!last_round) {
			console.log("Warning: Finished tournament without rounds!");
			//return ;
		}
		if (last_round && last_round.players.length > 2) {
			console.log("Warning: Finished tournament with > 2 players count:", last_round.players);
			//return ;
		}
		if (last_round && last_round.players.length <= 0) {
			console.log("Warning: Finished tournament with <= 0 players count:", last_round.players);
			//return ;
		}
		const msg: Finish = {
			type: 'finish',
		};
		//console.log(`first round: ${this._rounds[0]}`);
		for (const player of this._all_players) {
			player.ws?.send(JSON.stringify(msg));
			//if (player.ws) {
			//	console.log(`sending ${msg}`);
			//}
			player.ws?.close();
		}
		for (const id of this.active_players) {
			GameServer.remove_client_tournament_participation(id, this._id);
		}
		this._completion_callback(this._id);
	}

	private _broadcast_player_list() {
		if (this._started) {
			return ;
		}
		const player_list: TournamentPlayerList = {
			type: 'player_list',
			data: [],
		};
		for (const player of this._all_players) {
			player_list.data.push({display_name: player.display_name, id: player.client_id});
		}
		for (const player of this._all_players) {
			player.ws?.send(JSON.stringify(player_list));
			if (player.ws && player.ws.readyState == WebSocket.OPEN) {
				console.log("sending ", player_list);
			} else if (player.ws) {
				console.log("tried to send ", player_list, ", but ws was not open");
			} else { 
				console.log("tried to send ", player_list, ", but there was no ws");
			}
		}
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
				for (const player of this._all_players) {
					if (player.client_id == msg.client_id) {
						if (player.ws) {
							player.ws.close();
						}
						player.ws = ws;
					}
				}
				this._broadcast_player_list();
				break ;
		}
	}

	private _get_state(): TournamentState {
		const rounds: BracketRound[] = this._rounds.map((round, round_idx) => {
			const matches: Array<{
				game_id: number | null;
				p1: { id: number; name: string; placement: number } | null;
				p2: { id: number; name: string; placement: number } | null;
				status: 'pending' | 'active' | 'finished' | 'bye';
			}> = [];

			const bye_player_ids: number[] = [];

			for (let i = 0; i < round.players.length; i += 2) {
				const p1 = round.players[i] ?? undefined;
				const p2 = round.players[i + 1] ?? undefined;
				const game_id = round.game_ids[Math.floor(i / 2)] ?? null;

				const p1s = p1 ? { id: p1.client_id, name: p1.display_name, placement: p1.placement } : null;
				const p2s = p2 ? { id: p2.client_id, name: p2.display_name, placement: p2.placement } : null;

				let status: 'pending' | 'active' | 'finished' | 'bye';
				if (!p2) {
					status = 'bye';
					if (p1) {
						bye_player_ids.push(p1.client_id);
					}
				} else if ((p1 && p1.placement !== -1) || (p2 && p2.placement !== -1)) {
					status = 'finished';
				} else if (this._started && game_id !== null) {
					status = 'active';
				} else {
					status = 'pending';
				}

				matches.push({ game_id, p1: p1s, p2: p2s, status });
			}

			return { index: round_idx, matches, bye_player_ids };
		});

		const state: TournamentState = {
			tournament_id: this._id,
			map_name: this._map_name,
			started: this._started,
			total_players: this._total_player_count,
			next_placement: this._next_placement,
			active_players: [...this.active_players],
			rounds,
		};

		return state;
	}

	private _broadcast_update(): void {
		const msg: Update = {
			type: 'update',
			state: this._get_state(),
		};
		for (const player of this._all_players) {
			try {
				player.ws?.send(JSON.stringify(msg));
			} catch (e) {
				console.log('broadcast_update fail for player ', player.client_id, e);
			}
		}
	}
};
