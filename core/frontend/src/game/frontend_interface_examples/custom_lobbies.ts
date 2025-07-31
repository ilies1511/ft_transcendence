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
	const join_error: ServerError = await GameApi.join_lobby(
		user_id,
		invite.lobby_id,
		invite.map_name,
		invite.lobby_password,
		`placeholder_diplay_name_of_client1_${user_id}`,
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
		LobbyType.CUSTOM,
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

export function invite_user_to_lobby_skeleton(
	game: Game,
	target_user_id: number, /* or whatever the server needs to identify the correct live chat websocket */
) {
	const invite: LobbyInvite = game.lobby_invite_data();
	/*
	 * I don't know how the live chat works, so pseudo example code here:
	 * const msg: LiveChatMsg = {
	 *	type: 'LobbyInvite',
	 *	target_user: target_user_id,
	 *	data: invite,
	 * };
	 * livechat_ws.send(msg);
	*/
}

export async function recv_lobby_invite_skeleton(): Promise<LobbyInvite>
{
	/*
	 * I don't know how the live chat works, so pseudo example code here:
	 * msg = livechat_ws.recv();
	 * if (msg.type != 'LobbyInvite') {
	 *		return ;
	 * }
	 * lobby_invite = msg.data;
	 * return (lobby_invite);
	*/
	// here just placeholder data.
	// When we are not the lobby owner, so we do not have the data for a
	// LobbyInvite object.
	// So for testing I just assume the data to be certain values.
	// This does not mean any of these fields can be hardcoded.
	// This is just for now.
	const lobby_invite: LobbyInvite = {
		map_name: 'default',
		// Not sure if we should take the password from the websocket
		//  or take it as text input.
		//  When we send it through the socket and use it the user dosn't have
		//  to enter it when he gets invited (which seems nice).
		//  On the other hand when the page is refreshed the password is lost
		//  and I guess the user would need to enter it anyway?
		lobby_password: await get_password_from_user("Game"),
		lobby_id: 0,
		valid: true,
	};
	if (globalThis.game !== undefined) {
		// Tell the user who send the invite that the player is allready in a game
		lobby_invite.valid = false;
		// maybe display something about the missed invite
	}
	return (lobby_invite);
}

