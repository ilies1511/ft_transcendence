import * as BABYLON from '@babylonjs/core/Legacy/legacy';

import { is_unloading } from './globals.ts';
import { get_password_from_user } from './placeholder_globals.ts';

import { GameApi } from './GameApi.ts';

//import * as BABYLON from 'babylonjs';
import type {
	ServerToClientMessage,
	LobbyToClient,
	LobbyToClientJson,
	GameStartInfo,
	ClientToMatch,
	ClientToMatchConnect,
	ClientToGame,
	ClientToMatchLeave,
	GameToClientFinish,
	ServerError,
	GameOptions,
	EnterMatchmakingReq,
	EnterMatchmakingResp,
	LobbyInvite,
} from './game_shared/message_types.ts';


import { Effects, GameState }
	from '../../../game_shared/serialization.ts';

import { BaseScene } from './scenes/base.ts';
import { LobbyScene } from './scenes/LobbyScene.ts';
import { GameScene } from './scenes/game_scene.ts';



export class Game {
	private _canvas: HTMLCanvasElement;
	private _engine: BABYLON.Engine;

	private _lobby_scene: LobbyScene;
	private _game_scene: GameScene;

	private _active_scene: BaseScene;
	public finished: boolean = false;


	//private _sphere: BABYLON.Mesh;


	private _last_server_msg: LobbyToClient | null = null;

	private _socket?: WebSocket = undefined;
	private _id: number;

	public game_id: number;
	public password: string = '';
	public container: HTMLElement;

	public map_name: string;

	private _password_attempts: number = 3;

	constructor(
		id: number, //some number that is unique for each client, ideally bound to the account
		container: HTMLElement,
		game_id: number,
		map_name: string,
		password: string,
	) {
		this.password = password;
		this.map_name = map_name;

		this.container = container;

		this.game_id = game_id;
		this._process_msg = this._process_msg.bind(this);
		this._rcv_msg = this._rcv_msg.bind(this);
		this._key_up_handler = this._key_up_handler.bind(this);
		this._key_down_handler = this._key_down_handler.bind(this);

		console.log("GAME: game constructor");
		this._id = id;

		this._canvas = this._createCanvas();
		container.appendChild(this._canvas);

		this._engine = new BABYLON.Engine(this._canvas, true);

		this._lobby_scene = new LobbyScene(this._engine, this._canvas);
		this._game_scene = new GameScene(this._engine, this._canvas);

		this._active_scene = this._lobby_scene;
		this._engine.runRenderLoop(() => {
			this._process_msg();
			this._active_scene.render();
		});
		this._open_socket = this._open_socket.bind(this);
		this._open_socket();
	}

	public lobby_invite_data(): LobbyInvite {
		const invite: LobbyInvite = {
			map_name: this.map_name,
			lobby_password: this.password,
			lobby_id: this.game_id,
		};
		return (invite);
	}

	private _handle_join_err(error: ServerError) {
		switch (error) {
			case (''):
				return ;
			case ('Full'):
			case ('Internal Error'):
			case ('Invalid Map'):
			case ('Not Found'):
				break ;
			case ('Invalid Password'):
				break ;
			case ('Invalid Request'):
				throw ("Game: Server answered with 'Invalid Request' to join request?");
			default:
				console.log("Game: join error unsupported: ", error);
				throw (error);
		}
	}

	public leave() {
		if (this.finished) {
			this._cleanup();
			return ;
		}
		this.finished = true;
		if (this._socket.readyState !== WebSocket.OPEN) {
			this._open_socket();
		}
		if (this._socket.readyState == WebSocket.OPEN) {
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
		console.log("Game: cleanup()");
		this._game_scene.cleanup();
		this._lobby_scene.cleanup();
		this._engine.dispose();
		this.container.removeChild(this._canvas);
		this._engine.stopRenderLoop();
		this._socket.close();
		this.container.innerHTML = '';
	}

	private _open_socket() {
		try {
			if (this.finished) {
				return ;
			}
			console.log("game id: ", this.game_id);
			const route: string = `ws://localhost:5173/game/${this.game_id}`;
			this._socket = new WebSocket(route)
			this._socket.binaryType = "arraybuffer";

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

			this._socket.onmessage = (
				event: MessageEvent<LobbyToClient>) => this._rcv_msg(event);
			this._socket.addEventListener("close", () => {
				console.log("GAME: Disconnected");
				if (!this.finished && !is_unloading) {
					console.log("GAME: Attempting reconnect..");
					this._open_socket();
				} else {
				}
			});
		} catch (e) {
			console.log("GAME: error: ", e);
		}
	}

	private _key_up_handler(event: KeyboardEvent) {
		const msg: ClientToGame = {
			client_id: this._id,
			type: "send_input",
			payload: {
				key: "",
				type: "up",
			}
		}
		console.log("key event: ", event);
		switch (event.code) {
			case "KeyW":
				msg.payload.key = "w";
				break;
			case "KeyA":
				msg.payload.key = "a";
				break;
			case "KeyS":
				msg.payload.key = "s";
				break;
			case "KeyD":
				msg.payload.key = "d";
				break;
			default:
				return ;
		}
		console.log("key up ", msg.payload.key);
		this._socket.send(JSON.stringify(msg));
	}

	private _key_down_handler(event: KeyboardEvent) {
		const msg: ClientToGame = {
			type: "send_input",
			client_id: this._id,
			payload: {
				key: "",
				type: "down",
			}
		}
		switch (event.code) {
			case "KeyW":
				msg.payload.key = "w";
				break;
			case "KeyA":
				msg.payload.key = "a";
				break;
			case "KeyS":
				msg.payload.key = "s";
				break;
			case "KeyD":
				msg.payload.key = "d";
				break;
			case "KeyR":
				msg.payload.key = "r";
				msg.payload.type = "reset";
				break;
			default:
				return ;
		}
		console.log("key down ", msg.payload.key);
		this._socket.send(JSON.stringify(msg));
	}

	private _start_game() {
		this._active_scene = this._game_scene;
		window.addEventListener("keyup", this._key_up_handler);
		window.addEventListener("keydown", this._key_down_handler);
	}

	private _process_server_error(error: ServerError) {
		console.log("Game: Got error from server: ", error);
		switch (error) {
			case ('Invalid Request'):
				break ;
			case ('Invalid Password'):
				this.finished = true;
				this.disconnect();
				break ;
			case ('Full'):
			case ('Invalid Map'):
			case ('Not Found'):
				this.finished = true;
				this.disconnect();
				break ;
			case ('Internal Error'):
				break ;
			case (''):
				break ;
			default:
				throw ('Game: Got not implemented server error');
		}
	}


	private _process_msg() {
		//console.log("_process_msg");
		if (this._last_server_msg == null) {
			//console.log("GAME: no message to process");
			return ;
		}
		const msg: LobbyToClient = this._last_server_msg;
		if (msg instanceof ArrayBuffer) {
			if (this._active_scene !== this._game_scene) {
				this._start_game();
			}
			/* msg is a game state update */
			//console.log("GAME: got ArrayBuffer");
			this._game_scene.update(GameState.deserialize(msg));
		} else if (typeof msg === 'string') {
			console.log("GAME: got string: ", msg);
			const json: LobbyToClientJson = JSON.parse(msg) as LobbyToClientJson;
			console.log("GAME: got ServerToClientMessage object: ", json);
			switch (json.type) {
				case ('game_lobby_update'):
					if (this._active_scene !== this._lobby_scene) {
						this._active_scene = this._lobby_scene;
					}
					this._lobby_scene.update(json);
					break ;
				case ('error'):
					this._process_server_error(json.msg);
					break ;
				case ('finish'):
					this._finish_game(json);
					break ;
				default:
					throw ("Got not implemented msg type from server: ", msg);
			}
		} else {
			console.log("GAME: Error: unknown message type recieved: ", typeof msg);
		}
		this._last_server_msg = null;
	}

	private _finish_game(msg: GameToClientFinish) {
		console.log("Game: _finish_game()");
		this.finished = true;
		this.disconnect();
		console.log(msg);
	}

	private _rcv_msg(event: MessageEvent<ServerToClientMessage>): undefined {
		//console.log("GAME: recieved msg");
		const data = event.data;
		//console.log(data);
		this._last_server_msg = data;
	}

	private _createCanvas(): HTMLCanvasElement {
		//Commented out for development
		document.documentElement.style["overflow"] = "hidden";
		document.documentElement.style.overflow = "hidden";
		document.documentElement.style.width = "100%";
		document.documentElement.style.height = "100%";
		document.documentElement.style.margin = "0";
		document.documentElement.style.padding = "0";
		document.body.style.overflow = "hidden";
		document.body.style.width = "100%";
		document.body.style.height = "100%";
		document.body.style.margin = "0";
		document.body.style.padding = "0";

		//create the canvas html element and attach it to the webpage
		this._canvas = document.createElement("canvas");
		this._canvas.style.width = "100%";
		this._canvas.style.height = "100%";
		this._canvas.id = "gameCanvas";
		document.body.appendChild(this._canvas);
		return (this._canvas);
	}
};
