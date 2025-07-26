import { Game } from '../game_new.ts';
import { GameApi } from '../GameApi.ts';

import type {
	EnterMatchmakingResp,
	ServerError,
} from './../game_shared/message_types.ts';

export type MatchmakingOptions = {
	map_name: string,
	ai_count: number,
	display_name: string,
};

export async function enter_matchmaking(user_id: number,
	container: HTMLElement, options: MatchmakingOptions
	): Promise<Game | ServerError>
{
	console.log("user_id: ", user_id);

	if (!container) {
		throw ("Container element not found");
	}

	container.innerHTML = '';
	const resp: EnterMatchmakingResp = await GameApi.enter_matchmaking(
		user_id,
		options.map_name,
		options.ai_count,
		options.display_name,
	);
	if (resp.error != "") {
		console.log("Game: enter_matchmaking server response error: ", resp.error);
		return (resp.error);
	}
	const match_id: number = resp.match_id;
	const game: Game = new Game(user_id, container, match_id,
		options.map_name, "");
	return (game);
}
