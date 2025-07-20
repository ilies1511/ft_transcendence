import {Game} from './game/game_new.ts';
import {GameApi} from './game/GameApi.ts';

import type {
	ServerToClientMessage,
	ServerToClientJson,
	GameStartInfo,
	ClientToServerMessage,
	GameOptions,
	EnterMatchmakingResp,
	ReconnectResp,
} from './game/game_shared/message_types.ts';

const container = document.getElementById('game-container');

const userId = 222;
console.log("userId: ", userId);

if (container) {
	const reconnect: ReconnectResp = await GameApi.reconnect(userId);
	let match_id: number = -1;
	let lobby_password: string = '';
	if (reconnect.tournament_id >= 0) {
		//todo
	} else if (reconnect.match_id >= 0) {
		match_id = reconnect.match_id;
		if (reconnect.match_has_password) {
			//todo: let user enter password
			//lobby_password = ..
		}
	} else {
		container.innerHTML = '';

		const resp: EnterMatchmakingResp = await GameApi.enter_matchmaking(userId, "default", 0);
		if (resp.error != "") {
			//should never happen ideally
			console.log(resp.error);
		}
		console.log("resp: ", resp);
		match_id = resp.match_id;
	}
	if (match_id != -1) {
		new Game(userId, container, match_id, lobby_password);
	}
} else {
	console.error("Container element not found");
}

