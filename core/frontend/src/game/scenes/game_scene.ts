import * as BABYLON from '@babylonjs/core/Legacy/legacy';
import type {
	ServerToClientMessage,
	GameStartInfo,
	ClientToServerMessage,
	GameOptions
} from '../game_shared/message_types.ts';

import { FireProceduralTexture } from '@babylonjs/procedural-textures/fire';
import * as GUI from '@babylonjs/gui';

// import { Effects, GameState }
// 	from '../game_shared/serialization.ts';
import { Effects, GameState }
	from '../../../../game_shared/serialization.ts';

import { ClientVec2 } from '../objects/ClientVec2.ts';
import { ClientWall } from '../objects/ClientWall.ts';
import { ClientBall } from '../objects/ClientBall.ts';
import { ClientClient } from '../objects/ClientClient.ts';

import { BaseScene } from './base.ts';

let color_idx = 0;

const colors = [
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

function rnd_mat(scene: BABYLON.Scene): BABYLON.StandardMaterial {
	let color: BABYLON.Color3;
	if (color_idx < colors.length) {
		color = colors[color_idx];
	} else {
		color = new BABYLON.Color3(
			Math.random(),
			Math.random(),
			Math.random()
		);
	}
	color_idx++;

	const mat = new BABYLON.StandardMaterial(`mat_${color_idx}`, scene);
	mat.diffuseColor = color;
	return mat;
}

export class GameScene extends BaseScene {
	private _camera: BABYLON.ArcRotateCamera;
	private _light: BABYLON.PointLight;
	private _ground: BABYLON.Mesh;

	private _meshes: Map<number, BABYLON.Mesh> = new Map<number, BABYLON.Mesh>;
	private _score_text: GUI.TextBlock;


	constructor(engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
		super(engine, canvas);
		this._camera = new BABYLON.ArcRotateCamera(
			"Camera",
			-Math.PI / 2,
			Math.PI / 2,
			70,
			BABYLON.Vector3.Zero(),
			this
		);

		this._camera.attachControl(this._canvas, true);

		this._light = new BABYLON.PointLight(
				"pointLight", new BABYLON.Vector3(10, 10, -5), this);

		this._ground = BABYLON.MeshBuilder.CreateGround("ground", {
			width: 50,
			height: 50
			}, this
		);

		this._ground.material = new BABYLON.StandardMaterial("fireMat", this);
		this._ground.material.ambientTexture = new FireProceduralTexture(
			"fireTex",
			256,
			this
		);
		this._ground.rotate(BABYLON.Axis.X, -Math.PI / 2, BABYLON.Space.LOCAL);

		const gui = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this);
		
		this._score_text = new GUI.TextBlock();
		this._score_text.text = "Scores loading...";
		this._score_text.color = "white";
		this._score_text.fontSize = 28;
		this._score_text.top = -320;
		gui.addControl(this._score_text);
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
					`sphere_${b.obj_id}`, {diameter: 0.5}, this);
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
				const default_normal: ClientVec2 = new ClientVec2(0, 1);
				default_normal.unit();
				//todo: rotation
				const normal: ClientVec2 = w.normal;
				normal.unit();
				const dot: number = default_normal.x * normal.x
					+ default_normal.y * normal.y;
				const rot: number = Math.acos(dot);
				//wall.rotation.z = -rot;

				const angle1 = Math.atan2(wall.normal.y, wall.normal.x)
				let angle2 = Math.atan2(w.normal.y, w.normal.x)
				angle2 += Math.PI / 2;

				const new_angle = angle2;// - angle1;

				wall.rotation.z = new_angle;
				wall.rotation.x = 0;
				wall.rotation.y = 0;
				wall.normal = w.normal;

				//this._meshes.set(w.obj_id, wall);
				//console.log(wall);
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
				const default_normal: ClientVec2 = new ClientVec2(0, 1);
				default_normal.unit();
				//todo: rotation
				const normal: ClientVec2 = w.normal;
				normal.unit();
				const dot: number = default_normal.x * normal.x
					+ default_normal.y * normal.y;
				const rot: number = Math.acos(dot);
				wall.rotation.z = -rot;
				wall.normal = normal;
				this._meshes.set(w.obj_id, wall);
			}
		});

	}

	private _apply_player_materials(clients: ClientClient[]) {
		clients.forEach((c: ClientClient) => {
			if (this._meshes.has(c.paddle.obj_id) == undefined
				|| this._meshes.has(c.base.obj_id) == undefined)
			{
				console.log("game error: paddle or base not in meshes");
				process.exit(1);
			}
			const paddle_mesh: BABYLON.Mesh = this._meshes.get(c.paddle.obj_id);
			if (paddle_mesh.material == undefined) {
				paddle_mesh.material = rnd_mat(this);
			}
			const base_mesh: BABYLON.Mesh = this._meshes.get(c.base.obj_id);
			if (base_mesh.material == undefined) {
				base_mesh.material = rnd_mat(this);
			}
		});
	}

	update(game_state: GameState): void {
		//console.log(game_state);
		this._update_balls(game_state.balls);
		this._update_walls(game_state.walls);
		this._apply_player_materials(game_state.clients);

		const score_text: string[] = [];
		game_state.clients.forEach((c: ClientClient) => {
			const color: BABYLON.Color3 = this._meshes.get(c.paddle.obj_id).material.diffuseColor;

			score_text.push(`${c.ingame_id ?? "Player"}: ${c.score ?? 0}`);
		});
		this._score_text.text = score_text.join('\n');
	}
};
