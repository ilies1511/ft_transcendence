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

import { generate_password } from '../game/globals.ts'

import type {
	LobbyInvite,
	ServerError
} from '../game/game_shared/message_types.ts'
import { LobbyType } from '../game/game_shared/message_types.ts'

import { getSession } from '../services/session'

const template = /*html*/`
	<div class="w-full max-w-5xl mx-auto p-6 space-y-6">
		<!-- controls -->
		<div class="flex flex-col gap-4">
			<!-- Map Selector -->
			<details id="map-selector" class="rounded border border-[#543b43] bg-[#1e1518]">
				<summary class="cursor-pointer select-none px-4 py-3 text-white flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="font-semibold">Choose Map</span>
						<span class="opacity-70">(Selected: <span id="selected-map-label" class="underline">default</span>)</span>
					</div>
				</summary>
				<div id="map-grid" class="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"></div>
			</details>

			<div class="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
				<label class="flex flex-col text-white">
					<span class="mb-1">Your&nbsp;ID</span>
					<input id="user-id-input"
						type="number"
						placeholder="Enter your user id"
						class="rounded bg-[#271c1f] p-2 text-white focus:outline-none">
				</label>

				<!-- Initial Actions -->
				<div id="initial-actions" class="flex gap-2">
					<button id="btn-matchmaking"
						class="rounded bg-[#0bda8e] px-4 py-2 text-white cursor-pointer">Matchmaking</button>
					<button id="btn-create-tournament"
						class="rounded bg-[#0bda8e] px-4 py-2 text-white cursor-pointer">Tournament</button>
					<button id="btn-lobby"
						class="rounded bg-[#b99da6] px-4 py-2 text-white cursor-pointer">Custom Lobby</button>
					<button id="btn-reconnect" class="rounded bg-blue-500 px-4 py-2 text-white cursor-pointer">Reconnect</button>
				</div>

				<!-- In-Game/In-Lobby Actions -->
				<div id="game-actions" class="hidden flex gap-2">
					<button id="btn-start_tournament" class="hidden rounded bg-green-500 px-4 py-2 text-white cursor-pointer">Start Tournament</button>
					<button id="btn-add-local-player" class="hidden rounded bg-blue-400 px-4 py-2 text-white">Add Local Player</button>
					<button id="btn-leave" class="rounded bg-[#D22B2B] px-4 py-2 text-white cursor-pointer">Leave</button>
				</div>
			</div>

			<!-- game canvas / iframe / whatever -->
			<div id="game-container"
				class="mt-2 w-full h-[clamp(500px,70vh,900px)] rounded-lg border border-[#543b43] overflow-hidden">
			</div>
		</div>
	</div>
`

declare global { var game: Game | undefined }
globalThis.game = undefined;

declare global { var tournament: Tournament | undefined }
globalThis.tournament = undefined;

declare global { var last_invite: LobbyInvite | undefined }
globalThis.game = undefined;

const user = await getSession();

function wireLocalPlayerButton(game: Game): void {
	const btn = document.getElementById('btn-add-local-player') as HTMLButtonElement | null
	if (!btn) return

	btn.classList.remove('hidden');

	/* keep only one listener */
	btn.replaceWith(btn.cloneNode(true))
	const freshBtn = document.getElementById('btn-add-local-player') as HTMLButtonElement
	freshBtn.addEventListener('click', () => {
		const name = prompt('Display name for local player', 'Player 2')?.trim()
		if (name) globalThis.game?.add_local_player(name)
	})
}

// Map metadata and selector wiring
type MapInfo = { id: string; name: string; players: number };
const MAPS: MapInfo[] = [
	{ id: 'default',        name: 'Default',          players: 2 },
	{ id: 'BigPlus2',       name: 'Big Plus (2P)',    players: 2 },
	{ id: 'BigPlus4',       name: 'Big Plus (4P)',    players: 4 },
	{ id: 'Diamond2',       name: 'Diamond (2P)',     players: 2 },
	{ id: 'OctaPong2',      name: 'Octa Pong (2P)',   players: 2 },
	{ id: 'OctaPong4',      name: 'Octa Pong (4P)',   players: 4 },
	{ id: 'SimpleSquare2',  name: 'Simple Square (2P)', players: 2 },
	{ id: 'SimpleSquare4',  name: 'Simple Square (4P)', players: 4 },
];

function renderMapCards(grid: HTMLElement, selectedId: string) {
	grid.innerHTML = MAPS.map(m => `
		<button
			type="button"
			data-map-id="${m.id}"
			class="cursor-pointer group rounded overflow-hidden border ${m.id === selectedId ? 'border-[#0bda8e]' : 'border-[#543b43]'} bg-[#271c1f] hover:border-[#0bda8e] transition-colors">
			<div class="aspect-video bg-[#1b1214] relative">
				<img
					data-map-img
					alt="${m.name}"
					src="/maps/${m.id}.jpg"
					class="w-full h-full object-cover block"
				/>
				<div class="absolute top-1 right-1 text-xs bg-black/60 text-white px-2 py-0.5 rounded">${m.players}P</div>
			</div>
			<div class="px-3 py-2 text-left">
				<div class="text-white text-sm">${m.name}</div>
			</div>
		</button>
	`).join('');

	// Fallback placeholder if image not found
	grid.querySelectorAll<HTMLImageElement>('img[data-map-img]').forEach(img => {
		img.addEventListener('error', () => {
			const parent = img.parentElement as HTMLElement;
			img.style.display = 'none';
			parent.style.background =
				'linear-gradient(135deg, rgba(84,59,67,0.35), rgba(11,218,142,0.2))';
			parent.style.display = 'grid';
			parent.style.placeItems = 'center';
			parent.innerHTML = '<span style="color:#b99da6;font-size:12px;">No Preview</span>';
		}, { once: true });
	});
}

function setupMapSelector(root: HTMLElement) {
	const details = root.querySelector<HTMLDetailsElement>('#map-selector')!;
	const grid = root.querySelector<HTMLElement>('#map-grid')!;
	const label = root.querySelector<HTMLElement>('#selected-map-label')!;
	let selected = localStorage.getItem('selectedMap') || 'default';

	const setSelected = (id: string) => {
		selected = id;
		localStorage.setItem('selectedMap', selected);
		label.textContent = selected;
		renderMapCards(grid, selected);
		// auto-collapse after selection to save space
		details.open = false;
	};

	// Initial render
	label.textContent = selected;
	renderMapCards(grid, selected);

	// Click delegation to pick a map
	grid.addEventListener('click', (e) => {
		const btn = (e.target as HTMLElement).closest('button[data-map-id]') as HTMLButtonElement | null;
		if (!btn) return;
		const id = btn.getAttribute('data-map-id')!;
		setSelected(id);
	});

	return {
		getSelected: () => selected,
		open: () => { details.open = true; },
		close: () => { details.open = false; },
	};
}



async function test_enter_matchmaking(
	container: HTMLElement,
	user_id: number,
	map_name: string,
): Promise<void> {
	const matchmaking_options: MatchmakingOptions = {
		map_name,
		ai_count: 0,
		display_name: user!.nickname,
	}


	if (game !== undefined) {
		game.leave()
		game = undefined
	}

	const gm: Game | ServerError = await enter_matchmaking(user_id, container, matchmaking_options)
	if (gm instanceof Game){
		// wireLocalPlayerButton(gm) // Not for matchmaking
	} else {
		console.log(gm as ServerError)
	}
}

async function create_custom_lobby(
	user_id: number,
	container: HTMLElement,
	map_name: string,
): Promise<void> {

	const options: CustomLobbyOptions = {
		map_name,
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
	map_name: string, // <- pass selected map
): Promise<void> {

	const display_name: string = user!.nickname;
	const tournament_password = generate_password();

	const tournament: Tournament | undefined = await Tournament.create_tournament(
		user_id, display_name, map_name, tournament_password, container);
	if (!tournament) {
		return ;
	}
	const startBtn = document.getElementById('btn-start_tournament');
	// The button is now shown based on polled state, not just on creation.
	// startBtn?.classList.remove('hidden');
}

function setupGameModes(root: HTMLElement): void {
	const container = root.querySelector<HTMLElement>('#game-container')!
	const input = root.querySelector<HTMLInputElement>('#user-id-input')
	const btnMatch = root.querySelector<HTMLButtonElement>('#btn-matchmaking')
	const btnCreateTournament = root.querySelector<HTMLButtonElement>('#btn-create-tournament')
	const btnLobby = root.querySelector<HTMLButtonElement>('#btn-lobby')

	const btnLeave = root.querySelector<HTMLButtonElement>('#btn-leave')

	const btnReconnect = root.querySelector<HTMLButtonElement>('#btn-reconnect')
	const btnStartTournament = root.querySelector<HTMLButtonElement>('#btn-start_tournament')
	// NOTE: do not capture a persistent reference to `btn-add-local-player`
	// because wireLocalPlayerButton clones and replaces the node.
	// const btnAddLocalPlayer = root.querySelector<HTMLButtonElement>('#btn-add-local-player')

	const initialActions = root.querySelector<HTMLDivElement>('#initial-actions')!
	const gameActions = root.querySelector<HTMLDivElement>('#game-actions')!

	const mapSelector = setupMapSelector(root);
	const mapSelectorDetails = root.querySelector<HTMLDetailsElement>('#map-selector')!;

	// --- Disable Tournament button for >2-player maps ---
	const updateTournamentButton = () => {
		const selectedMap = mapSelector.getSelected();
		const mapInfo = MAPS.find(m => m.id === selectedMap);
		if (!btnCreateTournament) return;
		if (mapInfo && mapInfo.players > 2) {
			btnCreateTournament.disabled = true;
			btnCreateTournament.title = "Tournament mode only supports 2-player maps";
			btnCreateTournament.classList.add('opacity-50', 'cursor-not-allowed');
		} else {
			btnCreateTournament.disabled = false;
			btnCreateTournament.title = "";
			btnCreateTournament.classList.remove('opacity-50', 'cursor-not-allowed');
		}
	};
	updateTournamentButton();
	// Listen for map changes
	const grid = root.querySelector<HTMLElement>('#map-grid')!;
	grid.addEventListener('click', () => setTimeout(updateTournamentButton, 0));
	// --- End disable logic ---

	let uiUpdateInterval: number | null = null;

	const stopUiUpdater = () => {
		if (uiUpdateInterval) clearInterval(uiUpdateInterval);
		uiUpdateInterval = null;
	};

	const showGameActions = () => {
		initialActions.classList.add('hidden');
		gameActions.classList.remove('hidden');
		// Also hide context-specific buttons to ensure a clean state
		const startBtn = document.getElementById('btn-start_tournament');
		startBtn?.classList.add('hidden');
		const addBtn = document.getElementById('btn-add-local-player');
		addBtn?.classList.add('hidden');
	}

	const showInitialActions = () => {
		initialActions.classList.remove('hidden');
		gameActions.classList.add('hidden');
		// Also hide context-specific buttons
		const startBtn = document.getElementById('btn-start_tournament');
		startBtn?.classList.add('hidden');
		const addBtn = document.getElementById('btn-add-local-player');
		addBtn?.classList.add('hidden');
	}

	const startUiUpdater = () => {
		stopUiUpdater(); // Prevent multiple intervals

		uiUpdateInterval = setInterval(() => {
			const game = (globalThis as any).game;
			const tournament = (globalThis as any).tournament;
			const hasContext = !!game || !!tournament;

			// Hide/show map selector depending on state (hide if in any lobby/game or while creating custom lobby)
			if (hasContext || pendingCustomLobby) {
				mapSelectorDetails.classList.add('hidden');
			} else {
				mapSelectorDetails.classList.remove('hidden');
			}

			if (hasContext) {
				showGameActions();
			} else {
				showInitialActions();
				return;
			}

			// --- Tournament State Check ---
			{
				const startBtn = document.getElementById('btn-start_tournament');
				if (tournament) {
					const tournamentStarted = tournament.latest_tournament_state?.started === true;
					if (tournamentStarted) {
						startBtn?.classList.add('hidden');
					} else {
						startBtn?.classList.remove('hidden');
					}
				} else {
					startBtn?.classList.add('hidden');
				}
			}

			// --- Add Local Player visibility ---
			{
				const addBtn = document.getElementById('btn-add-local-player');

				// First, if a game exists, decide purely by game state
				if (game) {
					const activeName = (game as any)?._active_scene?.constructor?.name;
					const gameSceneActive = activeName === 'GameScene';

					if (gameSceneActive) {
						// Game has started -> ensure hidden and clear pending flag
						addBtn?.classList.add('hidden');
						pendingCustomLobby = false;
					} else if (isCustomLobby(game)) {
						// In a custom lobby and game not started yet -> show
						addBtn?.classList.remove('hidden');
					} else {
						// Not a custom lobby (matchmaking/tournament lobbies) -> hide
						addBtn?.classList.add('hidden');
					}
				} else {
					// No game yet: only show if we're in the middle of creating a custom lobby
					if (pendingCustomLobby) {
						addBtn?.classList.remove('hidden');
					} else {
						addBtn?.classList.add('hidden');
					}
				}
			}
		}, 200);
	};

	btnLeave?.addEventListener('click', () => {
		stopUiUpdater();
		globalThis.game?.leave();
		globalThis.tournament?.leave();
		showInitialActions();
	})

	btnStartTournament?.addEventListener('click', () => {
		globalThis.tournament?.start();
		// The button is now hidden reactively by the UI updater.
		console.log("tournament when start tournament was pressed: ", globalThis.tournament);
	})
	/* pre-fill & lock field when we already know the user */
	void (async () => {
		const user = await getSession()
		if (user?.id && input) {
			input.value	= String(user.id)
			input.disabled = true
			// Automatically try to reconnect if the user is already in a game
			await run('reconnect');
		}
	})()

	const getUserId = (): number | null => {
		const v = input?.value.trim() ?? ''
		const n = Number(v)
		return isNaN(n) ? null : n
	}

	// Keep "Add local player" visible while we're creating a custom lobby
	let pendingCustomLobby = false;

	// Helper to normalize lobby type checks
	function isCustomLobby(game: any): boolean {
		const t = game?.lobby_type;
		// support number enums and strings; accept COMMON custom names
		const name = typeof t === 'number' ? (LobbyType as any)[t] : String(t).toUpperCase();
		return name === 'CUSTOM' || name === 'CUSTOM_LOBBY' || name === 'LOBBY';
	}

	const run = async (mode: 'match' | 'lobby' | 'tournament' | 'reconnect' | 'leave'): Promise<void> => {
		const user = await getSession()
		const user_id = user?.id ?? getUserId()
		if (user_id === null) { alert('invalid id'); return }

		//await attempt_reconnect(container, user_id)
		//if (globalThis.game !== undefined) return
		const selectedMap = mapSelector.getSelected();

		const leave_fn = async() => {
			console.log('leave fn');
			stopUiUpdater();
			pendingCustomLobby = false;
			await attempt_reconnect(container, user_id, true);
			(globalThis as any).game?.leave();
			(globalThis as any).tournament?.leave();
			// Show initial UI and map selector immediately upon leaving
			mapSelectorDetails.classList.remove('hidden');
			showInitialActions();
		}

		switch (mode) {
			case 'match':
				pendingCustomLobby = false;
				// Hide map selector immediately to avoid flash
				mapSelectorDetails.classList.add('hidden');
				showGameActions();
				await test_enter_matchmaking(container, user_id, selectedMap);
				startUiUpdater();
				break;
			case 'tournament':
				pendingCustomLobby = false;
				mapSelectorDetails.classList.add('hidden');
				showGameActions();
				await test_tournament(container, user_id, selectedMap);
				startUiUpdater();
				break;
			case 'lobby':
				// Show button immediately while lobby is being created
				pendingCustomLobby = true;
				mapSelectorDetails.classList.add('hidden');
				showGameActions();
				await create_custom_lobby(user_id, container, selectedMap);
				startUiUpdater();
				break;
			case 'reconnect':
				pendingCustomLobby = false;
				await attempt_reconnect(container, user_id);
				if ((globalThis as any).game || (globalThis as any).tournament) {
					// Hide selector if we reconnected into a lobby/game
					mapSelectorDetails.classList.add('hidden');
					showGameActions();
					startUiUpdater();
				}
				break;
			case 'leave':
				await leave_fn();
				break;
	 	}
	}

	btnMatch?.addEventListener('click', () => run('match'))
	btnLobby?.addEventListener('click', () => run('lobby'))
	btnCreateTournament?.addEventListener('click', () => run('tournament'))
	btnReconnect?.addEventListener('click', () => run('reconnect'))
	btnLeave?.addEventListener('click', () => run('leave'))

	// Start the reactive UI updater right away so invited users (who didn’t click a mode here)
	// still see the correct controls when a Game/Tournament exists.
	startUiUpdater();
}


const GameModes: PageModule = {
	render(root) { root.innerHTML = template },
	afterRender(root) { setupGameModes(root) },
}

export default GameModes
