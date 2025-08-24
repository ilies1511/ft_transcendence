import type { LobbyInvite,
	DefaultResp,
	ServerError,
	CreateTournamentResp,
} from './game_shared/message_types.ts';
import { is_unloading } from './globals.ts';

import { showToast } from '../ui/toast-interface.ts';
/*
 * tournament_running:
	* lagging indicatior if a game should render it's result.
	* Needed since game checks if globalThis.tournament exists for conditional rendering,
		 but the game websocket might be lagging behind
*/
export let tournament_running: number = 0;

import { LobbyType } from './game_shared/message_types.ts';

import { TournamentApi } from './TournamentApi.ts';
import { createBracket } from 'bracketry';

import type {
	Update,
	NewGame,
	TournamentToClient,
	ClientToTournament,
	ReconnectMsg,
	BracketRound,
	BracketMatch,
	BracketPlayer,
	TournamentState,
	TournamentPlayerList,
} from './game_shared/TournamentMsg.ts';

import { attempt_reconnect } from './frontend_interface_examples/reconnect.ts';


export type Data = {
		rounds: Round[],
		matches?: Match[],
		contestants?: {
				[contestantId: string]: Contestant
		}
}

export type Round = {
		name?: string,
}

export type Match = {
		roundIndex: number, // 0-based
		order: number, // 0-based
		sides?: Side[],
		matchStatus?: string,
		isLive?: boolean
		isBronzeMatch?: string,
}

export type Contestant = {
		entryStatus?: string,
		players: Player[]
}

export type Side = {
		title?: string,
		contestantId?: string,
		scores?: Score[],
		currentScore?: number | string,
		isServing?: boolean,
		isWinner?: boolean
}

type Score = {
		mainScore: number | string,
		subscore?: number | string,
		isWinner?: boolean
}


export type Player = {
		title: string,
		nationality?: string
}

function wait_until(condition: () => boolean, interval = 100): Promise<void> {
	return (new Promise((resolve) => {
		const check = () => {
			if (condition()) {
				resolve();
			} else {
				setTimeout(check, interval);
			}
		};
		check();
	}));
}

export class Tournament {
	public password: string;
	public tournament_id: number;
	public user_id: number;
	private _socket: WebSocket;
	public finished: boolean = false;
	private _match_container: HTMLElement | null;
	public bracket: any | undefined = undefined;

	public latest_tournament_state?: TournamentState;
	public container_selector: string;

	private _player_list: {display_name: string, id: number}[] = [];

	private _next_socket_timeout: number = 500;
	private _next_close_handler: NodeJS.Timeout | undefined = undefined;

	public constructor(user_id: number,
		tournament_id: number,
		password: string,
		match_container: HTMLElement,
	) {
		tournament_running++;
		this.container_selector = '#game-container';
		this._match_container = match_container;
		this.user_id = user_id;
		this.password = password;
		this.tournament_id = tournament_id;
		this._rcv_msg = this._rcv_msg.bind(this);
		this._open_socket = this._open_socket.bind(this);
		this._open_socket();
		globalThis.tournament = this;

	};

	static async create_tournament(
		user_id: number,
		display_name: string,
		map_name: string,
		tournament_password: string,
		match_container: HTMLElement,
	): Promise<Tournament | undefined>
	{
		const create_resp: CreateTournamentResp = await TournamentApi
			.create_tournament(map_name, tournament_password, user_id);
		if (create_resp.error != '') {
			console.log(create_resp);
			return ;
		}
		const invite: LobbyInvite = {
			map_name: map_name,
			lobby_password: tournament_password,
			lobby_id: create_resp.tournament_id,
			lobby_type: LobbyType.TOURNAMENT,
			valid: true,
		};
		return (Tournament.accept_tournament_invite(user_id, display_name, invite, match_container));
	}

	private _open_socket() {
		try {
			if (this.finished) {
				return ;
			}
			const wsBase =
				(location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
			const route: string = `${wsBase}/tournament/${this.tournament_id}`;
			this._socket = new WebSocket(route)
			this._socket.binaryType = "arraybuffer";

			this._socket.addEventListener("open", (event) => {
				console.log("Tournament: Connected to server");
				const msg: ReconnectMsg = {
					client_id: this.user_id,
					type: 'reconnect',
				};
				console.log("sending: ", JSON.stringify(msg));

				this._socket.send(JSON.stringify(msg));
			});

			this._socket.onmessage = (
				event: MessageEvent<TournamentToClient>) => this._rcv_msg(event);

			this._socket.addEventListener("close", () => {
				console.log("Tournament: Disconnected");
				if (!this.finished && !is_unloading) {
					if (this._next_close_handler) {
						clearTimeout(this._next_socket_timeout);
					}
					if (this._next_socket_timeout > 60000) {
						this._cleanup();
					} else {
						this._next_close_handler = setTimeout(() => {
								this._open_socket();
							}, this._next_socket_timeout
						);
						this._next_socket_timeout *= 2;
					}
				} else {
				}
			});
		} catch (e) {
			console.log("Tournament: error: ", e);
		}
	}

	private _rcv_player_list(msg: TournamentPlayerList) {
		this._player_list = msg.data;
		if (this.latest_tournament_state) {
			return ;
		}
		this._render_player_list();
	}

	private async _rcv_msg(event: MessageEvent<TournamentToClient>): Promise<undefined> {
		console.log("got tournament msg: ", event.data);
		const msg: TournamentToClient = JSON.parse(event.data) as TournamentToClient;
		switch (msg.type) {
			case ('finish'):
				//todo: render result or smth and cleanup
				console.log("Tournament: got finish msg");
				this.finished = true;
				globalThis.game?.leave();
				if (!globalThis.game) {
					this.render_tournament_state();
				} else {
					console.log("Error: globalThis.game was defined when wanting to render tournament state after tournament");
				}
				this._cleanup();
				break ;
			case ('update'):
				this.latest_tournament_state = msg.state;
				console.log(this.latest_tournament_state);
				if (!globalThis.game) {
					this.render_tournament_state();
				}
				break ;
			case ('new_game'):
				if (globalThis.game) {
					await wait_until(() => globalThis.game == undefined);
				}
				//todo: let user know next game is ready and don't just instantly attempt connecting
				attempt_reconnect(this._match_container, this.user_id);
				break ;
			case ('player_list'):
				this._rcv_player_list(msg);
				break ;
		}
	}

	static async accept_tournament_invite(
		user_id: number,
		display_name: string,
		invite: LobbyInvite,
		match_container: HTMLElement,
	): Promise<Tournament | undefined> {

		console.log("accepting tournament invite..");
		if (globalThis.tournament) {
			console.log("Allready in a tournament!");
			return ;
		}
		if (!invite.valid) {
			console.log("Could not accept tournament invite: !invite.valid");
			return ;
		}
		if (invite.lobby_type != LobbyType.TOURNAMENT) {
			console.log("Could not accept tournament invite: invite.lobby_type != LobbyType.TOURNAMENT");
			return ;
		}

		const resp: DefaultResp = await TournamentApi.join_tournament(invite.lobby_password, user_id,
			invite.lobby_id, display_name);
		if (resp.error != '') {
			console.log("Could not accept tournament invite: resp.error");
			return ;
		}
		const tournament: Tournament = new Tournament(user_id, invite.lobby_id,
			invite.lobby_password, match_container);
		return (tournament);
	}

	public leave(silent: boolean = false) {
		this.finished = true;
		globalThis.game?.leave();
		const container: HTMLElement | null = this._get_container();
		if (container) {
			container.innerHTML = '';
		}
		//this.render_tournament_state();
		TournamentApi.leave_tournament(this.user_id, this.tournament_id);
		if (!silent) {
			showToast({
				title: 'Left tournament',
			});
		}
		this._cleanup();
	}

	private _cleanup() {
		console.log("Tournament: cleanup");
		this._socket.close();
		if (globalThis.tournament != this) {
			if (globalThis.tournament) {
				console.log("Warning: tournament cleanup but globalThis.tournament was a different tournament");
			} else {
				console.log("Warning: tournament cleanup but globalThis.tournament was undefined");
			}
		} else {
			globalThis.tournament = undefined;
		}
		setTimeout(() => {
			tournament_running--;
		}, 7_000);
	}

	public async start() {
		const start_resp: DefaultResp = await TournamentApi.start_tournament(this.user_id, this.tournament_id);
		if (start_resp.error != '') {
			console.log("start tournament error: ", start_resp.error);
			return ;
		}
		console.log("started tournament");
	}

	private _get_container(): HTMLElement | null {
		if (this._match_container && document.contains(this._match_container)) {
			console.log("game container unchanged");
			return (this._match_container);
		}
		this._match_container = document.querySelector(this.container_selector);
		if (!this._match_container) {
			console.log("Warning: could not get game container");
			return (null);
		}

		if (this.latest_tournament_state) {
			try {
				this.bracket?.uninstall();
				this.bracket = undefined;
			} catch {}
			//this.bracket = createBracket(this.latest_tournament_state, this._match_container);
		}
		return (this._match_container);
	}


	public render_tournament_state() {
		if (!this.latest_tournament_state) {
			console.log("Warning: No latest_tournament_state when tring to render it, either only 1 player tournament or bug");
			return ;
		}
		this._get_container();
		if (!this._match_container) {
			return ;
		}
		console.log("rendering tournament state: ", this.latest_tournament_state);
		const data: Data = {
			rounds: [],
			matches: [],
			contestants: {}
		};

		for (const my_match_type of this.latest_tournament_state.rounds[0].matches) {
			if (my_match_type.p1) {
				data.contestants[`${my_match_type.p1.id}`] = {
					players: [{title: my_match_type.p1.name}]
				}
			}
			if (my_match_type.p2) {
				data.contestants[`${my_match_type.p2.id}`] = {
					players: [{title: my_match_type.p2.name}]
				}
			}
		}
		for (const round of this.latest_tournament_state.rounds) {
			data.rounds.push({name: `Round ${round.index}`});
			let order: number = 0;
			for (const my_match of round.matches) {
				const match: Match = {
					roundIndex: round.index,
					order: order, // 0-based
					sides: [],
						//matchStatus?: string,
						//isLive?: boolean
						//isBronzeMatch?: string,
				};
				const get_side = (player: BracketPlayer | null): Side | undefined => {
					if (!player) {
						return ;
					}
					const side: Side = {
						title: player.name,
						contestantId: `${player.id}`,
					};
					if (player.placement == 1) {
						side.isWinner = true;
					}
					if (player.placement == -1) {
						side.isServing = true;
					}
					return (side);
				}
				let side: Side | undefined = get_side(my_match.p1);
				if (side) {
					match.sides.push(side);
				}
				side = get_side(my_match.p2);
				if (side) {
					match.sides.push(side);
				}
				if (my_match.p1?.placement == -1 || my_match.p2?.placement == -1) {
					match.isLive = true;
				} else {
					match.isLive = false;
				}
				data.matches.push(match);
				order++;
			}
		}
		console.log('data: ', data);
		if (!this.bracket) {
			this.bracket = createBracket(data, this._match_container);
		} else {
			this.bracket.uninstall();
			this.bracket = createBracket(data, this._match_container);
			//this.bracket.replaceData(data);
		}
	}

	private _render_player_list() {
		const container = this._get_container();
		if (!container) {
			return ;
		}
		const esc = (s?: string): string => {
			const d = document.createElement('div');
			d.textContent = s ?? '';
			return (d.innerHTML);
		}
		const items =
			this._player_list.map(
				(p) =>
					`<li data-id="${p.id}">${esc(p.display_name)}${
						p.id === this.user_id ? ' (you)' : ''
						}</li>`
			).join('');

		container.innerHTML = `
			<div id="tournament-player-list">
				<h3>Tournament Players</h3>
				<ul>${items}</ul>
			</div>
		`;
	}
};

