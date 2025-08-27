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
import { router } from '../main'

const template =`
	<div class="w-full max-w-5xl mx-auto p-6 space-y-6 self-start">
		<!-- controls -->
		<div class="flex flex-col gap-4">
			<!-- Map Selector -->
			<details id="map-selector" class="rounded border border-[#543b43] bg-[#1e1518]">
				<summary class="cursor-pointer select-none px-4 py-3 text-white flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="font-semibold">All Maps</span>
						<span class="opacity-70">(Selected: <span id="selected-map-label" class="underline">default_3m_30p</span>)</span>
					</div>
				</summary>
				<div id="map-selector-content" class="p-4 space-y-6">
					<!-- Filters -->
					<div class="space-y-4">
						<!-- Player Count -->
						<div class="flex flex-col sm:flex-row sm:items-center gap-3">
							<span class="text-white font-medium w-24">Players</span>
							<div id="player-filter" class="flex gap-2"></div>
						</div>
						<!-- Game Mode / Type -->
						<div class="flex flex-col sm:flex-row sm:items-center gap-3">
							<span class="text-white font-medium w-24">Mode</span>
							<div id="variant-filter" class="flex gap-2 flex-wrap"></div>
						</div>
					</div>
					<!-- Map Grid -->
					<div>
						<h3 class="text-lg font-semibold text-white mb-3">Select a Layout</h3>
						<div id="map-grid" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"></div>
					</div>
					<!-- Done Button -->
					<div class="pt-4 border-t border-[#543b43] flex justify-center">
						<button id="map-done-btn" class="w-full sm:w-auto rounded bg-rose-500 hover:bg-rose-600 px-6 py-2 text-white cursor-pointer">Done</button>
					</div>
				</div>
			</details>

			<div class="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
				<!-- Initial Actions -->
				<div id="initial-actions" class="w-full space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<!-- Matchmaking Card -->
						<div class="bg-[#271c1f] p-4 rounded border border-[#543b43] flex flex-col">
							<h3 class="font-semibold text-white text-lg mb-2">Matchmaking</h3>
							<p class="text-[#b99da6] text-sm mb-4 flex-grow">Jump into a game against a random opponent online. Quick and easy.</p>
							<button id="btn-matchmaking" class="mt-auto w-full rounded bg-green-500 hover:bg-green-600 px-4 py-2 text-white cursor-pointer">Find Game</button>
						</div>

						<!-- Tournament Card -->
						<div class="bg-[#271c1f] p-4 rounded border border-[#543b43] flex flex-col">
							<h3 class="font-semibold text-white text-lg mb-2">Tournament (1v1)</h3>
							<p class="text-[#b99da6] text-sm mb-4 flex-grow">Create or join a bracket-style tournament. Compete to be the champion.</p>
							<button id="btn-create-tournament" class="mt-auto w-full rounded bg-green-500 hover:bg-green-600 px-4 py-2 text-white cursor-pointer">Create Tournament</button>
						</div>

						<!-- Private Lobby Card -->
						<div class="bg-[#271c1f] p-4 rounded border border-[#543b43] flex flex-col">
							<h3 class="font-semibold text-white text-lg mb-2">Private Lobby</h3>
							<p class="text-[#b99da6] text-sm mb-4 flex-grow">Play with friends. Create a private lobby and invite others to join.</p>
							<button id="btn-lobby" class="mt-auto w-full rounded bg-green-500 hover:bg-green-600 px-4 py-2 text-white cursor-pointer">Create Lobby</button>
						</div>
					</div>
					<!-- Reconnect Button -->
					<div id="reconnect-container" class="flex flex-col items-center gap-4">
						<div class="text-[#b99da6] text-sm">— or —</div>
						<button id="btn-reconnect" class="rounded bg-transparent border border-[#b99da6] hover:bg-[#b99da6]/20 px-4 py-2 text-white cursor-pointer transition-colors">Reconnect to existing game</button>
					</div>
				</div>

				<!-- In-Game/In-Lobby Actions -->
				<div id="game-actions" class="hidden flex gap-2">
					<button id="btn-start_tournament" class="hidden rounded bg-green-500 px-4 py-2 text-white cursor-pointer">Start Tournament</button>
					<button id="btn-add-local-player" class="hidden rounded bg-blue-400 px-4 py-2 text-white cursor-pointer">Add Local Player</button>
					<button id="btn-leave" class="rounded bg-[#D22B2B] px-4 py-2 text-white cursor-pointer">Leave</button>
				</div>
			</div>

			<!-- game canvas / iframe / whatever -->
			<div id="game-container"
				class="hidden mt-2 w-full h-[clamp(500px,70vh,900px)] rounded-lg border border-[#543b43] overflow-hidden">
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
type MapVariant = { id: string; name: string };
type BaseMap = {
    id: string;
    name: string;
    availablePlayers: number[];
};

const MAP_VARIANTS: MapVariant[] = [
    { id: 'standard', name: 'Standard' },
    { id: '3m_30p', name: '3 minutes / 30 HP' },
    { id: '10m_100p', name: '10 minutes / 100HP' },
];

const BASE_MAPS: BaseMap[] = [
    { id: 'default', name: 'Default', availablePlayers: [2] },
    { id: 'BigPlus', name: 'Big Plus', availablePlayers: [2, 4] },
    { id: 'Diamond', name: 'Diamond', availablePlayers: [2] },
    { id: 'OctaPong', name: 'Octa Pong', availablePlayers: [2, 4] },
    { id: 'SimpleSquare', name: 'Simple Square', availablePlayers: [2, 4] },
];

// Exposed API for the selector
type MapSelectorApi = {
    getSelected: () => string;
};

// Persist selected map between visits
const MAP_STORAGE_KEY = 'ftt:selectedMapConfig';

// Image aliasing so variant maps reuse base previews
const IMAGE_ALIAS: Record<string, string> = {
    default_3m_30p: 'default',
    default_10m_100p: 'default',
    BigPlus2_3m_30p: 'BigPlus2',
    BigPlus2_10m_100p: 'BigPlus2',
    BigPlus4_3m_30p: 'BigPlus4',
    BigPlus4_10m_100p: 'BigPlus4',
    Diamond2_3m_30p: 'Diamond2',
    Diamond2_10m_100p: 'Diamond2',
    OctaPong2_3m_30p: 'OctaPong2',
    OctaPong2_10m_100p: 'OctaPong2',
    OctaPong4_3m_30p: 'OctaPong4',
    OctaPong4_10m_100p: 'OctaPong4',
    SimpleSquare2_3m_30p: 'SimpleSquare2',
    SimpleSquare2_10m_100p: 'SimpleSquare2',
    SimpleSquare4_3m_30p: 'SimpleSquare4',
    SimpleSquare4_10m_100p: 'SimpleSquare4',
};
function getPreviewImageId(mapId: string): string {
    // Use the base map ID for the preview image
    return mapId.split('_')[0];
}

function renderMapCards(grid: HTMLElement, selectedId: string) {
	grid.innerHTML = BASE_MAPS.map(m => {
		// Construct a valid preview ID, e.g., 'BigPlus' -> 'BigPlus2'
		const previewId = m.id === 'default' ? 'default' : `${m.id}${m.availablePlayers[0]}`;
		return `
		<button
			type="button"
			data-map-id="${m.id}"
			class="cursor-pointer group rounded overflow-hidden border ${m.id === selectedId ? 'border-rose-500' : 'border-[#543b43]'} bg-[#271c1f] hover:border-rose-500 transition-colors">
			<div class="aspect-video bg-[#1b1214] relative">
				<img
					data-map-img
					alt="${m.name}"
					src="/maps/${previewId}.jpg"
					class="w-full h-full object-cover block"
				/>
				<div class="absolute top-1 right-1 text-xs bg-black/60 text-white px-2 py-0.5 rounded">${m.availablePlayers.map(p => `${p}P`).join(' / ')}</div>
			</div>
			<div class="px-3 py-2 text-left">
				<div class="text-white text-sm">${m.name}</div>
			</div>
		</button>
	`}).join('');

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

function setupMapSelector(root: HTMLElement): MapSelectorApi {
	const grid = root.querySelector<HTMLElement>('#map-grid');
	const playerFilter = root.querySelector<HTMLElement>('#player-filter');
	const variantFilter = root.querySelector<HTMLElement>('#variant-filter');
	const label = root.querySelector<HTMLElement>('#selected-map-label');
	const detailsEl = root.querySelector<HTMLDetailsElement>('#map-selector');
	const doneBtn = root.querySelector<HTMLButtonElement>('#map-done-btn');

	if (!grid || !label || !playerFilter || !variantFilter || !detailsEl || !doneBtn) {
		return { getSelected: () => 'default_2_3m_30p' };
	}

	type MapConfig = { baseId: string; players: number; variantId: string };

	const defaultConfig: MapConfig = { baseId: 'default', players: 2, variantId: '3m_30p' };

	const loadSaved = (): MapConfig | null => {
		try {
			const v = localStorage.getItem(MAP_STORAGE_KEY);
			if (!v) return null;
			const parsed = JSON.parse(v) as MapConfig;
			// Basic validation
			if (BASE_MAPS.some(m => m.id === parsed.baseId) && [2, 4].includes(parsed.players) && MAP_VARIANTS.some(v => v.id === parsed.variantId)) {
				return parsed;
			}
			return null;
		} catch {
			return null;
		}
	};

	const save = (config: MapConfig) => {
		try { localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(config)); } catch {}
	};

	let selectedConfig = loadSaved() ?? defaultConfig;

	const getFinalMapId = (config: MapConfig): string => {
		if (config.variantId === 'standard') {
			return `${config.baseId}_${config.players}`;
		}
		return `${config.baseId}_${config.players}_${config.variantId}`;
	};

	const updateUi = () => {
		const finalMapId = getFinalMapId(selectedConfig);
		label.textContent = finalMapId;
		save(selectedConfig);

		// --- Update Map Card Selection (without re-rendering) ---
		grid.querySelectorAll<HTMLButtonElement>('button[data-map-id]').forEach(button => {
			if (button.dataset.mapId === selectedConfig.baseId) {
				button.classList.add('border-rose-500');
				button.classList.remove('border-[#543b43]');
			} else {
				button.classList.remove('border-rose-500');
				button.classList.add('border-[#543b43]');
			}
		});

		// --- Re-render player filter (as availability changes) ---
		const currentMap = BASE_MAPS.find(m => m.id === selectedConfig.baseId)!;
		playerFilter.innerHTML = [2, 4].map(p => `
			<button
				type="button"
				data-players="${p}"
				class="px-3 py-1 text-sm rounded ${selectedConfig.players === p ? 'bg-rose-500 text-white' : 'bg-[#271c1f] text-white'} ${!currentMap.availablePlayers.includes(p) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-rose-600 cursor-pointer'}"
				${!currentMap.availablePlayers.includes(p) ? 'disabled' : ''}
			>
				${p} Players
			</button>
		`).join('');

		// --- Update Variant Filter Selection (without re-rendering) ---
		variantFilter.querySelectorAll<HTMLButtonElement>('button[data-variant]').forEach(button => {
			if (button.dataset.variant === selectedConfig.variantId) {
				button.classList.add('bg-rose-500');
				button.classList.remove('bg-[#271c1f]', 'hover:bg-rose-600');
			} else {
				button.classList.remove('bg-rose-500');
				button.classList.add('bg-[#271c1f]', 'hover:bg-rose-600');
			}
		});

		// Update external buttons (like tournament)
		const tournamentBtn = document.getElementById('btn-create-tournament') as HTMLButtonElement | null;
		if (tournamentBtn) {
			tournamentBtn.disabled = selectedConfig.players > 2;
			tournamentBtn.title = selectedConfig.players > 2 ? 'Tournaments are 2-player only' : 'Create a tournament';
		}
	};

	// --- Initial Render and Event Listener Setup ---

	// Render map cards ONCE
	renderMapCards(grid, selectedConfig.baseId);
	grid.addEventListener('click', (e) => {
		const button = (e.target as HTMLElement).closest('button[data-map-id]');
		if (!button || button.dataset.mapId === selectedConfig.baseId) return;

		const newBaseId = button.dataset.mapId!;
		const newMap = BASE_MAPS.find(m => m.id === newBaseId)!;
		selectedConfig.baseId = newBaseId;
		// If current player count is not supported, switch to a valid one
		if (!newMap.availablePlayers.includes(selectedConfig.players)) {
			selectedConfig.players = newMap.availablePlayers[0];
		}
		updateUi();
	});

	// Render variant filter ONCE
	variantFilter.innerHTML = MAP_VARIANTS.map(v => `
		<button
			type="button"
			data-variant="${v.id}"
			class="px-3 py-1 text-sm rounded cursor-pointer ${selectedConfig.variantId === v.id ? 'bg-rose-500 text-white' : 'bg-[#271c1f] text-white hover:bg-rose-600'}"
		>
			${v.name}
		</button>
	`).join('');
	variantFilter.addEventListener('click', (e) => {
		const button = (e.target as HTMLElement).closest('button[data-variant]');
		if (!button || button.dataset.variant === selectedConfig.variantId) return;
		selectedConfig.variantId = button.dataset.variant!;
		updateUi();
	});

	// Player filter is re-rendered, so delegate listener to its parent
	playerFilter.addEventListener('click', (e) => {
		const button = (e.target as HTMLElement).closest('button[data-players]');
		if (!button || button.disabled) return;
		const players = Number(button.dataset.players);
		if (players === selectedConfig.players) return;
		selectedConfig.players = players;
		updateUi();
	});

	doneBtn.addEventListener('click', () => {
		if (detailsEl) detailsEl.open = false;
	});

	// Initial UI sync
	updateUi();

	return {
		getSelected: () => getFinalMapId(selectedConfig),
	};
}



async function test_enter_matchmaking(
	container: HTMLElement,
	user_id: number,
	map_name: string,
): Promise<void> {

	const user = await getSession();
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

	const user = await getSession();
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
	const gameContainer = root.querySelector<HTMLDivElement>('#game-container')!

	const mapSelector = setupMapSelector(root);
	const mapSelectorDetails = root.querySelector<HTMLDetailsElement>('#map-selector')!;

	let uiUpdateInterval: number | null = null;

	const stopUiUpdater = () => {
		if (uiUpdateInterval) {
			clearInterval(uiUpdateInterval);
			uiUpdateInterval = null;
		}
	};

	const showGameActions = () => {
		initialActions.classList.add('hidden');
		gameActions.classList.remove('hidden');
		gameContainer.classList.remove('hidden');
		// Also hide context-specific buttons to ensure a clean state
		const startBtn = document.getElementById('btn-start_tournament');
		startBtn?.classList.add('hidden');
		const addLocalBtn = document.getElementById('btn-add-local-player');
		addLocalBtn?.classList.add('hidden');
	}

	const showInitialActions = () => {
		initialActions.classList.remove('hidden');
		gameActions.classList.add('hidden');
		// Only hide the container if it has no content
		if (gameContainer.childElementCount === 0) {
			gameContainer.classList.add('hidden');
		} else {
			gameContainer.classList.remove('hidden');
		}
		// Also hide context-specific buttons
		const startBtn = document.getElementById('btn-start_tournament');
		startBtn?.classList.add('hidden');
		const addLocalBtn = document.getElementById('btn-add-local-player');
		addLocalBtn?.classList.add('hidden');
	}

	const startUiUpdater = () => {
		if (uiUpdateInterval) return;

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
				// Keep finished-game/tournament result panels visible
				if (gameContainer.childElementCount > 0) {
					initialActions.classList.remove('hidden');
					gameActions.classList.add('hidden');
					gameContainer.classList.remove('hidden');
				} else {
					showInitialActions();
				}
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

			// --- Add Local Player visibility + wiring ---
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
						// In a custom lobby and game not started yet -> show
						// clear wiring when game starts
						wiredLocalPlayerForGameId = null;
					} else if (isCustomLobby(game) || isMatchmaking(game)) {
						addBtn?.classList.remove('hidden');

						// Wire the button exactly once per game_id
						if (wiredLocalPlayerForGameId !== game.game_id) {
							try {
								wireLocalPlayerButton(game);
								wiredLocalPlayerForGameId = game.game_id;
							} catch (e) {
								console.warn('Failed to wire Add Local Player button:', e);
							}
						}
					} else {
						// Not a custom lobby (matchmaking/tournament lobbies) -> hide
						addBtn?.classList.add('hidden');
					}
				} else {
					// No game yet
					if (pendingCustomLobby) {
						addBtn?.classList.remove('hidden');
					} else {
						addBtn?.classList.add('hidden');
					}
					// clear wiring when no game
					wiredLocalPlayerForGameId = null;
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
		if (user?.id) {
			// Automatically try to reconnect if the user is already in a game
			await run('reconnect');
		}
	})()

	// Keep "Add local player" visible while we're creating a custom lobby
	let pendingCustomLobby = false;
	// Track which game_id we've wired the Add Local Player button for
	let wiredLocalPlayerForGameId: number | null = null

	// Helper to normalize lobby type checks
	function isCustomLobby(game: any): boolean {
		const t = game?.lobby_type;
		// support number enums and strings; accept COMMON custom names
		const name = typeof t === 'number' ? (LobbyType as any)[t] : String(t).toUpperCase();
		return name === 'CUSTOM' || name === 'CUSTOM_LOBBY' || name === 'LOBBY';
	}

	function isMatchmaking(game: any): boolean {
		const t = game?.lobby_type;
		const name = typeof t === 'number' ? (LobbyType as any)[t] : String(t).toUpperCase();
		return name === 'MATCHMAKING';
	}

	const run = async (mode: 'match' | 'lobby' | 'tournament' | 'reconnect' | 'leave'): Promise<void> => {
		const user = await getSession()
		const user_id = user?.id
		if (!user_id) {
			alert('Your session has ended. Please sign in again.');
			await router.go('/login');
			return;
		}

		//await attempt_reconnect(container, user_id)
		//if (globalThis.game !== undefined) return
		const selectedMap = mapSelector.getSelected();

		const leave_fn = async() => {
			console.log('leave fn');
			stopUiUpdater();
			pendingCustomLobby = false;
			wiredLocalPlayerForGameId = null;
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
				wiredLocalPlayerForGameId = null;
				// Hide map selector immediately to avoid flash
				mapSelectorDetails.classList.add('hidden');
				showGameActions();
				await test_enter_matchmaking(container, user_id, selectedMap);
				startUiUpdater();
				break;
			case 'tournament':
				pendingCustomLobby = false;
				wiredLocalPlayerForGameId = null;
				mapSelectorDetails.classList.add('hidden');
				showGameActions();
				await test_tournament(container, user_id, selectedMap);
				startUiUpdater();
				break;
			case 'lobby':
				// Show button immediately while lobby is being created
				pendingCustomLobby = true;
				wiredLocalPlayerForGameId = null;
				mapSelectorDetails.classList.add('hidden');
				showGameActions();
				await create_custom_lobby(user_id, container, selectedMap);
				startUiUpdater();
				break;
			case 'reconnect':
				pendingCustomLobby = false;
				wiredLocalPlayerForGameId = null;

				// Ensure the container has layout size during reconnect (but keep it visually hidden)
				gameContainer.classList.remove('hidden');
				gameContainer.classList.add('invisible');

				await attempt_reconnect(container, user_id);

				if ((globalThis as any).game || (globalThis as any).tournament) {
					// Hide selector if we reconnected into a lobby/game
					mapSelectorDetails.classList.add('hidden');
					showGameActions();
					// Now reveal the container visually
					gameContainer.classList.remove('invisible');
					startUiUpdater();
				} else {
					// No game to reconnect to -> restore initial UI state
					gameContainer.classList.remove('invisible');
					gameContainer.classList.add('hidden');
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
