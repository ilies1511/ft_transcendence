import type { LobbyInvite,
	DefaultResp,
	ServerError,
	CreateTournamentResp,
} from './game_shared/message_types.ts';

import { LobbyType } from './game_shared/message_types.ts';

import { TournamentApi } from './TournamentApi.ts';

export class Tournament {
	public password: string;
	public tournament_id: number;
	public user_id: number;


	private constructor(user_id: number, tournament_id: number, password: string) {
		this.password = password;
		this.tournament_id = tournament_id;
		globalThis.tournament = this;
	};

	static async create_tournament(
		user_id: number,
		display_name: string,
		map_name: string,
		tournament_password: string,
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

		const tournament: Tournament | undefined =
			await Tournament.accept_tournament_invite(user_id, display_name, invite);
		if (!tournament) {
			return ;
		}
	}

	//todo: user feedback if invite fails
	static async accept_tournament_invite(
		user_id: number,
		display_name: string,
		invite: LobbyInvite,
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
			invite.lobby_password);
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
	}

	public async invite(target_user_id: number) {
	}
};
