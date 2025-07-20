import * as BABYLON from '@babylonjs/core/Legacy/legacy';

//import * as BABYLON from 'babylonjs';
import type {
	ServerToClientMessage,
	ServerToClientJson,
	GameStartInfo,
	ClientToServerMessage,
	GameOptions,
	EnterMatchmakingReq,
	EnterMatchmakingResp,
} from './game_shared/message_types.ts';

//import { GridMaterial } from '@babylonjs/materials/Grid.ts';
//import { FireProceduralTexture } from '@babylonjs/procedural-textures/fire';

import * as GUI from '@babylonjs/gui';

// import { Effects, GameState }
// 	from '../game_shared/serialization.ts';

import { Effects, GameState }
	from '../../../game_shared/serialization.ts';

import { ClientVec2 } from './objects/ClientVec2.ts';
import { ClientWall } from './objects/ClientWall.ts';
import { ClientBall } from './objects/ClientBall.ts';
import { ClientClient } from './objects/ClientClient.ts';

import { BaseScene } from './scenes/base.ts';
import { GameScene } from './scenes/game_scene.ts';



const server_ip: string = "localhost";

const game_port: string = "5173";

export class Game {
	private _canvas: HTMLCanvasElement;
	private _engine: BABYLON.Engine;

	private _game_scene: GameScene;

	private _active_scene: BaseScene;


	//private _sphere: BABYLON.Mesh;


	private _start_info: GameStartInfo | undefined = undefined;

	private _last_server_msg: MessageEvent<ServerToClientMessage> | null = null;

	private _socket: WebSocket;
	private _id: number;

	public options: GameOptions;
	public game_id: number;

	constructor(
		id: number, //some number that is unique for each client, ideally bound to the account
		container: HTMLElement,
		options: GameOptions,
		game_id: number,
	) {
		this.game_id = game_id;
		this._process_msg = this._process_msg.bind(this);
		this._rcv_msg = this._rcv_msg.bind(this);
		this._key_up_handler = this._key_up_handler.bind(this);
		this._key_down_handler = this._key_down_handler.bind(this);


		console.log("GAME: game constructor");
		this._id = id;
		this.options = options;

		this._open_socket();

		this._canvas = this._createCanvas();
		container.appendChild(this._canvas);

		this._engine = new BABYLON.Engine(this._canvas, true);


		this._game_scene = new GameScene(this._engine, this._canvas);

		this._active_scene = this._game_scene;

		this._engine.runRenderLoop(() => {
			this._process_msg();
			this._active_scene.render();
		});
	}

	private _open_socket() {
		try {
			console.log("game id: ", this.game_id);
			const route: string = `ws://localhost:5173/game/${this.game_id}`;
			console.log("rout: ", route);
			this._socket = new WebSocket(route)

			this._socket.binaryType = "arraybuffer";

			this._socket.addEventListener("open", (event) => {
				console.log("GAME: Connected to server");
				const msg: ClientToServerMessage = {
					type: 'search_game',
					player_id: this._id,
					payload: {
						options: this.options
					}
				};
				console.log("sending: ", JSON.stringify(msg));
				this._socket.send(JSON.stringify(msg));
			});

			this._socket.onmessage = (
				event: MessageEvent<ServerToClientMessage>) => this._rcv_msg(event);
			this._socket.addEventListener("close", () => {
				console.log("GAME: Disconnected");
			});
		} catch (e) {
			console.log("GAME: error: ", e);
		}
	}

	private _key_up_handler(event: KeyboardEvent) {
		const msg: ClientToServerMessage = {
			type: "send_input",
			player_id: this._id,
			game_id: this._start_info.game_id,
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
		const msg: ClientToServerMessage = {
			type: "send_input",
			player_id: this._id,
			game_id: this._start_info.game_id,
			payload: {
				key: "",
				type: "down",
			}
		}
		if (event.key.toLowerCase() === "w") {
			msg.payload.key = "w";
		} else if (event.key === "a") {
			msg.payload.key = "a";
		} else if (event.key === "s") {
			msg.payload.key = "s";
		} else if (event.key === "d") {
			msg.payload.key = "d";
		} else if (event.key === "r") {
			msg.payload.key = "r";
			msg.payload.type = "reset";
		} else {
			return ;
		}
		console.log("key down ", msg.payload.key);
		this._socket.send(JSON.stringify(msg));
	}

	private _start_game() {
		//console.log(this._start_info);
		//todo: render some loading screen or smth like that
		window.addEventListener("keyup", this._key_up_handler);
		window.addEventListener("keydown", this._key_down_handler);
	}

	private _process_msg() {
		//console.log("_process_msg");
		if (this._last_server_msg == null) {
			console.log("GAME: no message to process");
			return ;
		}
		const msg: ServerToClientMessage = this._last_server_msg;
		if (msg instanceof ArrayBuffer) {
			/* msg is a game state update */
			//console.log("GAME: got ArrayBuffer");
			this._active_scene = this._game_scene;
			this._game_scene.update(GameState.deserialize(msg));
		} else if (typeof msg === 'string') {
			console.log("GAME: got string: ", msg);
			const json: ServerToClientJson = JSON.parse(msg);
			console.log("GAME: got ServerToClientMessage object: ", json);
			switch (json.type) {
				case ('game_lobby_update'):
					// todo: have a user UI for the lobby screen while waiting for players
					break ;
				case ('starting_game'):
					this._start_info = json as GameStartInfo;
					this._start_game();
					break ;
			}
		} else {
			console.log("GAME: Error: unknown message type recieved: ", typeof msg);
		}
		this._last_server_msg = null;
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
}
