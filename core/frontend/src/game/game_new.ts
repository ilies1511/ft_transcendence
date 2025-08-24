import * as BABYLON from '@babylonjs/core/Legacy/legacy';

import { is_unloading } from './globals.ts';

import { tournament_running } from './Tournament.ts';

import { GameApi } from './GameApi.ts';

import { LocalPlayer } from './LocalPlayer.ts';

import { showToast } from '../ui/toast-interface.ts';

//import * as BABYLON from 'babylonjs';
import type {
	ClientToGame,
	ClientToMatchConnect,
	ClientToMatchLeave,
	GameToClientFinish,
	LobbyDisplaynameResp,
	LobbyInvite,
	LobbyToClient,
	LobbyToClientJson,
	ReconnectResp,
	ServerError
} from './game_shared/message_types.ts';


import { LobbyType } from '../../../game_shared/message_types.ts';
import { GameState } from '../../../game_shared/serialization.ts';


import { BaseScene } from './scenes/base.ts';
import { GameScene } from './scenes/game_scene.ts';
import { LobbyScene } from './scenes/LobbyScene.ts';

type KeySet = {
	case: string;
	key: string;
}[];

type KeyType = 'down' | 'up' | 'reset';

type KeyPressType = "keydown" | "keyup";
type KeyHookGeneratorArgs = {
	press_type: KeyPressType;
	server_type: KeyType;
	key_set: KeySet;
};

type KeyHook = {
	type: KeyPressType,
	handler: (event: KeyboardEvent) => void
};

export class Game {
	private _canvas: HTMLCanvasElement;
	private _engine: BABYLON.Engine;

	private _lobby_scene: LobbyScene;
	private _game_scene: GameScene;

	private _active_scene: BaseScene;

	public finished: boolean = false;

	private _cleaned: boolean = false;
	// If this is true don't use the object anymore.
	// globalThis.game should also be !== this
	public is_cleaned(): boolean { return (this._cleaned)}

	//private _sphere: BABYLON.Mesh;

	//TODO: update1 for user leave notifications
	 private _last_server_msg: ArrayBuffer | null = null;
	private _msg_queue: LobbyToClient[] = [];


	private _socket?: WebSocket = undefined;
	public client_id: number;

	public game_id: number;
	public password: string = '';
	public container: HTMLElement | null;

	public map_name: string;

	private _key_hooks: KeyHook[] = [];

	private _local_player?: LocalPlayer = undefined;

	public lobby_type: LobbyType;

	public container_selector: string = '#game-container';

	private _display_names: Map<number, string> | undefined = undefined;

	private _next_socket_timeout: number = 500;

	private _next_close_handler: NodeJS.Timeout | undefined = undefined;

	constructor(
		id: number, //some number that is unique for each client, ideally bound to the account
		container: HTMLElement,
		game_id: number,
		map_name: string,
		password: string,
		lobby_type: LobbyType,
	) {
		if (globalThis.game !== undefined) {
			console.log("WARNING: Game constructor called while globalThis.game !== undefined");
			// If this is the same lobby, don't send a 'leave' to the server.
			// Just disconnect the previous instance to avoid the server treating
			// it as a real leave during transition.
			if (globalThis.game.game_id === game_id) {
				console.log("WARNING: Same lobby id; disconnecting previous instance without leaving");
				globalThis.game.disconnect();
			} else {
				console.log("WARNING: Different lobby; leaving previous lobby");
				globalThis.game.leave();
			}
			globalThis.game = undefined;
		}
		this.password = password;
		this.map_name = map_name;
		this.container = container;
		container.innerHTML = '';
		this.lobby_type = lobby_type;
		this.game_id = game_id;
		this._process_msg = this._process_msg.bind(this);
		this._rcv_msg = this._rcv_msg.bind(this);


		console.log("GAME: game constructor");
		this.client_id = id;

		this._canvas = this._createCanvas();
		//container.appendChild(this._canvas);

		this._engine = new BABYLON.Engine(this._canvas, true);

		this._lobby_scene = new LobbyScene(this._engine, this._canvas);
		this._game_scene = new GameScene(this._engine, this._canvas);

		this._active_scene = this._lobby_scene;
		this._engine.runRenderLoop(() => {
			if (this.finished) return; //prevents ghost loops
			this._process_msg();
			if (this._ensure_attached() && !this.finished) {
				this._active_scene.render();
			}
		});

		this._on_full_screen_change = this._on_full_screen_change.bind(this);
		this._on_resize = this._on_resize.bind(this);
		document.addEventListener('fullscreenchange', this._on_full_screen_change);
		window.addEventListener('resize', this._on_resize);

		const full_screen_btn: HTMLButtonElement = document.createElement('button');

		full_screen_btn.type = 'button';
		full_screen_btn.setAttribute('aria-label', 'Toggle fullscreen');
		full_screen_btn.className =
			'absolute top-3 right-3 z-50 px-3 py-1 rounded-xl text-sm ' +
			'bg-[rgba(0,0,0,0.55)] text-white hover:bg-[rgba(0,0,0,0.7)]' +
			'transition cursor-pointer';
		full_screen_btn.textContent = '[ ]';
		full_screen_btn.onclick = () => this.toggle_fullscrenn();
		container.appendChild(full_screen_btn);

		this._open_socket = this._open_socket.bind(this);
		this._open_socket();
		globalThis.game = this;
	}

	private _ensure_attached(): boolean {
		if (this.finished) {
			return (this._get_container() !== null);
		}
		const container: HTMLElement | null = this._get_container();

		if (!container) {
			return false;
		}

		if (this._canvas && !document.contains(this._canvas)) {
			container.appendChild(this._canvas);
		}
		if (!this._canvas || !container.contains(this._canvas)) {
			this._canvas = this._createCanvas();
		}
		return (true);
	}

	private _get_container(): HTMLElement | null {
		if (this.container && document.contains(this.container)) {
			//console.log("game container unchanged");
			return (this.container);
		}
		this.container = document.querySelector(this.container_selector);
		if (!this.container) {
			console.log("Warning: could not get game container");
			return (null);
		}
		return (this.container);
	}


	public lobby_invite_data(): LobbyInvite {
		const invite: LobbyInvite = {
			map_name: this.map_name,
			lobby_password: this.password,
			lobby_id: this.game_id,
			lobby_type: this.lobby_type,
			valid: true,
		};
		return (invite);
	}

	public leave() {
		if (this.finished) {
			this._cleanup();
			return ;
		}
		this.finished = true;
		if (!this._socket || this._socket.readyState !== WebSocket.OPEN) {
			this._open_socket();
		}
		if (this._socket && this._socket.readyState == WebSocket.OPEN) {
			const msg: ClientToMatchLeave = {
				client_id: this.client_id,
				type: 'leave',
				password: this.password,
			};
			try {
				this._socket.send(JSON.stringify(msg));
			} catch {}
		}

		if (this._local_player) {
			this._local_player.leave();
		}
		this._cleanup();
	}

	public disconnect() {
		this.finished = true;
		if (this._local_player) {
			this._local_player.disconnect();
		}
		this._cleanup();
		globalThis.tournament?.render_tournament_state();
	}

	private _cleanup() {
		if (this._cleaned) {
			console.log("WARNING: Game cleanup called when the game was allready cleaned");
			return ;
		}

		document.removeEventListener('fullscreenchange', this._on_full_screen_change);
		window.removeEventListener('resize', this._on_resize);

		this._cleanup_key_hooks();
		console.log("Game: cleanup()");
		this._game_scene.cleanup();
		this._lobby_scene.cleanup();
		this._engine.stopRenderLoop();
		this._engine.dispose();
		if (this._canvas?.parentElement) {
			try {
				this._canvas.parentElement.removeChild(this._canvas);
			} catch {}
		}
		this._engine.stopRenderLoop();
		if (this._socket) {
			this._socket.close();
		}
		if (this.container) {
			this.container.innerHTML = '';
		}
		if (globalThis.game === this) {
			globalThis.game = undefined;
		} else {
			console.log("WARNING: Game cleanup(): globalThis.game was not this game object");
		}
		this._cleaned = true;
	}

	private _open_socket() {
		try {
			if (this.finished) {
				return ;
			}
			console.log("GAME: Attempting (re)connect..");
			console.log("game id: ", this.game_id);
			const wsBase =
				(location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
			const route: string = `${wsBase}/game/${this.game_id}`;
			this._socket = new WebSocket(route)
			this._socket.binaryType = "arraybuffer";

			this._socket.addEventListener("open", (event) => {
				console.log("GAME: Connected to server");
				const msg: ClientToMatchConnect = {
					client_id: this.client_id,
					type: 'connect',
				};
				console.log("sending: ", JSON.stringify(msg));
				this._socket.send(JSON.stringify(msg));
			});

			this._socket.onmessage = (
				event: MessageEvent<LobbyToClient>) => this._rcv_msg(event);
			this._socket.addEventListener("close", () => {
				console.log("GAME: Disconnected");
				if (!this.finished && !is_unloading) {
					if (this._next_close_handler) {
						clearTimeout(this._next_socket_timeout);
					}
					if (this._next_socket_timeout > 60000) {
						this.disconnect();
					} else {
						this._next_close_handler = setTimeout(() => {
								this._open_socket();
							}, this._next_socket_timeout
						);
						this._next_socket_timeout *= 2;
					}
				} else {
				}
			});
		} catch (e) {
			console.log("GAME: error: ", e);
		}
	}

	private _cleanup_key_hooks() {
		if (!this._key_hooks)
			return ;
		for (const { type, handler } of this._key_hooks) {
			window.removeEventListener(type, handler);
		}
		this._key_hooks = [];
	}

	private _generate_key_handler(args: KeyHookGeneratorArgs) {
		const key_hook: KeyHook = {
			type: args.press_type,
			handler:
				(event: KeyboardEvent) => {
					if (!this._socket) {
						return ;
					}

					const match = args.key_set.find(k => k.case === event.code);
					if (!match) {
						return ;
					}

					const msg: ClientToGame = {
						client_id: this.client_id,
						type: "send_input",
						payload: {
							key: match.key,
							type: args.server_type,
						}
					};
					this._socket.send(JSON.stringify(msg));
				}
		};
		window.addEventListener(key_hook.type, key_hook.handler);
		this._key_hooks.push(key_hook);
	}

	private _setup_key_hooks() {
		const movement_key_sets: KeySet[] = [];
		movement_key_sets.push(
			[
				{ case: 'KeyW', key: 'w' },
				{ case: 'KeyA', key: 'a' },
				{ case: 'KeyS', key: 's' },
				{ case: 'KeyD', key: 'd' },
			]
		);
		const types: KeyType [] = [ 'up', 'down'];
		for (const type of types) {
			for (const movement_key_set of movement_key_sets) {
				const key_hook_generator_args: KeyHookGeneratorArgs = {
					server_type: type,
					press_type: 'keydown',
					key_set: movement_key_set,
				};
				if (type == 'up') {
					key_hook_generator_args.press_type = 'keyup';
				}
				this._generate_key_handler(key_hook_generator_args);
			}
		}
		const key_hook_generator_args: KeyHookGeneratorArgs = {
			server_type: 'reset',
			press_type: 'keydown',
			key_set: [ {case: 'KeyR', key: 'r'} ],
		};
		this._generate_key_handler(key_hook_generator_args);
	}

	private	_start_game() {
		this.enter_fullscreen();
		const display_names_promise: Promise<LobbyDisplaynameResp> =
			GameApi.get_display_names(this.game_id);
		display_names_promise.then(names => {
			console.log("Game: got names: ", names);
			if (names.error != '') {
				return ;
			}
			this._display_names = new Map<number, string>;
			for (const player of names.data) {
				this._display_names.set(player.global_id, player.name);
				this._game_scene.score_panel.update_display_name(player.ingame_id, player.name);
			}
		});
		this._setup_key_hooks();
		if (this._local_player) {
			this._local_player.start_game();
		}
		this._active_scene = this._game_scene;
	}

	public static process_server_error(error: ServerError, game?: Game) {
		console.log("Game: Got error from server: ", error);
		switch (error) {
			case ('Invalid Request'):
				break ;
			case ('Invalid Password'):
				if (game) {
					game.finished = true;
					game.disconnect();
				}
				break ;
			case ('Full'):
			case ('Invalid Map'):
			case ('Not Found'):
				if (game && !game.finished) {
					game.finished = true;
					showToast({
						title: 'Could not run game',
					});
				} else if (!game) {
					showToast({
						title: 'Could not run game',
					});
				}
				if (game) {
					game.disconnect();
				}
				break ;
			case ('Allready in game'):
				showToast({
					title: 'You are allready in a game, reconnect and finish or leave your game first.',
				});
				if (game) {
					game.finished = true;
					game.disconnect();
				}
				break ;
			case ('Allready in tournament'):
				showToast({
					title: 'You are allready in a tournament, reconnect and finish or leave the tournament first.',
				});
				if (game) {
					game.finished = true;
					game.disconnect();
				}
				break ;
			case ('Allready started'):
				break ;
			case ('Allready connected in a different session'):
				showToast({
					title: 'You are allready connected to the game/tournament from a different session, disconnect there first to connect here.',
				});
				if (game) {
					game.finished = true;
					game.disconnect();
				}
				break ;
			case ('Internal Error'):
				if (game && !game.finished) {
					game.finished = true;
					showToast({
						title: 'Could not run game',
					});
				}
				if (game) {
					game.leave();
				}
				break ;
			case (''):
				break ;
			default:
				throw ('Game: Got not implemented server error');
		}
	}

	//TODO: update2 for user leave notifications
	private _process_msg(): void {
		if (this.finished) {
			return ;
		}
		if (this._last_server_msg) {
	 		if (this._active_scene !== this._game_scene) {
	 			this._start_game();
	 		}
	 		/* msg is a game state update */
	 		//console.log("GAME: got ArrayBuffer");
	 		this._game_scene.update(GameState.deserialize(this._last_server_msg));
			this._last_server_msg = null;
		}
		while (this._msg_queue.length) {
			if (this.finished) {
				return ;
			}
			const raw = this._msg_queue.shift()!; // never undefined here

			const json = JSON.parse(raw as unknown as string) as LobbyToClientJson;
			console.log("GAME: got", json);

			switch (json.type) {
				case 'game_lobby_update':
					if (this._active_scene !== this._lobby_scene) {
						break ;
					}
					this._lobby_scene.update(json);
					break;

				case 'error':
					Game.process_server_error(json.msg, this);
					break;

				case 'finish':
					// allow any preceding “info” toast to render first
					this.finished = true;
					setTimeout(() => this._finish_game(json), 200);
					break;

				case 'info':
					showToast({
						title: json.text,
					});
					// console.log('SOME PLAYER LEFT THE GAME');
					// setTimeout(() =>
					// 	console.log('still there?', document.body.contains(toastBox)), 50);
					break;

				default:
					throw new Error('Unhandled message type: ' + (json as any).type);
			}
		}
	}

	private _finish_game(msg: GameToClientFinish) {
		console.log("Game: _finish_game() of game ", this.game_id);
		this.finished = true;
		if (this._isFullscreen()) {
			this.exit_fullscreen();
		}


		this.disconnect();
		if (tournament_running > 0) {
			console.log("Game: not showing result since tournament is/was running");
			return ;
		}

		if (this._ensure_attached()) {
			this.container.replaceChildren();

			const formatDuration = (sec: number) => {
				const m = Math.floor(sec / 60);
				const s = Math.floor(sec % 60);
				return `${m}:${s.toString().padStart(2, "0")}`;
			};
			const modeLabel = (mode: LobbyType) => {
				switch (mode) {
					case LobbyType.MATCHMAKING:
						return "Matchmaking Game";
					case LobbyType.CUSTOM:
						return "Private Lobby";
					case LobbyType.TOURNAMENT_GAME:
						return "Tournament Game";
					case LobbyType.TOURNAMENT:
					case LobbyType.INVALID:
						return "";
				}
			};
			const nameFor = (id: number) =>
				this._display_names?.get(id) ?? `Player ${id}`;

			// header
			const header = document.createElement("div");
			header.className = "flex flex-col items-center text-center mb-8 pt-[30px]";
			header.innerHTML = `
				<h2 class="text-5xl text-white mb-1 font-bold">Game Finished</h2>
				<div class="text-sm text-[#b99da6] flex items-center gap-1">
					<span>${modeLabel(msg.mode)}</span>
					<span aria-hidden="true">•</span>
					<span class="underline">Duration: ${formatDuration(msg.duration)}</span>
				</div>
			`;
			this.container.appendChild(header);

			// results table
			const table = document.createElement("table");
			table.className =
				"w-full mx-auto table-fixed border-collapse rounded-2xl overflow-hidden shadow-lg bg-[#221116]";

			// head
			const thead = document.createElement("thead");
			thead.innerHTML = `
				<tr class="bg-[#3a2229] text-[#ca91a3] text-base text-center">
					<th class="w-[33.33%] py-3 px-4 font-medium">#</th>
					<th class="w-[33.33%] py-3 px-4 font-medium">Player</th>
					<th class="w-[33.33%] py-3 px-4 font-medium">Placement</th>
				</tr>
			`;
			table.appendChild(thead);

			// body
			const tbody = document.createElement("tbody");
			tbody.className = "divide-y divide-[#3a2229]/70";

			const placements = [...msg.placements].sort(
				(a, b) => a.final_placement - b.final_placement
			);

			const medal = (place: number) =>
				place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : "";

			for (let i = 0; i < placements.length; i++) {
				const p = placements[i];
				const tr = document.createElement("tr");
				tr.className = "hover:bg-[#302028]/60 transition h-14 text-center";
				tr.innerHTML = `
					<td class="w-[33.33%] py-3 px-4 text-white truncate">${i + 1}</td>
					<td class="w-[33.33%] py-3 px-4 text-white truncate">${nameFor(p.id)}</td>
					<td class="w-[33.33%] py-3 px-4 text-white truncate">
						${p.final_placement} ${medal(p.final_placement)}
					</td>
				`;
				tbody.appendChild(tr);
			}

			table.appendChild(tbody);
			this.container.appendChild(table);
		}

		globalThis.tournament?.render_tournament_state();

		console.log(msg);
	}

	// private _rcv_msg(event: MessageEvent<LobbyToClient>): undefined {
	// 	//console.log("GAME: recieved msg");
	// 	const data = event.data;
	// 	//console.log(data);
	// 	this._last_server_msg = data;
	// }
	//TODO: update3 for user leave notifications
	private _rcv_msg(event: MessageEvent): void {
		// store all incoming frames; do NOT overwrite
		if (event.data instanceof ArrayBuffer) {
			this._last_server_msg = event.data;
		} else {
			this._msg_queue.push(event.data as LobbyToClient);
		}
	}

	private _createCanvas(): HTMLCanvasElement {
		// Keep page layout; do NOT force body to fullscreen here.
		this._canvas = document.createElement("canvas");
		this._canvas.id = "gameCanvas";
		this._canvas.style.width = "100%";
		this._canvas.style.height = "100%";
		this._canvas.style.display = "block";
		// Ensure container can size the canvas


		const container: HTMLElement | null = this._get_container();
		if (!container) {
			console.log("Warning: _createCanvas() called without a valid container");
			return this._canvas;
		}
		container.style.position = container.style.position || 'relative';
		container.appendChild(this._canvas);
		return this._canvas;
	}

	public async add_local_player(display_name: string): Promise<void> {
		console.log("Game: add_local_player()");
		if (this._active_scene !== this._lobby_scene) {
			console.log("Game error: tried to add local player with lobby scene not active, returning..");
			return ;
		}
		if (this._local_player) {
			console.log("Error: Game allready has local player!");
			return ;
		}
		const error: ServerError = await GameApi.join_lobby(this.client_id * -1,
			this.game_id, this.password, display_name);
		if (error != '') {
			console.log("Error: Game: Could not join a local player into lobby: ",
				error, '!');
			return ;
		}
		this._local_player = new LocalPlayer(this, display_name);
	}

	public async reconnect_local_player() {
		if (this._local_player) {
			console.log("Warning: tried to reconnect local player when there was allready one set!");
			console.log("Skipping reconnect for local player..");
			return ;
		}
		console.log("Game: attempting to reconnect local player..");
		const reconnect: ReconnectResp = await GameApi.reconnect(this.client_id* - 1);
		let match_id: number = -1;
		if (reconnect.tournament_id >= 0) {
			console.log("Game Error: foud local player in tournament when reconnecting!");
			return ;
		} else if (reconnect.match_id >= 0) {
			match_id = reconnect.match_id;
		}
		if (match_id != -1) {
			console.log("Game: Reconnecting local player to match with password:" , this.password);
			//todo: solution to recover local player name
			this._local_player = new LocalPlayer(this, "Local player name lost");
			return ;
		}
	}

	private _on_full_screen_change() {
		this._engine.resize();
	};

	private _on_resize(){
		this._engine.resize();
	}

	private _isFullscreen(): boolean {
		return (document.fullscreenElement != null);
	}

	public async enter_fullscreen() {
		const el = this._get_container() || this._canvas;
		if (!el) {
			return;
		}
		try {
			//apperently this is good to prevent issues with safari
			await (el.requestFullscreen?.({ navigationUI: 'hide' }) ?? el.requestFullscreen?.());
		} catch (e) {
			console.log("fullscreen failed: ", e);
		}
	}

	public async exit_fullscreen() {
		try {
			if (document.fullscreenElement) {
				await document.exitFullscreen();
			}
		} catch (e) {
			console.log("exit fullscreen failed: ", e);
		}
	}

	public async toggle_fullscrenn() {
		if (this._isFullscreen()) {
			await this.exit_fullscreen();
		} else {
			await this.enter_fullscreen();
		}
	}
};
