import * as BABYLON from 'babylonjs';
import type { ServerToClientMessage } from '../../game_shared/message_types';
import type { ClientToServerMessage } from '../../game_shared/message_types';
import type { GameOptions } from '../../game_shared/message_types';
import type { BinType } from '../../game_shared/message_types';

//import { Engine, Scene, Mesh, ArcRotateCamera, PointLight, Vector3, HemisphericLight, MeshBuilder, ArcRotateCameraGamepadInput } from "@babylonjs/core";
//const server_ip: string = import.meta.env.VITE_IP;
//const game_port: string = import.meta.env.VITE_GAME_PORT;
const server_ip: string = "localhost";

const game_port: string = "5173";

enum State {
	START = 0,
	GAME = 1,
	END = 2,
}

export class Game {
	private _scene: BABYLON.Scene;
	private _canvas: HTMLCanvasElement;
	private _engine: BABYLON.Engine;
	private _camera: BABYLON.ArcRotateCamera;

	private _sphere: BABYLON.Mesh;

	private _state: number = 0;

	private _next_update_time: number = 0;
	private _update_interval: number = 1000;

	private _socket: WebSocket;
	private _id: number;

	
	constructor(
		id: number, //some number that is unique for each client, ideally bound to the account
		container: HTMLElement
	) {
		console.log("GAME: game constructor");
		this._id = id;

		this._open_socket();
		return ;

		this._next_update_time = Date.now();

		this._canvas = this._createCanvas();
		//document.body.appendChild(this._canvas);
		//document.getElementById('main')?.appendChild(this._canvas);
		container.appendChild(this._canvas);
	
		this._engine = new BABYLON.Engine(this._canvas, true);
		this._scene = new BABYLON.Scene(this._engine);

		this._camera = new BABYLON.ArcRotateCamera(
			"Camera",
			Math.PI / 2,
			Math.PI / 2,
			2,
			BABYLON.Vector3.Zero(),
			this._scene
		);
		this._camera.attachControl(this._canvas, true);

		this._sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: 1}, this._scene);

		const light: BABYLON.PointLight = new BABYLON.PointLight(
			"pointLight", new BABYLON.Vector3(1, 10, 1), this._scene);
	
		window.addEventListener("keydown", (ev) => {
			//if (ev.shiftKey && ev.ctrlKey && ev.altKey &&
			if ((ev.key === "I" || ev.key === "i"))
			{
				if (this._scene.debugLayer.isVisible()) {
					this._scene.debugLayer.hide();
				} else {
					this._scene.debugLayer.show();
				}
			}
		});

		//for now
		this._state = State.GAME;

		this._engine.runRenderLoop(() => {
			this._scene.render();
			this._upate();

		});
	}

	private _open_socket() {
		try {
			//this._socket = new WebSocket("ws://" + server_ip + ":" + game_port + "/game");
			this._socket = new WebSocket('ws://localhost:5173/game')
			
			this._socket.onopen = () => {
			  console.log('[FRONT-END GAME WS] Connected to /game!');
			  this._socket.send('Hello from the game frontend!');
			};
			
			this._socket.onmessage = (event) => {
			  console.log('[FRONT-END GAME WS] Received:', event.data);
			};
			//this._socket.binaryType = "arraybuffer";

			//this._socket.addEventListener("open", (event) => {
			//	console.log("GAME: Connected to server");
			//	const msg: ClientToServerMessage = {
			//		type: 'search_game',
			//		player_id: 123,
			//		payload: {
			//			options: {
			//				player_count: 1
			//			}
			//		}
			//	};
			//	this._socket.send(JSON.stringify(msg));
			//});

			//this._socket.onmessage = (
			//	event: MessageEvent<ServerToClientMessage>) => this._rcv_msg(event);
			//this._socket.addEventListener("close", () => {
			//	console.log("GAME: Disconnected");
			//});
		} catch (e) {
			console.log("GAME: error: ", e);
		}
	}

	private _rcv_msg(event: MessageEvent<ServerToClientMessage>): undefined {
		console.log("GAME: recieved msg");
		const data = event.data;
		if (data instanceof ArrayBuffer) {
			console.log("GAME: got ArrayBuffer");
			const view = new DataView(data);
			const type: BinType = view.getUint8(0);
			console.log("GAME: BinType: ", type);
		} else if (typeof data === 'string') {
			console.log("GAME: got string: ", data);
			const json: any = JSON.parse(data);
		} else {
			console.log("GAME: Error: unknown message type recieved: ", typeof data);
		}
	}

	private _upate(): undefined {
		//const now = Date.now();
		//if (now < this._next_update_time) {
		//	return ;
		//}
		//this._next_update_time = now + this._update_interval;
		////console.log("GAME: hi");
		////this._sphere.position.x += 1;
		////console.log(this._sphere.position);
		//console.log(this._sphere.position);
		//this._sphere.position.x += 1;
		//console.log(this._sphere.position);
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
