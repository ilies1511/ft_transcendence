import * as BABYLON from '@babylonjs/core/Legacy/legacy';
//import * as BABYLON from 'babylonjs';
import type { ServerToClientMessage, GameStartInfo } from '../../../game_shared/message_types.ts';
import type { ClientToServerMessage } from '../../../game_shared/message_types';
import type { GameOptions } from '../../../game_shared/message_types';

import { GridMaterial } from '@babylonjs/materials/Grid';
import { FireProceduralTexture } from '@babylonjs/procedural-textures/fire';

import { Effects, vec2, Wall, Ball, Client, GameState }
	from './game_shared/serialization.ts';

import { BaseScene } from './scenes/base.ts';
import { GameScene } from './scenes/game_scene.ts';




//import { Engine, Scene, Mesh, ArcRotateCamera, PointLight, Vector3, HemisphericLight, MeshBuilder, ArcRotateCameraGamepadInput } from "@babylonjs/core";
//const server_ip: string = import.meta.env.VITE_IP;
//const game_port: string = import.meta.env.VITE_GAME_PORT;
const server_ip: string = "localhost";

const game_port: string = "5173";

export class Game {
	private _canvas: HTMLCanvasElement;
	private _engine: BABYLON.Engine;

	private _scenes: BaseScene[] = [];

	private _game_scene: GameScene;


	//private _sphere: BABYLON.Mesh;

	private _meshes: Map<number, BABYLON.Mesh> = new Map<number, BABYLON.Mesh>;

	private _start_info: GameStartInfo | undefined = undefined;

	private _last_server_msg: MessageEvent<ServerToClientMessage> | null = null;

	private _socket: WebSocket;
	private _id: number;

	public options: GameOptions;

	constructor(
		id: number, //some number that is unique for each client, ideally bound to the account
		container: HTMLElement,
		options: GameOptions,
	) {
		this._process_msg = this._process_msg.bind(this);
		this._rcv_msg = this._rcv_msg.bind(this);
	
		console.log("GAME: game constructor");
		this._id = id;
		this.options = options;

		this._open_socket();

		this._canvas = this._createCanvas();
		container.appendChild(this._canvas);
	
		this._engine = new BABYLON.Engine(this._canvas, true);

		this._game_scene = new GameScene(this._engine, this._canvas);
		this._game_scene.active = true;
		this._scenes.push(this._game_scene);

	
		window.addEventListener("keydown", (ev) => {
			if ((ev.key === "I" || ev.key === "i"))
			{
				if (this._game_scene.debugLayer.isVisible()) {
					this._game_scene.debugLayer.hide();
				} else {
					this._game_scene.debugLayer.show();
				}
			}
		});

		this._engine.runRenderLoop(() => {
			this._process_msg();
			for (const scene of this._scenes) {
				if (scene.active) {
					scene.loop();
					scene.render();
				}
			}
		});
	}

	private _open_socket() {
		try {
			//this._socket = new WebSocket("ws://" + server_ip + ":" + game_port + "/game");
			this._socket = new WebSocket('ws://localhost:5173/game')

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

	private _process_msg() {
		//console.log("_process_msg");
		if (this._last_server_msg == null) {
			console.log("no message to process");
			return ;
		}
		const msg: ServerToClientMessage = this._last_server_msg;
		if (msg instanceof ArrayBuffer) {
			/* msg is a game state update */
			console.log("GAME: got ArrayBuffer");
			if (!this._game_scene.active) {
				this._game_scene.active = true;
				/* activate/deactivate other scenes for gameplay */
			}
			const game_state: GameState = GameState.deserialize(msg);
			game_state.balls.forEach((b: Ball) => {
				if (this._meshes.has(b.obj_id)) {
					const cur: BABYLON.Mesh = this._meshes.get(b.obj_id);
					if (!b.dispose) {
						cur.position.x = b.pos.x;
						cur.position.y = b.pos.y;
						cur.position.z = 0;
					} else {
						cur.dispose(true);
						this._meshes.delete(b.obj_id);
						// todo: clean up object from data structs?
					}
				} else {
					const ball: BABYLON.Mesh = BABYLON.MeshBuilder.CreateSphere(
						`sphere_${b.obj_id}`, {diameter: 1}, this._game_scene);
					ball.position.x = b.pos.x;
					ball.position.y = b.pos.y;
					ball.position.z = 0;
					this._meshes.set(b.obj_id, ball);
				}
			});
			game_state.walls.forEach((w: Wall) => {
				if (this._meshes.has(w.obj_id)) {
					const wall: BABYLON.Mesh = this._meshes.get(w.obj_id);
					wall.position.x = w.center.x;
					wall.position.y = w.center.y;
					console.log(wall);
				} else {
					const wall: BABYLON.Mesh = BABYLON.MeshBuilder.CreateBox(
						`wall_${w.obj_id}`,
						{
							width: w.length,
							height: 1,
							depth: 0.5
						},
						this._game_scene
					);
					wall.position.x = w.center.x;
					wall.position.y = w.center.y;
					wall.position.z = 0;
					const default_normal: vec2 = new vec2(0, 1);
					default_normal.unit();
					//todo: rotation
					const normal: vec2 = w.normal;
					normal.unit();
					const dot: number = default_normal.x * normal.x
						+ default_normal.y * normal.y;
					const rot: number = Math.acos(dot);
					wall.rotation.z = rot;
					this._meshes.set(w.obj_id, wall);
				}
			});
			game_state.clients.forEach((c: Client) => {
			});
		} else if (typeof msg === 'string') {
			console.log("GAME: got string: ", msg);
			const json: ServerToClientMessage = JSON.parse(msg);
			console.log("GAME: got ServerToClientMessage object: ", json);
			switch (json.type) {
				case ('game_lobby_update'):
					// todo: have a user UI for the lobby screen while waiting for players
					break ;
				case ('starting_game'):
					//console.log(this._start_info);
					this._start_info = json;
					//todo: render some loading screen or smth like that

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
