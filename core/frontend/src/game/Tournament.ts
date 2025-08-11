import type { LobbyInvite,
	DefaultResp,
	ServerError,
	CreateTournamentResp,
} from './game_shared/message_types.ts';
import { is_unloading } from './globals.ts';

import { LobbyType } from './game_shared/message_types.ts';

import { TournamentApi } from './TournamentApi.ts';

import type {
	Update,
	NewGame,
	TournamentToClient,
	ClientToTournament,
	ReconnectMsg,
} from './game_shared/TournamentMsg.ts';

import { attempt_reconnect } from './frontend_interface_examples/reconnect.ts';


export class Tournament {
	public password: string;
	public tournament_id: number;
	public user_id: number;
	private _socket: WebSocket;
	public finished: boolean = false;
	private _match_container: HTMLElement;

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
				//todo: render result or smth
				this.finished = true;
				break ;
			case ('update'):
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
		TournamentApi.leave_tournament(this.user_id, this.tournament_id);
		this._cleanup();
	}

	private _cleanup() {
		globalThis.tournament = undefined;
	}

	public async start() {
		const start_resp: DefaultResp = await TournamentApi.start_tournament(this.user_id, this.tournament_id);
		if (start_resp.error != '') {
			console.log("start tournament error: ", start_resp.error);
			return ;
		}
		console.log("started tournament");
	}

	public async invite(target_user_id: number) {
	}
};
