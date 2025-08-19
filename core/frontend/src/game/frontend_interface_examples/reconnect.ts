import { Game } from '../game_new.ts';
import { Tournament } from '../Tournament.ts';
import { GameApi } from '../GameApi.ts';

import type {
	ReconnectResp,
} from '../game_shared/message_types.ts';

/* There are two cases for when this should be called:
 * 1.: The page got refreshed so the game object is lost:
 	 In this case the game can not reconnect on it's own, so call this before
 	 tring to create a new game.
 * 2.: 
	 for let game: Game = ...;
	 ...
	 game.disconnect(); // now the game object is invalid
	 //to reconnect to the game call 'attempt_reconnect'

 * When not to call this:
 * 
 * 1.: On connection issues:
 	 If there is a Game object it will detect issues with the websocket connection.
 	 It will reconnect on it's own.
 	 Don't make a second game object while the other is still running.
 * 2.:
	 for let game: Game = ...;
	 ...
	 game.leave(); // simmilar to game.disconnect(), BUT
	 //'game.leave()' tells the server that we will not reconnect
*/
export async function attempt_reconnect(match_container: HTMLElement, user_id: number)
	: Promise<void>
{
	if (globalThis.game !== undefined) {
		console.log("WARNING: Game: attempt_reconnect() was called while game object existed.",
			"\n\tIt simply returned right way!\n\tGame id: ", globalThis.game.game_id);
		return ;
	}


	const reconnect: ReconnectResp = await GameApi.reconnect(user_id);
	let match_id: number = -1;
	if (reconnect.tournament_id >= 0) {
		if (!globalThis.tournament) {
			new Tournament(user_id, reconnect.tournament_id, reconnect.tournament_password, match_container);
		} else {
			console.log("Error: there is allready a tournament obj");
		}
		if (reconnect.match_id >= 0) {
			match_id = reconnect.match_id;
		}
		//todo
	} else if (reconnect.match_id >= 0) {
		match_id = reconnect.match_id;
	}
	if (match_id != -1) {
		console.log("Game: Reconnecting to match with password:" , reconnect.match_password);
		new Game(user_id, match_container, match_id, "default", reconnect.match_password, reconnect.lobby_type);
		await globalThis.game!.reconnect_local_player();
		return ;
	}
}

