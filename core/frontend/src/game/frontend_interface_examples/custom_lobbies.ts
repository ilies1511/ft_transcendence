import { Game } from '../game_new.ts';
import { GameApi } from '../GameApi.ts';
import { LobbyType } from '../game_shared/message_types.ts';
import { get_password_from_user } from '../placeholder_globals.ts';

import type {
	ServerError,
	CreateLobbyResp,
	LobbyInvite,
} from '../game_shared/message_types.ts';

export type CustomLobbyOptions = {
	map_name: string;
	lobby_password: string;
	ai_count: number;
};

export async function accept_lobby_invite(
	user_id: number,
	container: HTMLElement,
	invite: LobbyInvite,
	display_name: string,
	) : Promise<ServerError | Game>
{
	console.log("INVITE: ", invite);
	const join_error: ServerError = await GameApi.join_lobby(
		user_id,
		invite.lobby_id,
		invite.lobby_password,
		display_name,
	);
	if (join_error != '') {
		return (join_error);
	}
	const game: Game  = new Game(
		user_id,
		container,
		invite.lobby_id,
		invite.map_name,
		invite.lobby_password,
		invite.lobby_type,
	);
	return (game);
}

export async function create_join_lobby(
	user_id: number,
	container: HTMLElement,
	options: CustomLobbyOptions,
	): Promise<Game | ServerError>
{
	const resp: CreateLobbyResp = await GameApi.create_lobby(options.map_name,
		options.ai_count, options.lobby_password,);
	if (resp.error != "") {
		console.log(resp.error);
		return (resp.error);
	}
	console.log("created lobby with id ", resp.match_id);
	const lobby_invite: LobbyInvite = {
		map_name: options.map_name,
		lobby_password: options.lobby_password,
		lobby_id: resp.match_id,
		lobby_type: LobbyType.CUSTOM,
		valid: true,
	};
	// By default the user is not in the lobby itself.
	// Sinece we have everything to build a LobbyInvite object in the frontend
	//  the invite does not need to go through the server when joining your
	//  own lobby.
	let game: Game | ServerError = await accept_lobby_invite(user_id, container,
		lobby_invite, `placeholder_diplay_name_of_client2_${user_id}`);
	if (!(game instanceof Game)) {
		console.log("Game: got ServerError '", game, "'");
		return (game as ServerError);
	}
	return (game as Game);
}

