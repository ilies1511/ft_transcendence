import { Game } from './game_new.ts';

import type {
	ClientToMatchConnect,
	ClientToGame,
	ClientToMatchLeave,
} from './game_shared/message_types.ts';


import { Effects, GameState }
	from '../../../game_shared/serialization.ts';

import { BaseScene } from './scenes/base.ts';
import { LobbyScene } from './scenes/LobbyScene.ts';
import { GameScene } from './scenes/game_scene.ts';

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

export class LocalPlayer {
	private _socket?: WebSocket = undefined;
	private _id: number;
	public game_id: number;
	public password: string = '';
	public map_name: string;
	private _key_hooks: KeyHook[] = [];

	constructor(
		game: Game,
		display_name: string,
	) {
		this.password = game.password;
		this.map_name = game.map_name;
		this.game_id = game.game_id;

		console.log("GAME: LocalPlayer constructor");
		this._id = game.client_id * - 1;

		this.open_socket = this.open_socket.bind(this);
		this.open_socket();
	}

	public leave() {
		if (!this._socket || this._socket.readyState !== WebSocket.OPEN) {
			this.open_socket();
		}
		if (this._socket && this._socket.readyState == WebSocket.OPEN) {
			const msg: ClientToMatchLeave = {
				client_id: this._id,
				type: 'leave',
				password: this.password,
			};
			try {
				this._socket.send(JSON.stringify(msg));
			} catch {}
		}
		this._cleanup();
	}

	public disconnect() {
		this._cleanup();
	}

	private _cleanup() {
		this._cleanup_key_hooks();
		console.log("Game: LocalPlayer._cleanup()");
	}

	public open_socket() {
		try {
			const route: string = `ws://localhost:5173/game/${this.game_id}`;
			this._socket = new WebSocket(route)

			this._socket.addEventListener("open", (event) => {
				console.log("GAME: Connected to server");
				const msg: ClientToMatchConnect = {
					client_id: this._id,
					type: 'connect',
					password: this.password,
				};
				console.log("sending: ", JSON.stringify(msg));
				this._socket.send(JSON.stringify(msg));
			});

			this._socket.addEventListener("close", () => {
				console.log("GAME: SecondPlayer socket disconnected");
			});
		} catch (e) {
			console.log("GAME: SecondPlayer error: ", e);
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
						client_id: this._id,
						type: "send_input",
						payload: {
							key: match.key,
							type: args.server_type,
						}
					};
					console.log(msg);
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
				{ case: 'ArrowUp', key: 'w' },
				{ case: 'ArrowDown', key: 's' },
				{ case: 'ArrowLeft', key: 'a' },
				{ case: 'ArrowRight', key: 'd' },
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
	}

	public start_game() {
		this._setup_key_hooks();
	}
};
