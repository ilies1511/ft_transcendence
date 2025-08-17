import type { LobbyInvite,
	DefaultResp,
	ServerError,
	CreateTournamentResp,
} from './game_shared/message_types.ts';
import { is_unloading } from './globals.ts';

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


export class Tournament {
	public password: string;
	public tournament_id: number;
	public user_id: number;
	private _socket: WebSocket;
	public finished: boolean = false;
	private _match_container: HTMLElement;
	public bracket: any | undefined = undefined;

	public latest_tournament_state?: TournamentState;

	public constructor(user_id: number,
		tournament_id: number,
		password: string,
		match_container: HTMLElement,
	) {
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
			.create_tournament(map_name, tournament_password);
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
			const route: string = `ws://localhost:5173/tournament/${this.tournament_id}`;
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
					console.log("Tournament: Attempting reconnect..");
					this._open_socket();
				} else {
				}
			});
		} catch (e) {
			console.log("Tournament: error: ", e);
		}
	}

	private _rcv_msg(event: MessageEvent<TournamentToClient>): undefined {
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
				}
				//this.leave(); //not needed anymore
				break ;
			case ('update'):
				this.latest_tournament_state = msg.state;
				console.log(this.latest_tournament_state);
				if (!globalThis.game) {
					this.render_tournament_state();
				}
				break ;
			case ('new_game'):
				//todo: let user know next game is ready and don't just instantly attempt connecting
				attempt_reconnect(this._match_container, this.user_id);
				break ;
		}
	}

	//todo: user feedback if invite fails
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
		}
		const tournament: Tournament = new Tournament(user_id, invite.lobby_id,
			invite.lobby_password, match_container);
		return (tournament);
	}

	public leave() {
		this.finished = true;
		globalThis.game?.leave();
		TournamentApi.leave_tournament(this.user_id, this.tournament_id);
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
	}

	public async start() {
		const start_resp: DefaultResp = await TournamentApi.start_tournament(this.user_id, this.tournament_id);
		if (start_resp.error != '') {
			console.log("start tournament error: ", start_resp.error);
			return ;
		}
		console.log("started tournament");
	}

	public render_tournament_state() {
		if (!this.latest_tournament_state) {
			return ;
		}
		console.log("rendering tournament state: ", this.latest_tournament_state);
		const data: Data = {
			rounds: [],
			matches: [],
			contestants: {}
		};

		for (const my_match of this.latest_tournament_state.rounds[0].matches) {
			if (my_match.p1) {
				data.contestants[`${my_match.p1.id}`] = {
					players: [{title: my_match.p1.name}]
				}
			}
			if (my_match.p2) {
				data.contestants[`${my_match.p2.id}`] = {
					players: [{title: my_match.p2.name}]
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
			this.bracket.replaceData(data);
		}
	}
};
