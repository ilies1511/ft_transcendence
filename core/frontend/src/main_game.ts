import { Game } from './game/game_new.ts';
import { GameApi } from './game/GameApi.ts';

import { get_password_from_user } from './game/placeholder_globals.ts';

import { attempt_reconnect } from './game/frontend_interface_examples/reconnect.ts';
import {
	accept_lobby_invite,
	create_join_lobby,
	invite_user_to_lobby_skeleton,
	recv_lobby_invite_skeleton,

} from './game/frontend_interface_examples/custom_lobbies.ts';
import type { CustomLobbyOptions } from './game/frontend_interface_examples/custom_lobbies.ts';

import type { MatchmakingOptions } from './game/frontend_interface_examples/matchmaking.ts';
import { enter_matchmaking } from './game/frontend_interface_examples/matchmaking.ts';


import type {
	ServerError,
	LobbyInvite,
} from './game/game_shared/message_types.ts';

/* Important!! Only have one game object at the same time!!
 * The Game class will manage it's value.
 * Don't overwrite it manually (treat it as read only outside the Game class).
 * If you need a new game object and globalThis.game !== undefined always call
    either 'globalThis.game.disconnect()' or 'globalThis.game.leave()'.
    Otherwise the constructor of the object will call 'globalThis.game.leave()'.
*/

declare global {
  var game: Game | undefined;
}

// You can get always get the game object from here if it exists.
globalThis.game = undefined;



const container: HTMLElement = document.getElementById('game-container');
const input = document.getElementById('user-id-input') as HTMLInputElement | null;
const btn = document.getElementById('start-game-btn');
/*
 * The lobby password is an empty string by default.
 * If the lobby is created manually the password is not empty
 */
let lobby_password: string = "";



async function test_enter_matchmaking(container: HTMLElement, user_id: number)
	: Promise<void>
{
	const matchmaking_options: MatchmakingOptions = {
		map_name: "default",
		ai_count: 0,
	};
	if (game !== undefined) {
		game.leave();
		game = undefined;
	}
	const matchmaking_game: Game | ServerError = await enter_matchmaking(
		user_id, container, matchmaking_options);
	if (matchmaking_game instanceof Game) {
	} else {
		console.log(matchmaking_game as ServerError);
	}
}

// for testing user with id == 1 creates the lobby and others join
async function test_lobby(user_id: number, container: HTMLElement)
	: Promise<void>
{
	lobby_password = await get_password_from_user("Game");
	if (user_id == 1 /* the user who creates the lobby */) {
		// Options is filled by the user.
		// Dosn't need to use get_password_from_user(). Here it's only used to
		//  have the same password string everywhere.
		const options: CustomLobbyOptions = {
			map_name: "default",
			lobby_password: await get_password_from_user("Game"),
			ai_count: 0,
		};
		const game: Game | ServerError = await create_join_lobby(user_id, container, options);
		if (!(game instanceof Game)) {
			return ;
		}

		// Later something like this should send a lobby invite to user 2.
		// Right now does nothing.
		const target_user_id: number = 2;
		invite_user_to_lobby_skeleton(game, target_user_id);
	} else /* users who try to join the lobby */ {
		const lobby_invite: LobbyInvite = await recv_lobby_invite_skeleton();
		if (!lobby_invite.valid) {
			return ;
		}
		let game: Game | ServerError = await accept_lobby_invite(user_id, container, lobby_invite);
	}
}

if (btn && input) {
	btn.addEventListener('click', async () => {
		const val = input.value.trim();
		const user_id = Number(val);
		if (isNaN(user_id)) {
			alert("invalid id");
			return ;
		}
		console.log("got user_id: ", user_id);
		//how do i remove the button here
		await attempt_reconnect(container, user_id);
		if (globalThis.game == undefined) {
			//test_enter_matchmaking(container, user_id);
			test_lobby(user_id, container);
		}
	});
} else {
	console.error("Input or button not found in HTML.");
}

