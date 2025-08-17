import * as BABYLON from '@babylonjs/core/Legacy/legacy';

import { ScorePanel } from './score_lines.ts';

import * as GUI from '@babylonjs/gui';
import { GridMaterial } from '@babylonjs/materials/grid';

import type { ClientBall, ClientClient, ClientWall, GameState } from '../objects/index.ts';

import { BaseScene } from './base.ts';

let color_idx = 0;

const rnd_colors = [
	BABYLON.Color3.Red(),
	BABYLON.Color3.Green(),
	BABYLON.Color3.Blue(),
	BABYLON.Color3.Yellow(),
	BABYLON.Color3.Purple(),
	BABYLON.Color3.Teal(),
	BABYLON.Color3.FromHexString("#FF69B4"), // hot pink
	BABYLON.Color3.FromHexString("#FFA500"), // orange
	BABYLON.Color3.FromHexString("#00CED1"), // turquoise
	BABYLON.Color3.FromHexString("#FFD700"), // gold
];

function rnd_col() {
	let color: BABYLON.Color3;
	if (color_idx < rnd_colors.length) {
		color = rnd_colors[color_idx];
	} else {
		color = new BABYLON.Color3(
			Math.random(),
			Math.random(),
			Math.random()
		);
	}
	color_idx++;
	return color;
}

class PlayerColors {
	private scene: BABYLON.Scene;
	public major: BABYLON.StandardMaterial;
	public minor: BABYLON.StandardMaterial;

	constructor(scene: BABYLON.Scene,
		major_color?: BABYLON.Color3,
		minor_color?: BABYLON.Color3,
		name?: string) {
		this.scene = scene;
		if (name == undefined) {
			name = "undefined_color_scheme";
		}
		this.major = new BABYLON.StandardMaterial(`${name}_major`, this.scene);
		if (major_color) {
			this.major.diffuseColor = major_color;
		}
		this.minor = new BABYLON.StandardMaterial(`${name}_minor`, this.scene);
		if (minor_color) {
			this.minor.diffuseColor = minor_color;
		}
	}
};

export class GameScene extends BaseScene {
	private _camera: BABYLON.ArcRotateCamera;
	private _light: BABYLON.HemisphericLight;
	private _background: BABYLON.Mesh;

	private _meshes: Map<number, BABYLON.Mesh> = new Map<number, BABYLON.Mesh>;
	//private _score_text: GUI.TextBlock;

	private _color_schemes: Map<number, PlayerColors> = new Map<number, PlayerColors>;

	public score_panel: ScorePanel;

	constructor(engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
		super(engine, canvas);

		this.clearColor = BABYLON.Color4.FromHexString("#331a21FF");

		this._camera = new BABYLON.ArcRotateCamera(
			"Camera",
			-Math.PI / 2,
			Math.PI / 3,
			35,
			BABYLON.Vector3.Zero(),
			this
		);

		this._camera.attachControl(this._canvas, true);
		this._camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput")

		// Use a HemisphericLight for softer/even lighting
		this._light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this);
		this._light.intensity = 0.8;

		// Keep the sky sphere for a 360 background
		this._background = BABYLON.MeshBuilder.CreateSphere("background", {
			diameter: 1000,
			segments: 64
		}, this);

		const backgroundMaterial = new GridMaterial("backgroundMat", this);
		backgroundMaterial.backFaceCulling = false; // Render the inside of the sphere
		backgroundMaterial.mainColor = BABYLON.Color3.FromHexString("#331a21");
		backgroundMaterial.lineColor = BABYLON.Color3.FromHexString("#8B0000");
		backgroundMaterial.gridRatio = 25; // Adjust grid density
		backgroundMaterial.opacity = 0.98; // Almost opaque
		this._background.material = backgroundMaterial;
		this._background.isPickable = false;

		const gui = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this);
		this.score_panel = new ScorePanel(gui);
	}

	public cleanup() {
		super.cleanup();
		this._meshes.clear();
		this._color_schemes.clear();
		this.score_panel.cleanup();
	}

	loop(): void {
	}

	private _update_balls(balls: ClientBall[]) {
		balls.forEach((b: ClientBall) => {
			if (this._meshes.has(b.obj_id)) {
				const cur: BABYLON.Mesh = this._meshes.get(b.obj_id);
				if (!b.dispose) {
					cur.position.x = b.pos.x;
					cur.position.y = b.pos.y;
				} else {
					cur.dispose(true);
					this._meshes.delete(b.obj_id);
					// todo: clean up object from data structs?
				}
			} else {
				const ball: BABYLON.Mesh = BABYLON.MeshBuilder.CreateSphere(
					`sphere_${b.obj_id}`, { diameter: 0.5 }, this);
				ball.position.x = b.pos.x;
				ball.position.y = b.pos.y;
				this._meshes.set(b.obj_id, ball);
			}
		});
	}

	private _update_walls(walls: ClientWall[]) {
		walls.forEach((w: ClientWall) => {
			if (this._meshes.has(w.obj_id)) {
				const wall: BABYLON.Mesh = this._meshes.get(w.obj_id);
				wall.position.x = w.center.x;
				wall.position.y = w.center.y;

				// Correctly calculate rotation from the wall's normal vector
				const angle = Math.atan2(w.normal.y, w.normal.x) - Math.PI / 2;
				wall.rotation.z = angle;

			} else {
				const wall: BABYLON.Mesh = BABYLON.MeshBuilder.CreateBox(
					`wall_${w.obj_id}`,
					{
						width: w.length,
						height: 0.2,
						depth: 0.5
					},
					this
				);

				wall.position.x = w.center.x;
				wall.position.y = w.center.y;
				wall.position.z = 0;

				const angle = Math.atan2(w.normal.y, w.normal.x) - Math.PI / 2;
				wall.rotation.z = angle;

				this._meshes.set(w.obj_id, wall);
			}
		});

	}

	private _init_color_schemes(clients: ClientClient[]) {
		clients.forEach((c: ClientClient) => {
			if (this._color_schemes.has(c.obj_id)) {
				return;
			}
			this._color_schemes.set(c.obj_id, new PlayerColors(this, rnd_col(), rnd_col(), `player_${c.obj_id}`));
			const color_scheme: PlayerColors = this._color_schemes.get(c.obj_id);
			if (this._meshes.has(c.paddle.obj_id) == undefined
				|| this._meshes.has(c.base.obj_id) == undefined) {
				console.log("game error: paddle or base not in meshes");
				process.exit(1);
			}
			const paddle_mesh: BABYLON.Mesh = this._meshes.get(c.paddle.obj_id);
			paddle_mesh.material = color_scheme.major;
			// const base_mesh: BABYLON.Mesh = this._meshes.get(c.base.obj_id);
			// base_mesh.material = color_scheme.minor;
		});
	}

	update(game_state: GameState): void {
		//console.log("game_timer: ", game_state.game_timer);
		this._update_balls(game_state.balls);
		this._update_walls(game_state.walls);
		this._init_color_schemes(game_state.clients);

		game_state.clients.forEach((c: ClientClient) => {
			const color: BABYLON.Color3 = this._color_schemes.get(c.obj_id).major.diffuseColor;
			this.score_panel.update_score(c.obj_id, c.score, color, undefined);
			this.score_panel.update_timer(game_state.game_timer);
		});

	}
};
