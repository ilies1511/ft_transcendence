
import { Game } from './game/game_new.ts';
import { GameApi } from './game/GameApi.ts';
import type {
	ServerToClientMessage,
	ServerToClientJson,
	GameStartInfo,
	ClientToServerMessage,
	GameOptions,
	EnterMatchmakingResp,
	ReconnectResp,
	ServerError,
	CreateLobbyReq,
	CreateLobbyResp,
} from './game/game_shared/message_types.ts';

const container: HTMLElement = document.getElementById('game-container');
const input = document.getElementById('user-id-input') as HTMLInputElement | null;
const btn = document.getElementById('start-game-btn');

// reconnects to a running game or tournament
// (right now only game, not tournament)
async function attempt_reconnect(match_container: HTMLElement, user_id: number)
	: Promise<Game | undefined>
{
	const reconnect: ReconnectResp = await GameApi.reconnect(user_id);
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
	}
	if (match_id != -1) {
		return (new Game(user_id, match_container, match_id, lobby_password));
	}
}

async function enter_matchmaking(container: HTMLElement, user_id: number)
	: Promise<Game | ServerError>
{
	console.log("user_id: ", user_id);

	if (!container) {
		console.error("Container element not found");
		return;
	}

	container.innerHTML = '';
	const resp: EnterMatchmakingResp = await GameApi.enter_matchmaking(user_id, "default", 0);
	if (resp.error != "") {
		console.log(resp.error);
		return (resp.error);
	}
	console.log("resp: ", resp);
	const match_id: number = resp.match_id;
	return (new Game(user_id, container, match_id, "default", ''));
}

async function test_enter_matchmaking(container: HTMLElement, user_id: number)
	: Promise<void>
{
	let reconnect: Game | undefined = await attempt_reconnect(container, user_id);
	if (reconnect == undefined) {
		const matchmaking_game: Game | ServerError = await enter_matchmaking(container, user_id);
		if (matchmaking_game instanceof Game) {
		} else {
			console.log(matchmaking_game as ServerError);
		}
	}
}

// if user_id == 1: creates lobby with password "a"
// else asks user to enter lobby id and joins it
async function test_create_join_lobby(user_id: number)
	: Promise<void>
{
	const password: string = "a";

	if (user_id == 1) {
		const resp: CreateLobbyResp = await GameApi.create_lobby("default", 0, password);
		if (resp.error != "") {
			console.log(resp.error);
			return ;
		}
		console.log("created lobby with id ", resp.match_id);
		const game: Game  = new Game(user_id, container, resp.match_id, "default", password)
	} else {
		const game: Game  = new Game(user_id, container, 0, "default", password)
	}
}

if (btn && input) {
	btn.addEventListener('click', async () => {
		const val = input.value.trim();
		const user_id = Number(val);
		if (isNaN(user_id)) {
			alert("invalid id");
			return;
		}
		input.disabled = true;
		//test_enter_matchmaking(container, user_id);
		test_create_join_lobby(user_id);
	});
} else {
	console.error("Input or button not found in HTML.");
}



