import { Engine, Scene, Mesh, ArcRotateCamera, PointLight, Vector3, HemisphericLight, MeshBuilder, ArcRotateCameraGamepadInput } from "@babylonjs/core";

enum State {
	START = 0,
	GAME = 1,
	END = 2,
}

export class Game {
	private _scene: Scene;
	private _canvas: HTMLCanvasElement;
	private _engine: Engine;
	private _camera: ArcRotateCamera;

	private _sphere: Mesh;

	private _state: number = 0;

	private _next_update_time: number = 0;
	private _update_interval: number = 1000;

	constructor() {
		this._next_update_time = Date.now();

		this._canvas = this._createCanvas();
		document.body.appendChild(this._canvas);
	
		this._engine = new Engine(this._canvas, true);
		this._scene = new Scene(this._engine);


		this._camera = new ArcRotateCamera(
			"Camera",
			Math.PI / 2,
			Math.PI / 2,
			2,
			Vector3.Zero(),
			this._scene
		);
		this._camera.attachControl(this._canvas, true);

		this._sphere = MeshBuilder.CreateSphere("sphere", {diameter: 1}, this._scene);

		const light: PointLight = new PointLight(
			"pointLight", new Vector3(1, 10, 1), this._scene);
	
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

	_upate(): undefined {
		const now = Date.now();
		if (now < this._next_update_time) {
			return ;
		}
		this._next_update_time = now + this._update_interval;
		//console.log("hi");
		//this._sphere.position.x += 1;
		//console.log(this._sphere.position);
		console.log(this._sphere.position);
		this._sphere.position.x += 1;
		console.log(this._sphere.position);
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
