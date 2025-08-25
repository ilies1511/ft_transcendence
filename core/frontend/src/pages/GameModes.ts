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
	<div class="w-full max-w-5xl mx-auto p-6 space-y-6">
		<!-- controls -->
		<div class="flex flex-col gap-4">
			<!-- Map Selector -->
			<details id="map-selector" class="rounded border border-[#543b43] bg-[#1e1518]">
				<summary class="cursor-pointer select-none px-4 py-3 text-white flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="font-semibold">Choose Map</span>
						<span class="opacity-70">(Selected: <span id="selected-map-label" class="underline">default_3m_30p</span>)</span>
					</div>
				</summary>
				<div id="map-grid" class="p-4 space-y-6"></div>
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
					<button id="btn-add-local-player" class="hidden rounded bg-blue-400 px-4 py-2 text-white cursor-pointer">Add Local Player</button>
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

type MapGroup = {
    name: string;
    maps: MapInfo[];
};

// Exposed API for the selector
type MapSelectorApi = {
    getSelected: () => string;
};

// Persist selected map between visits
const MAP_STORAGE_KEY = 'ftt:selectedMap';

const MAP_GROUPS: MapGroup[] = [
    {
        name: 'Default',
        maps: [
            { id: 'default', name: 'Standard', players: 2 },
            { id: 'default_3m_30p', name: '3m/30HP', players: 2 },
            { id: 'default_10m_100p', name: '10m/100HP', players: 2 },
        ],
    },
    {
        name: 'Big Plus',
        maps: [
            { id: 'BigPlus2', name: '2 Players', players: 2 },
            { id: 'BigPlus2_3m_30p', name: '2 Players (3m/30HP)', players: 2 },
            { id: 'BigPlus2_10m_100p', name: '2 Players (10m/100HP)', players: 2 },
            { id: 'BigPlus4', name: '4 Players', players: 4 },
            { id: 'BigPlus4_3m_30p', name: '4 Players (3m/30HP)', players: 4 },
            { id: 'BigPlus4_10m_100p', name: '4 Players (10m/100HP)', players: 4 },
        ],
    },
    {
        name: 'Diamond',
        maps: [
            { id: 'Diamond2', name: '2 Players', players: 2 },
            { id: 'Diamond2_3m_30p', name: '2 Players (3m/30HP)', players: 2 },
            { id: 'Diamond2_10m_100p', name: '2 Players (10m/100HP)', players: 2 },
        ],
    },
    {
        name: 'Octa Pong',
        maps: [
            { id: 'OctaPong2', name: '2 Players', players: 2 },
            { id: 'OctaPong2_3m_30p', name: '2 Players (3m/30HP)', players: 2 },
            { id: 'OctaPong2_10m_100p', name: '2 Players (10m/100HP)', players: 2 },
            { id: 'OctaPong4', name: '4 Players', players: 4 },
            { id: 'OctaPong4_3m_30p', name: '4 Players (3m/30HP)', players: 4 },
            { id: 'OctaPong4_10m_100p', name: '4 Players (10m/100HP)', players: 4 },
        ],
    },
    {
        name: 'Simple Square',
        maps: [
            { id: 'SimpleSquare2', name: '2 Players', players: 2 },
            { id: 'SimpleSquare2_3m_30p', name: '2 Players (3m/30HP)', players: 2 },
            { id: 'SimpleSquare2_10m_100p', name: '2 Players (10m/100HP)', players: 2 },
            { id: 'SimpleSquare4', name: '4 Players', players: 4 },
            { id: 'SimpleSquare4_3m_30p', name: '4 Players (3m/30HP)', players: 4 },
            { id: 'SimpleSquare4_10m_100p', name: '4 Players (10m/100HP)', players: 4 },
        ],
    },
];

const ALL_MAPS: MapInfo[] = MAP_GROUPS.flatMap(g => g.maps);

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
    return IMAGE_ALIAS[mapId] ?? mapId;
}

function renderMapCards(grid: HTMLElement, selectedId: string) {
	grid.innerHTML = MAP_GROUPS.map(group => `
		<div>
			<h3 class="text-lg font-semibold text-white mb-3">${group.name}</h3>
			<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
				${group.maps.map(m => `
					<button
						type="button"
						data-map-id="${m.id}"
						class="cursor-pointer group rounded overflow-hidden border ${m.id === selectedId ? 'border-[#0bda8e]' : 'border-[#543b43]'} bg-[#271c1f] hover:border-[#0bda8e] transition-colors">
						<div class="aspect-video bg-[#1b1214] relative">
							<img
								data-map-img
								alt="${m.name}"
								src="/maps/${getPreviewImageId(m.id)}.jpg"
								class="w-full h-full object-cover block"
							/>
							<div class="absolute top-1 right-1 text-xs bg-black/60 text-white px-2 py-0.5 rounded">${m.players}P</div>
						</div>
						<div class="px-3 py-2 text-left">
							<div class="text-white text-sm">${m.name}</div>
						</div>
					</button>
				`).join('')}
			</div>
		</div>
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

function setupMapSelector(root: HTMLElement): MapSelectorApi {
	const grid = root.querySelector<HTMLElement>('#map-grid');
	const label = root.querySelector<HTMLElement>('#selected-map-label');
	const detailsEl = root.querySelector<HTMLDetailsElement>('#map-selector');
	if (!grid || !label) {
		return { getSelected: () => 'default_3m_30p' };
	}

	const loadSaved = (): string | null => {
		try {
			const v = localStorage.getItem(MAP_STORAGE_KEY);
			return v && ALL_MAPS.some(m => m.id === v) ? v : null;
		} catch {
			return null;
		}
	};

	const save = (id: string) => {
		try { localStorage.setItem(MAP_STORAGE_KEY, id); } catch {}
	};

	let selectedId = loadSaved() ?? 'default_3m_30p';
	label.textContent = selectedId;

	const onSelect = (mapId: string) => {
		selectedId = mapId;
		label.textContent = mapId;
		save(selectedId);

		// re-render cards with selection state
		renderMapCards(grid, selectedId);
		wireButtons();

		// collapse the selector after choosing
		if (detailsEl) detailsEl.open = false;
	};

	const wireButtons = () => {
		grid.querySelectorAll<HTMLButtonElement>('button[data-map-id]').forEach(button => {
			button.addEventListener('click', () => onSelect(button.dataset.mapId!));
		});
		const tournamentBtn = document.getElementById('btn-create-tournament') as HTMLButtonElement | null;
		const selectedMap = ALL_MAPS.find(m => m.id === selectedId);
		if (tournamentBtn && selectedMap) {
			tournamentBtn.disabled = selectedMap.players > 2;
			tournamentBtn.title = selectedMap.players > 2 ? 'Tournaments are 2-player only' : 'Create a tournament';
		}
	};

	// initial render with restored selection
	renderMapCards(grid, selectedId);
	wireButtons();

	return {
		getSelected: () => selectedId,
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
		const mapInfo = ALL_MAPS.find(m => m.id === selectedMap);
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
