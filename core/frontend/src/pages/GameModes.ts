// frontend/src/pages/GameModes.ts
import type { PageModule } from '../router'

import { Game } from '../game/game_new.ts'
import { Tournament } from '../game/Tournament.ts'

import { attempt_reconnect } from '../game/frontend_interface_examples/reconnect.ts'

import type { CustomLobbyOptions } from '../game/frontend_interface_examples/custom_lobbies.ts'
import {
	create_join_lobby
} from '../game/frontend_interface_examples/custom_lobbies.ts'

import type { MatchmakingOptions } from '../game/frontend_interface_examples/matchmaking.ts'
import { enter_matchmaking } from '../game/frontend_interface_examples/matchmaking.ts'

import { generate_password } from '../game/globals.ts';

import type {
	LobbyInvite,
	ServerError
} from '../game/game_shared/message_types.ts'

import { getSession } from '../services/session'

const template = /*html*/`
	<div class="w-full max-w-5xl mx-auto p-6 space-y-6">
		<!-- controls -->
		<div class="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
			<label class="flex flex-col text-white">
				<span class="mb-1">User&nbsp;ID</span>
				<input id="user-id-input"
					type="number"
					placeholder="Enter your user id"
					class="rounded bg-[#271c1f] p-2 text-white focus:outline-none">
			</label>

			<div class="flex gap-2">
				<button id="btn-matchmaking"
					class="rounded bg-[#0bda8e] px-4 py-2 text-white cursor-pointer">Matchmaking</button>
				<button id="btn-create-tournament"
					class="rounded bg-[#0bda8e] px-4 py-2 text-white cursor-pointer">Create Tournament</button>
				<button id="btn-lobby"
					class="rounded bg-[#b99da6] px-4 py-2 text-white cursor-pointer">Custom Lobby</button>
				<button id="btn-local"
					class="rounded bg-[#543b43] px-4 py-2 text-white cursor-pointer">Add local player</button>
				<!-- leave button -->
				<button id="btn-leave" class="rounded bg-[#D22B2B] px-4 py-2 text-white cursor-pointer">Leave Match</button>
				<button id="btn-disconnect" class="rounded bg-[#D22B2B] px-4 py-2 text-white cursor-pointer">Disconnect</button>
				<button id="btn-reconnect" class="rounded bg-[#D22B2B] px-4 py-2 text-white cursor-pointer">Reconnect</button>
				<button id="btn-start_tournament" class="rounded bg-[#D22B2B] px-4 py-2 text-white cursor-pointer">Start Tournament</button>
			</div>
		</div>

		<!-- extra action while a lobby is open -->
		<button id="btn-add-local-player" class="hidden rounded bg-[#0bda8e] px-4 py-2 text-white"> Add Local Player</button>

		<!-- game canvas / iframe / whatever -->
		<div id="game-container"
			class="mt-6 w-full h-[clamp(500px,70vh,900px)] rounded-lg border border-[#543b43] overflow-hidden">
		</div>
	</div>
`

declare global { var game: Game | undefined }
globalThis.game = undefined;

declare global { var tournament: Tournament | undefined }
globalThis.tournament = undefined;

declare global { var last_invite: LobbyInvite | undefined }
globalThis.game = undefined;


function wireLocalPlayerButton(game: Game): void {
	const btn = document.getElementById('btn-add-local-player') as HTMLButtonElement | null
	if (!btn) return

	;(game as any).toggleLocalPlayerBtn = (show: boolean) => {
		btn.classList.toggle('hidden', !show)
	}

	/* keep only one listener */
	btn.replaceWith(btn.cloneNode(true))
	const freshBtn = document.getElementById('btn-add-local-player') as HTMLButtonElement
	freshBtn.addEventListener('click', () => {
		const name = prompt('Display name for local player', 'Player 2')?.trim()
		if (name) globalThis.game?.add_local_player(name)
	})
}

async function test_enter_matchmaking(
	container: HTMLElement,
	user_id: number,
): Promise<void> {
	const matchmaking_options: MatchmakingOptions = {
		map_name: 'default',
		ai_count: 0,
		display_name: `display_name_${user_id}`,
	}

	if (game !== undefined) {
		game.leave()
		game = undefined
	}

	const gm = await enter_matchmaking(user_id, container, matchmaking_options)
	if (gm instanceof Game){
		wireLocalPlayerButton(gm)
	}else{
		console.log(gm as ServerError)
	}
}

async function create_custom_lobby(
	user_id: number,
	container: HTMLElement,
): Promise<void> {

	const options: CustomLobbyOptions = {
		map_name: 'default',
		ai_count: 0,
	}

	const gm = await create_join_lobby(user_id, container, options)
	if (!(gm instanceof Game)) return
	//fabi: what does this do, should I use this instead of the other add local player button?
	wireLocalPlayerButton(gm)
}


async function test_tournament(
	container: HTMLElement,
	user_id: number,
): Promise<void> {

	const display_name: string = `placeholder_display_name_${user_id}`;
	const map_name: string = 'default';
	const tournament_password = generate_password();

	const tournament: Tournament | undefined = await Tournament.create_tournament(
		user_id, display_name, map_name, tournament_password, container);
	if (!tournament) {
		return ;
	}
}

function setupGameModes(root: HTMLElement): void {
	const container = root.querySelector<HTMLElement>('#game-container')!
	const input = root.querySelector<HTMLInputElement>('#user-id-input')
	const btnMatch = root.querySelector<HTMLButtonElement>('#btn-matchmaking')
	const btnCreateTournament = root.querySelector<HTMLButtonElement>('#btn-create-tournament')
	const btnLobby = root.querySelector<HTMLButtonElement>('#btn-lobby')

	const btnLocal = root.querySelector<HTMLButtonElement>('#btn-local')

	const btnLeave = root.querySelector<HTMLButtonElement>('#btn-leave')
	const btnDisconnect = root.querySelector<HTMLButtonElement>('#btn-disconnect')
	const btnReconnect = root.querySelector<HTMLButtonElement>('#btn-reconnect')
	const btnStartTournament = root.querySelector<HTMLButtonElement>('#btn-start_tournament')
	btnLeave?.addEventListener('click', () => {
		globalThis.game?.leave()
		globalThis.tournament?.leave()
	})
	btnDisconnect?.addEventListener('click', () => {
		globalThis.game?.disconnect()
	})
	btnLocal?.addEventListener('click', () => {
		const name: string | undefined = prompt('Display name for local player', 'Player 2')?.trim()
		if (!name) {
			return ;
		}
		globalThis.game?.add_local_player(name)
	})
	btnStartTournament?.addEventListener('click', () => {
		globalThis.tournament?.start();
		console.log("tournament when start tournament was pressed: ", globalThis.tournament);
	})
	/* pre-fill & lock field when we already know the user */
	void (async () => {
		const user = await getSession()
		if (user?.id && input) {
			input.value    = String(user.id)
			input.disabled = true
		}
	})()

	const getUserId = (): number | null => {
		const v = input?.value.trim() ?? ''
		const n = Number(v)
		return isNaN(n) ? null : n
	}

	const run = async (mode: 'match' | 'lobby' | 'tournament'
		| 'reconnect'): Promise<void> => {
		const user = await getSession()
		const user_id = user?.id ?? getUserId()
		if (user_id === null) { alert('invalid id'); return }

		await attempt_reconnect(container, user_id)
		if (globalThis.game !== undefined) return

		const do_nothing = async () => {};

		switch (mode) {
			case 'match':	await test_enter_matchmaking(container, user_id);	break
			case 'tournament':	await test_tournament(container, user_id);	break
			case 'lobby':	await create_custom_lobby(user_id, container);				break
			// case 'reconnect': await attempt_reconnect(container, user_id); break ;
	 	}
	}

	btnMatch?.addEventListener('click', () => run('match'))
	btnLobby?.addEventListener('click', () => run('lobby'))
	btnCreateTournament?.addEventListener('click', () => run('tournament'))
	btnReconnect?.addEventListener('click', () => run('reconnect'))
}


const GameModes: PageModule = {
	render(root) { root.innerHTML = template },
	afterRender(root) { setupGameModes(root) },
}

export default GameModes
